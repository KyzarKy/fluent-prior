// Progress over time (ROADMAP): what the learner model believed at the end of each day the
// learner practiced. Observations are append-only and timestamped, so any past day comes
// from replaying the log up to it; nothing new is stored.

import {
  type Knowledge,
  knowledge,
  type Observation,
  type PracticeCounts,
  practiceCounts,
} from "./learner.js";

export interface DayKnowledge {
  /** The learner's local calendar day, YYYY-MM-DD. */
  day: string;
  knowledge: Knowledge;
  /**
   * Answers so far. A chart starts each line on its first day with practice: before that,
   * P(known) is the model's starting guess, and drawing it would show progress no answer
   * measured.
   */
  counts: PracticeCounts;
}

/** Local, not UTC: an evening answer in Seattle is already tomorrow in UTC. */
export function localDay(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** One entry per day with practice, oldest first. Days without practice are left out. */
export function dailyKnowledge(log: readonly Observation[]): DayKnowledge[] {
  const days: DayKnowledge[] = [];
  log.forEach((observation, index) => {
    const day = localDay(observation.at);
    const next = log[index + 1];
    if (next && localDay(next.at) === day) return;
    // ponytail: replays from the start for each day, O(days × log). Fold once if logs
    // grow to many thousands of observations.
    const sofar = log.slice(0, index + 1);
    days.push({ day, knowledge: knowledge(sofar), counts: practiceCounts(sofar) });
  });
  return days;
}

/** Whole calendar days from one YYYY-MM-DD day to another. Rounded for daylight saving. */
export function daysBetween(from: string, to: string): number {
  // Without a time zone offset, both dates are read as local midnight.
  return Math.round((Date.parse(`${to}T00:00`) - Date.parse(`${from}T00:00`)) / 86_400_000);
}

export interface TrendPoint {
  /** 0 is the row's first day with practice, 1 is today. */
  x: number;
  p: number;
}

/**
 * One row of the progress chart, from its first day with practice to today. Days before it
 * are left out: P(known) there is the model's starting guess, not something an answer
 * measured. `pick` reads the row from Knowledge and from PracticeCounts, which share a shape.
 */
export function trendLine(
  history: readonly DayKnowledge[],
  pick: (k: Knowledge) => number,
  today: string,
): TrendPoint[] {
  const practiced = history.filter((day) => pick(day.counts) > 0);
  const first = practiced[0];
  if (!first) return [];
  const span = daysBetween(first.day, today);
  return practiced.map((day) => ({
    x: span === 0 ? 0 : daysBetween(first.day, day.day) / span,
    p: pick(day.knowledge),
  }));
}
