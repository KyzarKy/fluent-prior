// Bayesian Knowledge Tracing for one skill (Corbett & Anderson, 1995). Given P(known) and
// one observation, return P(known) going into the next practice. See ADR 0002.

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

/** Bayes' rule: P(known | this observation). */
export function posterior(pKnown: number, correct: boolean, params: BktParams): number {
  const ifKnown = correct ? 1 - params.slip : params.slip;
  const ifNotKnown = correct ? params.guess : 1 - params.guess;
  const numerator = pKnown * ifKnown;
  return numerator / (numerator + (1 - pKnown) * ifNotKnown);
}

/** The full step: condition on the observation, then allow for learning from the practice. */
export function update(pKnown: number, correct: boolean, params: BktParams): number {
  const conditioned = posterior(pKnown, correct, params);
  return conditioned + (1 - conditioned) * params.learn;
}
