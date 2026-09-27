// The learner model: an append-only log of observations, run through BKT to get P(known)
// for each skill, and the rule for picking the next scenario (ADR 0002).

import { BASE_PARAMS, update } from "./bkt";
import type { GraderOutput } from "./contract";
import { paramsFor, type Source } from "./evidence";
import type { Scenario } from "./scenarios";
import { SKILL_IDS, SKILLS, type SkillId } from "./skills";

export interface Observation {
  skill: SkillId;
  correct: boolean;
  source: Source;
  scenarioId: string;
  /** ISO timestamp. */
  at: string;
}

export type Mastery = Record<SkillId, number>;

/**
 * One observation per skill per answer. A skill with any listed mistake is wrong, even if
 * the grader also listed a correct use of it.
 */
export function toObservations(
  grade: GraderOutput,
  scenarioId: string,
  source: Source,
  at: string,
): Observation[] {
  const correctBySkill = new Map<SkillId, boolean>();
  for (const mistake of grade.mistakes) correctBySkill.set(mistake.skill, false);
  for (const use of grade.correctUses) {
    if (!correctBySkill.has(use.skill)) correctBySkill.set(use.skill, true);
  }
  return [...correctBySkill].map(([skill, correct]) => ({
    skill,
    correct,
    source,
    scenarioId,
    at,
  }));
}

export function mastery(log: readonly Observation[]): Mastery {
  const result = Object.fromEntries(SKILL_IDS.map((id) => [id, BASE_PARAMS.init])) as Mastery;
  for (const observation of log) {
    const params = paramsFor(SKILLS[observation.skill], observation.source);
    result[observation.skill] = update(result[observation.skill], observation.correct, params);
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
