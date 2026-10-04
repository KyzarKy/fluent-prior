// The answer key, and grading one of its answers: shared by the eval and trial scripts.

import { readFileSync } from "node:fs";
import type { Grade } from "../src/core/contract";
import { findScenario } from "../src/core/scenarios";
import { taskVerdict } from "../src/core/tasks";
import type { Grader } from "../src/server/grader";
import type { KeyMistake } from "./scoring";

export interface KeyEntry {
  id: number | string;
  scenarioId: string;
  answer: string;
  ky?: { taskMet: string; tone: string; toneAlsoAccept?: string[]; mistakes: KeyMistake[] };
  expectMistake?: { skill: string };
}
export type Result = { ok: true; grade: Grade } | { ok: false; reason: string };

export const answers: KeyEntry[] = JSON.parse(
  readFileSync("evals/grader-set.json", "utf8"),
).answers;
export const security: KeyEntry[] = JSON.parse(
  readFileSync("evals/security-set.json", "utf8"),
).answers;

/** Paced for the free tier's 8,000 tokens a minute (ADR 0004): about 2 grades a minute. */
export const PACE_MS = 31_000;
/** A quota wait longer than this is the daily limit: stop and resume another day. */
const MAX_QUOTA_WAIT_SECONDS = 120;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Grades one answer, waiting out the per-minute limit. "daily quota" means stop for today. */
export async function gradeEntry(grade: Grader, entry: KeyEntry): Promise<Result | "daily quota"> {
  const scenario = findScenario(entry.scenarioId);
  if (!scenario) throw new Error(`Unknown scenario ${entry.scenarioId}`);
  const attempt = () =>
    grade(scenario, entry.answer).catch((error: unknown) => ({
      ok: false as const,
      reason: `threw: ${String(error)}`,
      costUsd: 0,
    }));
  let outcome = await attempt();
  while ("retryAfterSeconds" in outcome) {
    if (outcome.retryAfterSeconds > MAX_QUOTA_WAIT_SECONDS) return "daily quota";
    await sleep(outcome.retryAfterSeconds * 1000);
    outcome = await attempt();
  }
  if (!outcome.ok) return { ok: false, reason: outcome.reason };
  const taskMet = taskVerdict(scenario.taskParts.length, outcome.output.taskParts);
  return taskMet
    ? { ok: true, grade: { ...outcome.output, taskMet } }
    : { ok: false, reason: "task parts didn't cover each part once" };
}
