import { describe, expect, it } from "vitest";
import { knowledge } from "./learner.js";
import { dailyKnowledge, localDay } from "./progress.js";
import { sampleLearnerLog } from "./sample-learner.js";
import { findScenario } from "./scenarios.js";

const now = new Date(2026, 9, 22, 9, 30);
const log = sampleLearnerLog(now);
const days = dailyKnowledge(log);

describe("the sample learner", () => {
  it("practiced on several days, in order, ending before now", () => {
    expect(days.length).toBeGreaterThanOrEqual(5);
    const times = log.map((observation) => Date.parse(observation.at));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(Math.max(...times)).toBeLessThan(now.getTime());
    expect(days.at(-1)?.day).toBe(localDay(new Date(2026, 9, 21).toISOString()));
  });

  it("answered real scenarios", () => {
    expect(log.filter((observation) => !findScenario(observation.scenarioId))).toEqual([]);
  });

  it("tells a story: past tense improves, articles stay stuck", () => {
    const first = days[0]?.knowledge;
    const last = knowledge(log);
    expect(last.skills["past-irregular"]).toBeGreaterThan(
      (first?.skills["past-irregular"] ?? 1) + 0.4,
    );
    expect(last.skills.articles).toBeLessThan(0.6);
  });
});
