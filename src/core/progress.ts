// Progress over time (ROADMAP): what the learner model believed at the end of each day the
// learner practiced. Observations are append-only and timestamped, so any past day comes
// from replaying the log up to it; nothing new is stored.

import {
  type Knowledge,
  knowledge,
  type Observation,
  type PracticeCounts,
  practiceCounts,
} from "./learner";

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
