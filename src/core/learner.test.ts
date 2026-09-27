import { describe, expect, it } from "vitest";
import type { GraderOutput } from "./contract";
import {
  mastery,
  nextScenario,
  type Observation,
  recentScenarioIds,
  toObservations,
} from "./learner";
import { SCENARIOS } from "./scenarios";

const AT = "2026-09-26T12:00:00.000Z";

function observation(overrides: Partial<Observation>): Observation {
  return {
    skill: "articles",
    outcome: "right",
    source: "app",
    scenarioId: "broken-lamp",
    at: AT,
    ...overrides,
  };
}

describe("toObservations", () => {
  it("reports each skill once as right, wrong, or mixed", () => {
    const grade: GraderOutput = {
      mistakes: [
        { skill: "articles", quote: "in room", fix: "in the room" },
        { skill: "past-irregular", quote: "i find", fix: "i found" },
        { skill: "past-irregular", quote: "i see", fix: "i saw" },
      ],
      correctUses: [
        { skill: "past-irregular", quote: "broke" },
        { skill: "plurals", quote: "towels" },
      ],
      taskMet: "yes",
      feedback: "",
      betterVersion: "",
    };
    expect(toObservations(grade, "broken-lamp", "app", AT)).toEqual([
      observation({ skill: "articles", outcome: "wrong" }),
      observation({ skill: "past-irregular", outcome: "mixed" }),
      observation({ skill: "plurals", outcome: "right" }),
    ]);
  });
});

describe("mastery", () => {
  it("moves more for a correct clear skill than a correct faint one", () => {
    const result = mastery([
      observation({ skill: "past-irregular" }),
      observation({ skill: "articles" }),
    ]);
    expect(result["past-irregular"]).toBeGreaterThan(result.articles);
    expect(result.articles).toBeGreaterThan(0.3);
  });

  it("dings a mixed answer less than a wrong one", () => {
    const wrong = mastery([observation({ skill: "past-irregular", outcome: "wrong" })]);
    const mixed = mastery([observation({ skill: "past-irregular", outcome: "mixed" })]);
    expect(mixed["past-irregular"]).toBeGreaterThan(wrong["past-irregular"]);
    expect(mixed["past-irregular"]).toBeLessThan(0.3);
  });

  it("leaves skills with no evidence at the prior", () => {
    expect(mastery([]).register).toBe(0.3);
  });
});

describe("recentScenarioIds", () => {
  it("lists scenarios newest first without repeats", () => {
    const log = [
      observation({ scenarioId: "a" }),
      observation({ scenarioId: "b" }),
      observation({ scenarioId: "b", skill: "plurals" }),
      observation({ scenarioId: "c" }),
    ];
    expect(recentScenarioIds(log, 2)).toEqual(["c", "b"]);
  });
});

describe("nextScenario", () => {
  it("picks the scenario that targets the weakest skills", () => {
    const current = mastery([]);
    current["past-regular"] = 0.05;
    const next = nextScenario(SCENARIOS, current, []);
    expect(next.targetSkills).toContain("past-regular");
  });

  it("skips recent scenarios", () => {
    const current = mastery([]);
    const first = nextScenario(SCENARIOS, current, []);
    expect(nextScenario(SCENARIOS, current, [first.id]).id).not.toBe(first.id);
  });
});
