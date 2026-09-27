// The learner model: an append-only log of observations, run through BKT to get P(known)
// for each skill, and the rule for picking the next scenario (ADR 0002).

import { BASE_PARAMS, type Evidence, update } from "./bkt";
import type { GraderOutput } from "./contract";
import { paramsFor, type Source } from "./evidence";
import type { Scenario } from "./scenarios";
import { SKILL_IDS, SKILLS, type SkillId } from "./skills";

/** At most one correct use and one mistake count per skill per answer (ADR 0002). */
export type Outcome = "right" | "wrong" | "mixed";

export interface Observation {
  skill: SkillId;
  outcome: Outcome;
  source: Source;
  scenarioId: string;
  /** ISO timestamp. */
  at: string;
}

export type Mastery = Record<SkillId, number>;

const EVIDENCE: Record<Outcome, Evidence> = {
  right: { right: 1, wrong: 0 },
  wrong: { right: 0, wrong: 1 },
  mixed: { right: 1, wrong: 1 },
};

/** One observation per skill per answer, from what the grader listed. */
export function toObservations(
  grade: GraderOutput,
  scenarioId: string,
  source: Source,
  at: string,
): Observation[] {
  const wrong = new Set(grade.mistakes.map((mistake) => mistake.skill));
  const right = new Set(grade.correctUses.map((use) => use.skill));
  const skills = [...wrong, ...[...right].filter((skill) => !wrong.has(skill))];
  return skills.map((skill) => ({
    skill,
    outcome: wrong.has(skill) ? (right.has(skill) ? "mixed" : "wrong") : "right",
    source,
    scenarioId,
    at,
  }));
}

export function mastery(log: readonly Observation[]): Mastery {
  const result = Object.fromEntries(SKILL_IDS.map((id) => [id, BASE_PARAMS.init])) as Mastery;
  for (const observation of log) {
    const params = paramsFor(SKILLS[observation.skill], observation.source);
    const evidence = EVIDENCE[observation.outcome];
    result[observation.skill] = update(result[observation.skill], evidence, params);
  }
  return result;
}

export function practiceCounts(log: readonly Observation[]): Record<SkillId, number> {
  const counts = Object.fromEntries(SKILL_IDS.map((id) => [id, 0])) as Record<SkillId, number>;
  for (const observation of log) counts[observation.skill] += 1;
  return counts;
}

/** Scenario ids from most to least recent, without repeats. */
export function recentScenarioIds(log: readonly Observation[], count: number): string[] {
  const recent: string[] = [];
  for (let i = log.length - 1; i >= 0 && recent.length < count; i--) {
    const id = log[i]?.scenarioId;
    if (id && !recent.includes(id)) recent.push(id);
  }
  return recent;
}

/**
 * The scenario whose target skills have the lowest average P(known), skipping recent ones.
 * Ties go to the earlier scenario in the pack, so the choice is predictable.
 */
export function nextScenario(
  scenarios: readonly Scenario[],
  current: Mastery,
  skip: readonly string[],
): Scenario {
  const candidates = scenarios.filter((scenario) => !skip.includes(scenario.id));
  const pool = candidates.length > 0 ? candidates : scenarios;
  let best: Scenario | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const scenario of pool) {
    const total = scenario.targetSkills.reduce((sum, skill) => sum + current[skill], 0);
    const score = total / scenario.targetSkills.length;
    if (score < bestScore) {
      best = scenario;
      bestScore = score;
    }
  }
  if (!best) throw new Error("nextScenario needs at least one scenario");
  return best;
}
