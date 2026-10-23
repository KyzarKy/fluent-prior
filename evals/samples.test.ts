import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../src/core/scenarios";

const key: { scenarioId: string; answer: string }[] = JSON.parse(
  readFileSync("evals/grader-set.json", "utf8"),
).answers;

describe("sample answers", () => {
  it("each come from the answer key, for their own scenario", () => {
    const missing = SCENARIOS.filter(
      (scenario) =>
        !key.some(
          (entry) => entry.scenarioId === scenario.id && entry.answer === scenario.sampleAnswer,
        ),
    ).map((scenario) => scenario.id);
    expect(missing).toEqual([]);
  });
});
