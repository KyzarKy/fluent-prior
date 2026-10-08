import { describe, expect, it } from "vitest";
import { knowledge, type Observation, practiceCounts } from "./learner.js";
import { dailyKnowledge, daysBetween, localDay, trendLine } from "./progress.js";

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

describe("daysBetween", () => {
  it("counts calendar days, even across a daylight-saving change", () => {
    expect(daysBetween("2026-10-01", "2026-10-04")).toBe(3);
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
  });
});

describe("trendLine", () => {
  const log = [
    observation(at(1, 9), "wrong"),
    { ...observation(at(3, 9), "right"), skill: "plurals" as const },
    observation(at(5, 9), "right"),
  ];
  const history = dailyKnowledge(log);

  it("runs from the first day with practice (x = 0) to today (x = 1), by calendar day", () => {
    const line = trendLine(history, (k) => k.skills.articles, "2026-10-11");
    expect(line.map((point) => point.x)).toEqual([0, 0.2, 0.4]);
    expect(line.map((point) => point.p)).toEqual(
      history.map((day) => day.knowledge.skills.articles),
    );
  });

  it("starts each row on its own first day, leaving out the starting guess before it", () => {
    const line = trendLine(history, (k) => k.skills.plurals, "2026-10-11");
    expect(line.map((point) => point.x)).toEqual([0, 0.25]);
  });

  it("puts a row first practiced today at the left edge", () => {
    expect(trendLine(history.slice(0, 1), (k) => k.skills.articles, "2026-10-01")).toEqual([
      { x: 0, p: history[0]?.knowledge.skills.articles },
    ]);
  });

  it("is empty for a row never practiced", () => {
    expect(trendLine(history, (k) => k.tone, "2026-10-11")).toEqual([]);
  });
});
