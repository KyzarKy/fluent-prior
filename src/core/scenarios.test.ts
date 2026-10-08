import { describe, expect, it } from "vitest";
import { ROLE_NAMES, SCENARIOS, type Scenario } from "./scenarios.js";
import { SKILL_IDS } from "./skills.js";
import { TASK_TYPES } from "./tasks.js";

/**
 * With fewer, a learner practicing one skill, role or task type keeps getting the same
 * scenario and starts answering from memory (ROADMAP: scaling the scenario pack).
 */
const MIN_SCENARIOS = 3;

/** The keys that fewer than MIN_SCENARIOS scenarios cover, with their counts. */
function thinSpots(keys: readonly string[], covers: (scenario: Scenario) => string[]) {
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const scenario of SCENARIOS) {
    for (const key of covers(scenario)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].filter(([, count]) => count < MIN_SCENARIOS);
}

describe("the scenario pack", () => {
  it("targets every skill in at least three scenarios", () => {
    expect(thinSpots(SKILL_IDS, (scenario) => scenario.targetSkills)).toEqual([]);
  });

  it("has at least three scenarios for every role", () => {
    expect(thinSpots(Object.keys(ROLE_NAMES), (scenario) => [scenario.role])).toEqual([]);
  });

  it("has at least three scenarios for every task type", () => {
    expect(thinSpots(TASK_TYPES, (scenario) => [scenario.taskType])).toEqual([]);
  });

  it("has unique ids", () => {
    const ids = SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every scenario at least one checklist part", () => {
    expect(SCENARIOS.filter((scenario) => scenario.taskParts.length === 0)).toEqual([]);
  });
});
