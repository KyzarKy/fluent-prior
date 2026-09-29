// The grade: whether the answer did the job, one piece of feedback, a more natural
// version, and each skill the answer used.

import type { Grade } from "../../core/contract";
import { SKILLS } from "../../core/skills";

const TASK_LABEL = {
  yes: { text: "Got it done", className: "bg-good/15 text-good" },
  partly: { text: "Partly there", className: "bg-partly/15 text-partly" },
  no: { text: "Not yet", className: "bg-bad/15 text-bad" },
} as const;

export function FeedbackCard({ grade }: { grade: Grade }) {
  const label = TASK_LABEL[grade.taskMet];
  return (
    <section
      aria-label="Feedback"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <p className={`self-start rounded-full px-3 py-1 font-semibold text-sm ${label.className}`}>
        {label.text}
      </p>
      <p>{grade.feedback}</p>

      <div className="rounded-xl bg-surface-muted p-4">
        <p className="font-medium text-muted text-sm">A coworker might say</p>
        <p className="mt-1">“{grade.betterVersion}”</p>
      </div>

      {(grade.mistakes.length > 0 || grade.correctUses.length > 0) && (
        <ul className="flex flex-col gap-3">
          {grade.mistakes.map((mistake) => (
            <li key={`x-${mistake.skill}-${mistake.quote}`} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 font-bold text-bad">
                ✗
              </span>
              <div>
                <p className="font-medium">
                  <span className="sr-only">Needs work: </span>
                  {SKILLS[mistake.skill].name}
                </p>
                <p className="text-muted text-sm">
                  “{mistake.quote}” → “{mistake.fix}”
                </p>
              </div>
            </li>
          ))}
          {grade.correctUses.map((use) => (
            <li key={`ok-${use.skill}-${use.quote}`} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 font-bold text-good">
                ✓
              </span>
              <div>
                <p className="font-medium">
                  <span className="sr-only">Correct: </span>
                  {SKILLS[use.skill].name}
                </p>
                <p className="text-muted text-sm">“{use.quote}”</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
