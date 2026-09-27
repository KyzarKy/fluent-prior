// Bayesian Knowledge Tracing for one skill (Corbett & Anderson, 1995). Given P(known) and
// the evidence from one practice opportunity, return P(known) going into the next one.
// See ADR 0002, including its amendment on mixed answers.

export interface BktParams {
  /** P(known) before any evidence. */
  init: number;
  /** P(not known -> known) after each practice. */
  learn: number;
  /** P(wrong | known). */
  slip: number;
  /** P(right | not known). */
  guess: number;
}

export const BASE_PARAMS: BktParams = { init: 0.3, learn: 0.1, slip: 0.1, guess: 0.2 };

/** Counts of correct and incorrect uses of the skill within one practice opportunity. */
export interface Evidence {
  right: number;
  wrong: number;
}

/** Bayes' rule: P(known | this evidence). */
export function posterior(pKnown: number, evidence: Evidence, params: BktParams): number {
  const ifKnown = (1 - params.slip) ** evidence.right * params.slip ** evidence.wrong;
  const ifNotKnown = params.guess ** evidence.right * (1 - params.guess) ** evidence.wrong;
  const numerator = pKnown * ifKnown;
  return numerator / (numerator + (1 - pKnown) * ifNotKnown);
}

/** The full step: condition on the evidence, then allow for learning from the practice. */
export function update(pKnown: number, evidence: Evidence, params: BktParams): number {
  const conditioned = posterior(pKnown, evidence, params);
  return conditioned + (1 - conditioned) * params.learn;
}
