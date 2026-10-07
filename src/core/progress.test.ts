import { describe, expect, it } from "vitest";
import { knowledge, type Observation, practiceCounts } from "./learner";
import { dailyKnowledge, localDay } from "./progress";

/** A timestamp at a local time, so the tests pass in any time zone. */
const at = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();

const observation = (iso: string, outcome: Observation["outcome"]): Observation => ({
  kind: "skill",
  skill: "articles",
  outcome,
  source: "app",
  scenarioId: "broken-lamp",
  at: iso,
});

describe("localDay", () => {
  it("uses the learner's calendar day, even late in the evening", () => {
    expect(localDay(at(1, 23))).toBe("2026-10-01");
  });
});

describe("dailyKnowledge", () => {
  it("is empty before any practice", () => {
    expect(dailyKnowledge([])).toEqual([]);
  });

  it("gives what the model believed at the end of each day with practice", () => {
    const log = [
      observation(at(1, 9), "wrong"),
      observation(at(1, 17), "wrong"),
      observation(at(4, 9), "right"),
    ];
    const firstDay = log.slice(0, 2);
    expect(dailyKnowledge(log)).toEqual([
      { day: "2026-10-01", knowledge: knowledge(firstDay), counts: practiceCounts(firstDay) },
      { day: "2026-10-04", knowledge: knowledge(log), counts: practiceCounts(log) },
    ]);
  });
});
