// Calls the grading API and turns every response into one of three outcomes the UI knows
// how to show. Responses are parsed, never cast (CLAUDE.md rule 2).

import { CapExceeded, type GradeRequest, GradeResponse, type GraderOutput } from "../core/contract";

export type GradeResult =
  | { kind: "graded"; grade: GraderOutput }
  | { kind: "capped"; capped: CapExceeded }
  | { kind: "failed" };

export async function requestGrade(body: GradeRequest): Promise<GradeResult> {
  let response: Response;
  try {
    response = await fetch("/api/grade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: "failed" };
  }
  const json: unknown = await response.json().catch(() => null);

  const graded = GradeResponse.safeParse(json);
  if (response.ok && graded.success) return { kind: "graded", grade: graded.data.grade };

  const capped = CapExceeded.safeParse(json);
  if (response.status === 429 && capped.success) return { kind: "capped", capped: capped.data };

  return { kind: "failed" };
}
