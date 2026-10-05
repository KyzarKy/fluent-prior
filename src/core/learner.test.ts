import { describe, expect, it } from "vitest";
import type { Grade } from "./contract";
import {
  dueRetries,
  knowledge,
  nextScenario,
  type Observation,
  RETRY_GAP,
  recentScenarioIds,
  toneOutcome,
  toObservations,
} from "./learner";
import { findScenario, SCENARIOS, type Scenario } from "./scenarios";

const AT = "2026-09-26T12:00:00.000Z";

function scenario(id: string): Scenario {
  const found = findScenario(id);
  if (!found) throw new Error(`No scenario ${id}`);
  return found;
}

function skillObservation(overrides: Partial<Observation & { kind: "skill" }> = {}): Observation {
  return {
    kind: "skill",
    skill: "articles",
    outcome: "right",
    source: "app",
    scenarioId: "broken-lamp",
    at: AT,
    ...overrides,
  };
}

/** One answered scenario, as the task observation every graded answer adds. */
function answered(scenarioId: string, outcome: Observation["outcome"] = "right"): Observation {
  return {
    kind: "task",
    taskType: scenario(scenarioId).taskType,
    outcome,
    source: "app",
    scenarioId,
    at: AT,
  };
}

const grade: Grade = {
  mistakes: [
    { skill: "articles", quote: "in room", fix: "in the room", why: "" },
    { skill: "past-irregular", quote: "i find", fix: "i found", why: "" },
    { skill: "past-irregular", quote: "i see", fix: "i saw", why: "" },
  ],
  correctUses: [
    { skill: "past-irregular", quote: "broke" },
    { skill: "plurals", quote: "towels" },
  ],
  taskParts: [
    { part: 1, present: true, evidence: "" },
    { part: 2, present: false, evidence: "" },
  ],
  tone: "neutral",
  taskMet: "partly",
  feedback: "",
  betterVersion: "",
};

describe("toObservations", () => {
  const observations = toObservations(grade, scenario("broken-lamp"), "app", AT);

  it("reports each skill once as right, wrong, or mixed", () => {
    expect(observations.filter((o) => o.kind === "skill")).toEqual([
      skillObservation({ skill: "articles", outcome: "wrong" }),
      skillObservation({ skill: "past-irregular", outcome: "mixed" }),
      skillObservation({ skill: "plurals", outcome: "right" }),
    ]);
  });

  it("adds one task observation, with partly as mixed", () => {
    expect(observations.filter((o) => o.kind === "task")).toEqual([
      answered("broken-lamp", "mixed"),
    ]);
  });

  it("adds one tone observation", () => {
    expect(observations.filter((o) => o.kind === "tone")).toHaveLength(1);
  });
});

describe("toneOutcome", () => {
  it("expects polite with guests and accepts neutral with coworkers", () => {
    expect(toneOutcome("polite", "guest")).toBe("right");
    expect(toneOutcome("neutral", "guest")).toBe("mixed");
    expect(toneOutcome("neutral", "coworker")).toBe("right");
    expect(toneOutcome("rude", "coworker")).toBe("wrong");
  });
});

describe("knowledge", () => {
  it("moves more for a correct clear skill than a correct faint one", () => {
    const result = knowledge([
      skillObservation({ skill: "past-irregular" }),
      skillObservation({ skill: "articles" }),
    ]);
    expect(result.skills["past-irregular"]).toBeGreaterThan(result.skills.articles);
    expect(result.skills.articles).toBeGreaterThan(0.3);
  });

  it("dings a mixed answer less than a wrong one", () => {
    const wrong = knowledge([skillObservation({ skill: "past-irregular", outcome: "wrong" })]);
    const mixed = knowledge([skillObservation({ skill: "past-irregular", outcome: "mixed" })]);
    expect(mixed.skills["past-irregular"]).toBeGreaterThan(wrong.skills["past-irregular"]);
    expect(mixed.skills["past-irregular"]).toBeLessThan(0.3);
  });

  it("tracks task types separately from skills", () => {
    const result = knowledge([answered("broken-lamp", "right")]);
    expect(result.tasks["reporting-up"]).toBeCloseTo(0.69, 2);
    expect(result.tasks["guest-problems"]).toBe(0.3);
  });

  it("moves tone less than a clear skill on the same evidence", () => {
    const tone = {
      kind: "tone",
      outcome: "right",
      source: "app",
      scenarioId: "x",
      at: AT,
    } as const;
    const result = knowledge([tone, skillObservation({ skill: "past-irregular" })]);
    expect(result.tone).toBeGreaterThan(0.3);
    expect(result.tone).toBeLessThan(result.skills["past-irregular"]);
  });

  it("leaves everything with no evidence at the prior", () => {
    const result = knowledge([]);
    expect(result.skills.plurals).toBe(0.3);
    expect(result.tasks.requests).toBe(0.3);
    expect(result.tone).toBe(0.3);
  });
});

describe("recentScenarioIds", () => {
  it("lists answered scenarios newest first without repeats", () => {
    const log = [answered("early-arrival"), answered("broken-lamp"), answered("slow-food")];
    expect(recentScenarioIds(log, 2)).toEqual(["slow-food", "broken-lamp"]);
  });
});

describe("dueRetries", () => {
  const others = ["broken-lamp", "slow-food", "todays-special"].map((id) => answered(id));

  it(`brings an incomplete scenario back after ${RETRY_GAP} other answers`, () => {
    const incomplete = answered("early-arrival", "mixed");
    expect(dueRetries([incomplete, ...others.slice(0, RETRY_GAP - 1)])).toEqual([]);
    expect(dueRetries([incomplete, ...others])).toEqual(["early-arrival"]);
  });

  it("stops once the latest answer to it was complete", () => {
    const log = [answered("early-arrival", "wrong"), ...others, answered("early-arrival")];
    expect(dueRetries(log)).toEqual([]);
  });
});

describe("nextScenario", () => {
  it("picks the scenario that targets the weakest skills", () => {
    const current = knowledge([]);
    current.skills["past-regular"] = 0.05;
    expect(nextScenario(SCENARIOS, current, []).targetSkills).toContain("past-regular");
  });

  it("counts the weakest task type too", () => {
    const current = knowledge([]);
    current.tasks["briefing-coworkers"] = 0.01;
    expect(nextScenario(SCENARIOS, current, []).taskType).toBe("briefing-coworkers");
  });

  it("puts a due retry first", () => {
    const current = knowledge([]);
    current.skills["past-regular"] = 0.05;
    expect(nextScenario(SCENARIOS, current, [], ["noisy-room"]).id).toBe("noisy-room");
  });

  it("skips recent scenarios", () => {
    const current = knowledge([]);
    const first = nextScenario(SCENARIOS, current, []);
    expect(nextScenario(SCENARIOS, current, [first.id]).id).not.toBe(first.id);
  });
});
