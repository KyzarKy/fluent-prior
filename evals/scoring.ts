// How a grader's output is compared with Ky's answer key. Pure functions, so the rules are
// testable and old results can be re-scored without calling a model.
//
// Grammar is compared per answer and per skill, the unit the learner model uses (one
// observation per skill per answer). Precision is weighted over recall with F0.5, as in
// grammatical-error-correction research: flagging a correct answer hurts a learner more
// than missing a mistake.

export interface KeyMistake {
  skill: string | null;
  alsoAccept?: string[];
  optional?: boolean;
}

export interface SkillComparison {
  /** Required key skills the grader flagged (or flagged an accepted alternative for). */
  caught: string[];
  /** Required key skills the grader didn't flag. */
  missed: string[];
  /** Skills the grader flagged that the key doesn't list or accept. */
  invented: string[];
  /** Missed skills the grader listed as used correctly: evidence in the wrong direction. */
  falseCredit: string[];
}

/**
 * Required: each non-optional mistake with a catalog skill, grouped by skill with its
 * alternatives. Allowed without penalty: any skill named anywhere in the key's mistakes,
 * including optional ones and the alternatives given for mistakes outside the catalog.
 */
export function compareSkills(
  key: readonly KeyMistake[],
  graderMistakes: readonly string[],
  graderCorrect: readonly string[],
): SkillComparison {
  const groups = new Map<string, Set<string>>();
  const allowed = new Set<string>();
  for (const mistake of key) {
    const names = [mistake.skill, ...(mistake.alsoAccept ?? [])].filter((s) => s !== null);
    for (const name of names) allowed.add(name);
    if (mistake.optional || mistake.skill === null) continue;
    const group = groups.get(mistake.skill) ?? new Set([mistake.skill]);
    for (const name of names) group.add(name);
    groups.set(mistake.skill, group);
  }

  const flagged = new Set(graderMistakes);
  const credited = new Set(graderCorrect);
  const caught: string[] = [];
  const missed: string[] = [];
  for (const [skill, group] of groups) {
    if ([...group].some((name) => flagged.has(name))) caught.push(skill);
    else missed.push(skill);
  }
  return {
    caught,
    missed,
    invented: [...flagged].filter((name) => !allowed.has(name)),
    falseCredit: missed.filter((skill) => credited.has(skill) && !flagged.has(skill)),
  };
}

export function precisionRecallF05(caught: number, missed: number, invented: number) {
  const precision = caught + invented === 0 ? 1 : caught / (caught + invented);
  const recall = caught + missed === 0 ? 1 : caught / (caught + missed);
  const beta2 = 0.25;
  const f05 =
    precision + recall === 0
      ? 0
      : ((1 + beta2) * precision * recall) / (beta2 * precision + recall);
  return { precision, recall, f05 };
}

/** 95% Wilson interval for a proportion: honest about small samples like 60 answers. */
export function wilson(successes: number, total: number): [number, number] {
  if (total === 0) return [0, 1];
  const z = 1.96;
  const p = successes / total;
  const center = (p + (z * z) / (2 * total)) / (1 + (z * z) / total);
  const half =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / (1 + (z * z) / total);
  return [Math.max(0, center - half), Math.min(1, center + half)];
}
