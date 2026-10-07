// How much an observation counts, decided in code and never by the grader (CLAUDE.md
// rule 3). For a faint skill heard through dictation, the recognizer is part of the
// observation: it keeps a small-sound error only with probability DICTATION_KEEP, so the
// errors we can see are the true error rates times that keep rate (ADR 0002).

import { BASE_PARAMS, type BktParams } from "./bkt.js";
import type { Skill } from "./skills.js";

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

/**
 * Tone evidence is weak in both directions (ADR 0006): dictation keeps the words but loses
 * the voice that carries most of politeness, and graders disagree about tone more than
 * about grammar. A polite answer counts 2x toward "knows the right tone", a rude one 3x
 * against, compared with 4.5x and 8x for a clear grammar skill.
 */
export const TONE_PARAMS: BktParams = { ...BASE_PARAMS, slip: 0.2, guess: 0.4 };

/** How many times more likely each outcome is under one hypothesis than the other. */
export function likelihoodRatios(params: BktParams): { correct: number; error: number } {
  return {
    correct: (1 - params.slip) / params.guess, // evidence for known
    error: (1 - params.guess) / params.slip, // evidence for not known
  };
}
