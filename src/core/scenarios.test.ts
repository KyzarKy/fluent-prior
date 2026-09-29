import { describe, expect, it } from "vitest";
import { SCENARIOS } from "./scenarios";
import { SKILL_IDS } from "./skills";

describe("the scenario pack", () => {
  it("targets every skill at least once, so the learner model can choose to practice it", () => {
    const targeted = new Set(SCENARIOS.flatMap((scenario) => scenario.targetSkills));
    expect(SKILL_IDS.filter((id) => !targeted.has(id))).toEqual([]);
  });

  it("has unique ids", () => {
    const ids = SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
