import Groq from "groq-sdk";
import { describe, expect, it } from "vitest";
import type { GraderOutput } from "../core/contract.js";
import { findScenario } from "../core/scenarios.js";
import { createGroqGrader } from "./groq-grader.js";

const output: GraderOutput = {
  mistakes: [],
  correctUses: [],
  taskParts: [{ part: 1, present: true, evidence: "where do these go" }],
  tone: "neutral",
  feedback: "Clear question.",
  betterVersion: "Where should these go?",
};

const reply = {
  choices: [{ finish_reason: "stop", message: { content: JSON.stringify(output) } }],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    prompt_tokens_details: { cached_tokens: 80 },
    completion_tokens_details: { reasoning_tokens: 30 },
  },
};

// The body Groq sent for #41 in the first eval.
const jsonValidateFailed = new Groq.BadRequestError(
  400,
  { error: { code: "json_validate_failed", message: "Failed to validate JSON." } },
  undefined,
  new Headers(),
);

/** Fails the first call with `error`, then answers. Records each call's reasoning effort. */
function clientFailingFirst(error: unknown) {
  const efforts: unknown[] = [];
  const create = async (params: { reasoning_effort?: unknown }) => {
    efforts.push(params.reasoning_effort);
    if (efforts.length === 1) throw error;
    return reply;
  };
  return {
    client: { chat: { completions: { create } } } as unknown as Groq,
    calls: () => efforts.length,
    efforts,
  };
}

describe("createGroqGrader", () => {
  const scenario = findScenario("delivery-question");
  if (!scenario) throw new Error("missing scenario");

  it("retries once, at low reasoning effort, when Groq rejects the reply's JSON", async () => {
    const { client, calls, efforts } = clientFailingFirst(jsonValidateFailed);
    const outcome = await createGroqGrader(client)(scenario, "where do these go");
    expect(outcome).toMatchObject({
      ok: true,
      output,
      tokens: { input: 100, cachedInput: 80, output: 50, reasoning: 30 },
    });
    expect(calls()).toBe(2);
    expect(efforts).toEqual(["medium", "low"]);
  });

  it("doesn't retry other errors", async () => {
    const { client, calls } = clientFailingFirst(new Error("network down"));
    await expect(createGroqGrader(client)(scenario, "where do these go")).rejects.toThrow();
    expect(calls()).toBe(1);
  });
});
