// Browser persistence for v1: the observation log and the learner id live in localStorage
// (ADR 0002). Storage can be blocked or full, so every access is wrapped; without it the
// app still works, it just forgets between visits. Stored data is parsed like any other
// input (CLAUDE.md rule 2).

import { z } from "zod";
import type { Observation, Outcome } from "../core/learner";
import { SKILL_IDS, type SkillId } from "../core/skills";
import { TASK_TYPES, type TaskType } from "../core/tasks";

const LOG_KEY = "fluent-prior:log:v1";
const LEARNER_KEY = "fluent-prior:learner-id";

/** Skills renamed in the catalog, old id to new (ADR 0006). */
const RENAMED_SKILLS: Record<string, SkillId> = { obligation: "modal-verbs" };

const isSkillId = (id: string): id is SkillId => (SKILL_IDS as readonly string[]).includes(id);
const isTaskType = (id: string): id is TaskType => (TASK_TYPES as readonly string[]).includes(id);

// Every format the log has had. Skill and task ids are any string here, not the current
// lists, so a retired id drops its own entries instead of failing the whole log.
const StoredEntry = z.object({
  // Absent before ADR 0006, when every entry was a skill.
  kind: z.enum(["skill", "task", "tone"]).optional(),
  skill: z.string().optional(),
  taskType: z.string().optional(),
  outcome: z.enum(["right", "wrong", "mixed"]).optional(),
  // Before ADR 0002's mixed-answer amendment, entries had `correct` instead of `outcome`.
  correct: z.boolean().optional(),
  source: z.literal("app"),
  scenarioId: z.string(),
  at: z.string(),
});

function toObservation(raw: unknown): Observation | null {
  const parsed = StoredEntry.safeParse(raw);
  if (!parsed.success) return null;
  const entry = parsed.data;
  const legacyOutcome: Outcome | undefined =
    entry.correct === undefined ? undefined : entry.correct ? "right" : "wrong";
  const outcome = entry.outcome ?? legacyOutcome;
  if (!outcome) return null;
  const base = { outcome, source: entry.source, scenarioId: entry.scenarioId, at: entry.at };

  switch (entry.kind ?? "skill") {
    case "skill": {
      const skill = entry.skill === undefined ? "" : (RENAMED_SKILLS[entry.skill] ?? entry.skill);
      return isSkillId(skill) ? { ...base, kind: "skill", skill } : null;
    }
    case "task":
      return entry.taskType && isTaskType(entry.taskType)
        ? { ...base, kind: "task", taskType: entry.taskType }
        : null;
    case "tone":
      return { ...base, kind: "tone" };
  }
}

export function loadLog(): Observation[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.map(toObservation).filter((entry) => entry !== null);
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
