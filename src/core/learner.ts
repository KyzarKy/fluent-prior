// The learner model: an append-only log of observations, run through BKT to get P(known)
// for each grammar skill, each task type, and tone (ADR 0002, ADR 0006), plus the rules for
// picking the next scenario, including bringing incomplete ones back.

import { BASE_PARAMS, type Evidence, update } from "./bkt.js";
import type { Grade, TaskMet, Tone } from "./contract.js";
import { paramsFor, type Source, TONE_PARAMS } from "./evidence.js";
import type { Scenario } from "./scenarios.js";
import { SKILL_IDS, SKILLS, type SkillId } from "./skills.js";
import { type Audience, TASK_TYPES, type TaskType } from "./tasks.js";

/** At most one correct use and one mistake count per skill per answer (ADR 0002). */
export type Outcome = "right" | "wrong" | "mixed";

interface ObservationBase {
  outcome: Outcome;
  source: Source;
  scenarioId: string;
  /** ISO timestamp. */
  at: string;
}

/** Every graded answer adds its skill observations, then exactly one task and one tone. */
export type Observation =
  | (ObservationBase & { kind: "skill"; skill: SkillId })
  | (ObservationBase & { kind: "task"; taskType: TaskType })
  | (ObservationBase & { kind: "tone" });

export interface Knowledge {
  skills: Record<SkillId, number>;
  tasks: Record<TaskType, number>;
  tone: number;
}

/** Answers since an incomplete one before its scenario comes back (ROADMAP: retry queue). */
export const RETRY_GAP = 3;

const EVIDENCE: Record<Outcome, Evidence> = {
  right: { right: 1, wrong: 0 },
  wrong: { right: 0, wrong: 1 },
  mixed: { right: 1, wrong: 1 },
};

const TASK_OUTCOME: Record<TaskMet, Outcome> = { yes: "right", partly: "mixed", no: "wrong" };

/**
 * Polite is the target with a guest; neutral is fine with a coworker. Neutral with a guest
 * falls short without being rude, so it counts as mixed (ADR 0006).
 */
export function toneOutcome(tone: Tone, audience: Audience): Outcome {
  if (tone === "rude") return "wrong";
  if (tone === "neutral" && audience === "guest") return "mixed";
  return "right";
}

export function toObservations(
  grade: Grade,
  scenario: Scenario,
  source: Source,
  at: string,
): Observation[] {
  const base = { source, scenarioId: scenario.id, at };
  const wrong = new Set(grade.mistakes.map((mistake) => mistake.skill));
  const right = new Set(grade.correctUses.map((use) => use.skill));
  const skills = [...wrong, ...[...right].filter((skill) => !wrong.has(skill))];
  const skillObservations: Observation[] = skills.map((skill) => ({
    ...base,
    kind: "skill",
    skill,
    outcome: wrong.has(skill) ? (right.has(skill) ? "mixed" : "wrong") : "right",
  }));
  return [
    ...skillObservations,
    { ...base, kind: "task", taskType: scenario.taskType, outcome: TASK_OUTCOME[grade.taskMet] },
    { ...base, kind: "tone", outcome: toneOutcome(grade.tone, scenario.audience) },
  ];
}

function prior<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, BASE_PARAMS.init])) as Record<K, number>;
}

export function knowledge(log: readonly Observation[]): Knowledge {
  const result: Knowledge = {
    skills: prior(SKILL_IDS),
    tasks: prior(TASK_TYPES),
    tone: BASE_PARAMS.init,
  };
  for (const observation of log) {
    const evidence = EVIDENCE[observation.outcome];
    switch (observation.kind) {
      case "skill": {
        const params = paramsFor(SKILLS[observation.skill], observation.source);
        result.skills[observation.skill] = update(
          result.skills[observation.skill],
          evidence,
          params,
        );
        break;
      }
      case "task":
        // A missing part is plain in text, so task evidence gets no dictation adjustment.
        result.tasks[observation.taskType] = update(
          result.tasks[observation.taskType],
          evidence,
          BASE_PARAMS,
        );
        break;
      case "tone":
        result.tone = update(result.tone, evidence, TONE_PARAMS);
        break;
    }
  }
  return result;
}

export interface PracticeCounts {
  skills: Record<SkillId, number>;
  tasks: Record<TaskType, number>;
  tone: number;
}

export function practiceCounts(log: readonly Observation[]): PracticeCounts {
  const counts: PracticeCounts = {
    skills: Object.fromEntries(SKILL_IDS.map((id) => [id, 0])) as Record<SkillId, number>,
    tasks: Object.fromEntries(TASK_TYPES.map((type) => [type, 0])) as Record<TaskType, number>,
    tone: 0,
  };
  for (const observation of log) {
    if (observation.kind === "skill") counts.skills[observation.skill] += 1;
    else if (observation.kind === "task") counts.tasks[observation.taskType] += 1;
    else counts.tone += 1;
  }
  return counts;
}

/** Each graded answer has exactly one task observation, so these are the answers in order. */
function answers(log: readonly Observation[]) {
  return log.filter((observation) => observation.kind === "task");
}

/** Scenario ids from most to least recently answered, without repeats. */
export function recentScenarioIds(log: readonly Observation[], count: number): string[] {
  const recent: string[] = [];
  const answered = answers(log);
  for (let i = answered.length - 1; i >= 0 && recent.length < count; i--) {
    const id = answered[i]?.scenarioId;
    if (id && !recent.includes(id)) recent.push(id);
  }
  return recent;
}

/**
 * Scenarios whose latest answer wasn't complete and that are due again: at least RETRY_GAP
 * other answers have come since. Oldest first.
 */
export function dueRetries(log: readonly Observation[]): string[] {
  const answered = answers(log);
  const latest = new Map<string, { index: number; outcome: Outcome }>();
  answered.forEach((answer, index) => {
    latest.set(answer.scenarioId, { index, outcome: answer.outcome });
  });
  return [...latest]
    .filter(([, last]) => last.outcome !== "right" && answered.length - 1 - last.index >= RETRY_GAP)
    .sort(([, a], [, b]) => a.index - b.index)
    .map(([scenarioId]) => scenarioId);
}

/**
 * A due retry comes first. Otherwise, the scenario whose target skills and task type have
 * the lowest average P(known), skipping recent ones. Ties go to the earlier scenario in the
 * pack, so the choice is predictable.
 */
export function nextScenario(
  scenarios: readonly Scenario[],
  current: Knowledge,
  skip: readonly string[],
  retries: readonly string[] = [],
): Scenario {
  const candidates = scenarios.filter((scenario) => !skip.includes(scenario.id));
  const pool = candidates.length > 0 ? candidates : scenarios;

  const retry = retries
    .map((id) => pool.find((scenario) => scenario.id === id))
    .find((scenario) => scenario !== undefined);
  if (retry) return retry;

  let best: Scenario | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const scenario of pool) {
    const estimates = [
      ...scenario.targetSkills.map((skill) => current.skills[skill]),
      current.tasks[scenario.taskType],
    ];
    const score = estimates.reduce((sum, p) => sum + p, 0) / estimates.length;
    if (score < bestScore) {
      best = scenario;
      bestScore = score;
    }
  }
  if (!best) throw new Error("nextScenario needs at least one scenario");
  return best;
}
