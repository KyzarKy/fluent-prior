// How much an observation counts, decided in code and never by the grader (CLAUDE.md
// rule 3). For a faint skill heard through dictation, the recognizer is part of the
// observation: it keeps a small-sound error only with probability DICTATION_KEEP, so the
// errors we can see are the true error rates times that keep rate (ADR 0002).

import { BASE_PARAMS, type BktParams } from "./bkt";
import type { Skill } from "./skills";

/**
 * Where an observation came from. v1 has one source; "typed-drill" and "tutor" join it
 * with the tutor features (ROADMAP).
 */
export type Source = "app";

/** P(dictation keeps a small-sound error). A starting guess; ROADMAP v1.1 measures it. */
export const DICTATION_KEEP = 0.5;

export function paramsFor(skill: Skill, source: Source, base: BktParams = BASE_PARAMS): BktParams {
  const keep = source === "app" && skill.audibility === "faint" ? DICTATION_KEEP : 1;
  return {
    ...base,
    slip: base.slip * keep,
    guess: 1 - (1 - base.guess) * keep,
  };
}

/** How many times more likely each outcome is under one hypothesis than the other. */
export function likelihoodRatios(params: BktParams): { correct: number; error: number } {
  return {
    correct: (1 - params.slip) / params.guess, // evidence for known
    error: (1 - params.guess) / params.slip, // evidence for not known
  };
}
