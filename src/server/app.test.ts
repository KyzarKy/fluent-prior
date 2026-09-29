import { describe, expect, it } from "vitest";
import type { GraderOutput } from "../core/contract";
import { createApp } from "./app";
import { createMemoryStore } from "./cap-store";
import type { Grader } from "./grader";

// early-arrival has two checklist parts; this answer does the first only.
const output: GraderOutput = {
  mistakes: [],
  correctUses: [],
  taskParts: [
    { part: 1, present: true, evidence: "your room is not ready" },
    { part: 2, present: false, evidence: "" },
  ],
  tone: "polite",
  feedback: "Clear and polite.",
  betterVersion: "I'm sorry, your room isn't ready yet.",
};

const request = {
  scenarioId: "early-arrival",
  answer: "Sorry, your room is not ready.",
  learnerId: "0b6f3a3e-5b8f-4c7e-9a8e-1f2d3c4b5a69",
  sessionId: "7c1e2d3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f",
};

function post(app: ReturnType<typeof createApp>, body: unknown) {
  return app.request("/api/grade", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/grade", () => {
  it("rejects a malformed request without calling the grader", async () => {
    let calls = 0;
    const grade: Grader = async () => {
      calls++;
      return { ok: true, output, costUsd: 0.01 };
    };
    const app = createApp({ grade, store: createMemoryStore(), ipHashSalt: "t" });
    const response = await post(app, { ...request, answer: "" });
    expect(response.status).toBe(400);
    expect(calls).toBe(0);
  });

  it("grades a valid answer and computes taskMet from the checklist", async () => {
    const grade: Grader = async () => ({ ok: true, output, costUsd: 0.01 });
    const app = createApp({ grade, store: createMemoryStore(), ipHashSalt: "t" });
    const response = await post(app, request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      grade: { ...output, taskMet: "partly" },
      costUsd: 0.01,
    });
  });

  it("refuses a checklist report that skips a part", async () => {
    const skipped = { ...output, taskParts: [{ part: 1, present: true, evidence: "" }] };
    const grade: Grader = async () => ({ ok: true, output: skipped, costUsd: 0.01 });
    const app = createApp({ grade, store: createMemoryStore(), ipHashSalt: "t" });
    expect((await post(app, request)).status).toBe(502);
  });

  it("returns 429 naming the layer once the learner's minute is used up", async () => {
    const grade: Grader = async () => ({ ok: true, output, costUsd: 0.001 });
    const app = createApp({ grade, store: createMemoryStore(), ipHashSalt: "t" });
    for (let i = 0; i < 5; i++) await post(app, request);
    const response = await post(app, request);
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: "cap", layer: "learner" });
  });

  it("records the cost of an unusable reply, since it was paid for", async () => {
    const grade: Grader = async () => ({ ok: false, reason: "bad json", costUsd: 1 });
    const app = createApp({ grade, store: createMemoryStore(), ipHashSalt: "t" });
    expect((await post(app, request)).status).toBe(502);
    // $1 is over the app's $0.25-a-minute cap, so the next request is refused before grading.
    const response = await post(app, request);
    expect(await response.json()).toMatchObject({ error: "cap", layer: "app" });
  });

  it("shows the free grader's quota as the app limit, with its reset time", async () => {
    const grade: Grader = async () => ({
      ok: false,
      reason: "quota",
      costUsd: 0,
      retryAfterSeconds: 120,
    });
    const app = createApp({ grade, store: createMemoryStore(), ipHashSalt: "t" });
    const response = await post(app, request);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "cap", layer: "app", resetsInSeconds: 120 });
  });
});
