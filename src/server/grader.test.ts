import { describe, expect, it } from "vitest";
import { findScenario } from "../core/scenarios.js";
import { type GradeOutcome, type Grader, withBackup } from "./grader.js";

const quota = (retryAfterSeconds: number): GradeOutcome => ({
  ok: false,
  reason: "quota",
  costUsd: 0,
  retryAfterSeconds,
});
const failed: GradeOutcome = { ok: false, reason: "reply was not JSON", costUsd: 0 };

/** A grader that always returns `outcome`, and counts its calls. */
function grader(outcome: GradeOutcome) {
  const calls = { count: 0 };
  const grade: Grader = async () => {
    calls.count++;
    return outcome;
  };
  return { grade, calls };
}

describe("withBackup", () => {
  const scenario = findScenario("delivery-question");
  if (!scenario) throw new Error("no scenario");

  it("grades with the backup only when the primary is out of quota", async () => {
    const primary = grader(quota(900));
    const backup = grader(failed);
    expect(await withBackup(primary.grade, backup.grade)(scenario, "hi")).toBe(failed);
    expect(backup.calls.count).toBe(1);
  });

  it("doesn't call the backup when the primary fails another way", async () => {
    const backup = grader(quota(60));
    expect(await withBackup(grader(failed).grade, backup.grade)(scenario, "hi")).toBe(failed);
    expect(backup.calls.count).toBe(0);
  });

  it("waits for whichever quota frees up first when both are out", async () => {
    const outcome = await withBackup(grader(quota(900)).grade, grader(quota(60)).grade)(
      scenario,
      "hi",
    );
    expect(outcome).toMatchObject({ reason: "quota", retryAfterSeconds: 60 });
  });
});
