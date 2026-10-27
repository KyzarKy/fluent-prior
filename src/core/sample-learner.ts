// A made-up learner's two weeks, so a first-time visitor can see what progress looks like
// (portfolio plan, stage 2). Dated relative to `now`, so it always ends yesterday. The app
// shows it in place of the visitor's own progress and never saves it or mixes it in.

import type { Observation, Outcome } from "./learner.js";
import { SCENARIOS } from "./scenarios.js";
import type { SkillId } from "./skills.js";

/** Days before `now` with practice, oldest first. Gaps are days off. */
const PRACTICE_DAYS = [13, 12, 10, 8, 7, 5, 3, 1];
const ANSWERS_PER_DAY = 3;

/** How each skill goes for this learner. Anything not listed improves steadily. */
const STORY: Partial<Record<SkillId, "strong" | "stuck">> = {
  "question-forms": "strong",
  "be-verbs": "strong",
  articles: "stuck",
  plurals: "stuck",
};

/** `t` runs from 0 (a skill's first use) to 1 (its last): wrong early, mixed, then right. */
function improving(t: number): Outcome {
  if (t < 0.35) return "wrong";
  return t < 0.65 ? "mixed" : "right";
}

export function sampleLearnerLog(now: Date): Observation[] {
  const total = PRACTICE_DAYS.length * ANSWERS_PER_DAY;
  const answers = Array.from(
    { length: total },
    (_, index) => SCENARIOS[(index * 7) % SCENARIOS.length],
  );
  // Each skill improves over its own uses, so one practiced only late still shows a change.
  const uses = new Map<SkillId, number>();
  for (const scenario of answers) {
    for (const skill of scenario?.targetSkills ?? []) uses.set(skill, (uses.get(skill) ?? 0) + 1);
  }
  const seen = new Map<SkillId, number>();

  const log: Observation[] = [];
  answers.forEach((scenario, index) => {
    if (!scenario) return;
    const daysAgo = PRACTICE_DAYS[Math.floor(index / ANSWERS_PER_DAY)] ?? 0;
    const t = index / (total - 1);
    // An evening session, a few minutes per answer.
    const at = new Date(now);
    at.setDate(at.getDate() - daysAgo);
    at.setHours(19, (index % ANSWERS_PER_DAY) * 6, 0, 0);
    const base = { source: "app" as const, scenarioId: scenario.id, at: at.toISOString() };

    for (const skill of scenario.targetSkills) {
      const k = seen.get(skill) ?? 0;
      seen.set(skill, k + 1);
      const story = STORY[skill];
      const outcome: Outcome =
        story === "strong"
          ? "right"
          : story === "stuck"
            ? k % 2
              ? "right"
              : "wrong"
            : improving(k / Math.max((uses.get(skill) ?? 1) - 1, 1));
      log.push({ ...base, kind: "skill", skill, outcome });
    }
    log.push({
      ...base,
      kind: "task",
      taskType: scenario.taskType,
      outcome: t < 0.4 ? "mixed" : "right",
    });
    log.push({ ...base, kind: "tone", outcome: t < 0.3 ? "mixed" : "right" });
  });
  return log;
}
