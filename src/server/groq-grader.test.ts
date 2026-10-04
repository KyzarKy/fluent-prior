import Groq from "groq-sdk";
import { describe, expect, it } from "vitest";
import type { GraderOutput } from "../core/contract";
import { findScenario } from "../core/scenarios";
import { createGroqGrader } from "./groq-grader";

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
  usage: { prompt_tokens: 100, completion_tokens: 50 },
};

// The body Groq sent for #41 in the first eval.
const jsonValidateFailed = new Groq.BadRequestError(
  400,
  { error: { code: "json_validate_failed", message: "Failed to validate JSON." } },
  undefined,
  new Headers(),
);

function clientFailingFirst(error: unknown) {
  let calls = 0;
  const create = async () => {
    calls++;
    if (calls === 1) throw error;
    return reply;
  };
  return { client: { chat: { completions: { create } } } as unknown as Groq, calls: () => calls };
}

describe("createGroqGrader", () => {
  const scenario = findScenario("delivery-question");
  if (!scenario) throw new Error("missing scenario");

  it("retries once when Groq rejects the reply's JSON", async () => {
    const { client, calls } = clientFailingFirst(jsonValidateFailed);
    const outcome = await createGroqGrader(client)(scenario, "where do these go");
    expect(outcome).toMatchObject({ ok: true, output });
    expect(calls()).toBe(2);
  });

  it("doesn't retry other errors", async () => {
    const { client, calls } = clientFailingFirst(new Error("network down"));
    await expect(createGroqGrader(client)(scenario, "where do these go")).rejects.toThrow();
    expect(calls()).toBe(1);
  });
});
