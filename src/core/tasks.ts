// Task completion (ADR 0006): the task types scenarios are grouped by, who the learner is
// talking to, and the rule that turns a checklist into a verdict. The grader only reports
// which parts are present; the verdict is computed here, where it can be tested.

import type { TaskMet } from "./contract.js";

export const TASK_TYPES = [
  "guest-problems",
  "guest-information",
  "requests",
  "reporting-up",
  "briefing-coworkers",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_TYPE_NAMES: Record<TaskType, string> = {
  "guest-problems": "Handling guest problems",
  "guest-information": "Giving guests information",
  requests: "Asking for things",
  "reporting-up": "Reporting to a supervisor",
  "briefing-coworkers": "Briefing coworkers",
};

/** Who the learner is talking to. Sets what tone is expected (ADR 0006). */
export type Audience = "guest" | "coworker";

export interface PartReport {
  /** 1-based, matching the numbered parts the grader was shown. */
  part: number;
  present: boolean;
}

/**
 * Every part present is yes, some is partly, none is no. Returns null when the report
 * doesn't cover each part exactly once: a verdict built on a partial report would be a guess.
 */
export function taskVerdict(partCount: number, reports: readonly PartReport[]): TaskMet | null {
  const presentByPart = new Map<number, boolean>();
  for (const report of reports) {
    const outOfRange = report.part < 1 || report.part > partCount;
    if (outOfRange || presentByPart.has(report.part)) return null;
    presentByPart.set(report.part, report.present);
  }
  if (presentByPart.size !== partCount) return null;
  const present = [...presentByPart.values()].filter(Boolean).length;
  if (present === partCount) return "yes";
  return present === 0 ? "no" : "partly";
}
