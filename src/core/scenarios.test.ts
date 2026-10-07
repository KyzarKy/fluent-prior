import { describe, expect, it } from "vitest";
import { SCENARIOS } from "./scenarios.js";
import { SKILL_IDS } from "./skills.js";
import { TASK_TYPES } from "./tasks.js";

describe("the scenario pack", () => {
  it("targets every skill at least once, so the learner model can choose to practice it", () => {
    const targeted = new Set(SCENARIOS.flatMap((scenario) => scenario.targetSkills));
    expect(SKILL_IDS.filter((id) => !targeted.has(id))).toEqual([]);
  });

  it("has unique ids", () => {
    const ids = SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every scenario at least one checklist part", () => {
    expect(SCENARIOS.filter((scenario) => scenario.taskParts.length === 0)).toEqual([]);
  });

  it("uses every task type, so each task-type track can be practiced", () => {
    const used = new Set(SCENARIOS.map((scenario) => scenario.taskType));
    expect(TASK_TYPES.filter((type) => !used.has(type))).toEqual([]);
  });
});
