// The grade, in the three tracks of ADR 0006: whether the answer did every part of the
// task (and which parts are missing), how it may sound, and the grammar it used. Plus one
// piece of feedback and a more natural version.

import type { Grade, Tone } from "../../core/contract";
import type { Scenario } from "../../core/scenarios";
import { SKILLS } from "../../core/skills";
import type { Audience } from "../../core/tasks";

const TASK_LABEL = {
  yes: { text: "Did every part", className: "bg-success/15 text-success" },
  partly: { text: "Did part of it", className: "bg-warning/15 text-warning" },
  no: { text: "Missed the task", className: "bg-destructive/15 text-destructive" },
} as const;

/** Describes the effect, not the learner: whether they meant it can't be known (ADR 0006). */
function toneMessage(tone: Tone, audience: Audience): string {
  const listener = audience === "guest" ? "a guest" : "a coworker";
  if (tone === "rude") return `May come across as rude to ${listener}.`;
  if (tone === "polite") return "Sounds polite.";
  return audience === "guest"
    ? "Sounds neutral. With guests, a warmer word or two helps: please, of course, I'm sorry."
    : "Sounds fine for a coworker.";
}

export function FeedbackCard({ grade, scenario }: { grade: Grade; scenario: Scenario }) {
  const label = TASK_LABEL[grade.taskMet];
  // Shown only after answering: before, a list of what a good answer says would prime it.
  const missing = grade.taskParts
    .filter((report) => !report.present)
    .map((report) => scenario.taskParts[report.part - 1])
    .filter((part) => part !== undefined);

  return (
    <section
      aria-label="Feedback"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <p className={`self-start rounded-full px-3 py-1 font-semibold text-sm ${label.className}`}>
        {label.text}
      </p>
      {missing.length > 0 && (
        <div>
          <p className="font-medium text-sm">Still to do</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {missing.map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ul>
        </div>
      )}
      <p className={`text-sm ${grade.tone === "rude" ? "text-warning" : "text-muted-foreground"}`}>
        {toneMessage(grade.tone, scenario.audience)}
      </p>
      <p>{grade.feedback}</p>

      <div className="rounded-xl bg-muted p-4">
        <p className="font-medium text-muted-foreground text-sm">A coworker might say</p>
        <p className="mt-1">“{grade.betterVersion}”</p>
      </div>

      {(grade.mistakes.length > 0 || grade.correctUses.length > 0) && (
        <ul className="flex flex-col gap-3">
          {grade.mistakes.map((mistake) => (
            <li key={`x-${mistake.skill}-${mistake.quote}`} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 font-bold text-destructive">
                ✗
              </span>
              <div>
                <p className="font-medium">
                  <span className="sr-only">Needs work: </span>
                  {SKILLS[mistake.skill].name}
                </p>
                <p className="text-muted-foreground text-sm">
                  “{mistake.quote}” → “{mistake.fix}”
                </p>
              </div>
            </li>
          ))}
          {grade.correctUses.map((use) => (
            <li key={`ok-${use.skill}-${use.quote}`} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 font-bold text-success">
                ✓
              </span>
              <div>
                <p className="font-medium">
                  <span className="sr-only">Correct: </span>
                  {SKILLS[use.skill].name}
                </p>
                <p className="text-muted-foreground text-sm">“{use.quote}”</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
