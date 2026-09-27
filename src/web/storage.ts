// Browser persistence for v1: the observation log and the learner id live in localStorage
// (ADR 0002). Storage can be blocked or full, so every access is wrapped; without it the
// app still works, it just forgets between visits. Stored data is parsed like any other
// input (CLAUDE.md rule 2).

import { z } from "zod";
import type { Observation } from "../core/learner";
import { SKILL_IDS } from "../core/skills";

const LOG_KEY = "fluent-prior:log:v1";
const LEARNER_KEY = "fluent-prior:learner-id";

const StoredObservation = z.object({
  skill: z.enum(SKILL_IDS),
  outcome: z.enum(["right", "wrong", "mixed"]),
  source: z.literal("app"),
  scenarioId: z.string(),
  at: z.string(),
});

/** Before ADR 0002's mixed-answer amendment, entries had `correct` instead of `outcome`. */
const LegacyObservation = StoredObservation.omit({ outcome: true })
  .extend({ correct: z.boolean() })
  .transform(({ correct, ...rest }) => ({
    ...rest,
    outcome: correct ? ("right" as const) : ("wrong" as const),
  }));

const StoredLog = z.array(z.union([StoredObservation, LegacyObservation])) satisfies z.ZodType<
  Observation[],
  unknown
>;

export function loadLog(): Observation[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = StoredLog.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveLog(log: readonly Observation[]): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    // Keep going in memory.
  }
}

/** A random id for spend caps (ADR 0003). Not an account; clearing storage makes a new one. */
export function learnerId(): string {
  try {
    const existing = localStorage.getItem(LEARNER_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(LEARNER_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}
