// What the learner model believes, in the three tracks of ADR 0006: P(known) for each
// grammar skill, each task type, and tone. Faint skills are marked, because a correct
// answer counts for less when dictation may have filled it in (ADR 0002).

import { useState } from "react";
import type { Knowledge, PracticeCounts } from "../../core/learner";
import { SKILL_IDS, SKILLS } from "../../core/skills";
import { TASK_TYPE_NAMES, TASK_TYPES } from "../../core/tasks";

interface Props {
  knowledge: Knowledge;
  counts: PracticeCounts;
  onReset: () => void;
}

function Meter({
  label,
  p,
  count,
  faint,
}: {
  label: string;
  p: number;
  count: number;
  faint?: boolean;
}) {
  const percent = Math.round(p * 100);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>
          {label}
          {faint && (
            <span className="ml-1 text-muted" title="Hard for dictation to hear">
              ◐
            </span>
          )}
        </span>
        <span className="shrink-0 text-muted tabular-nums">
          {percent}% · {count} {count === 1 ? "answer" : "answers"}
        </span>
      </div>
      {/* Decorative: the percentage in the text above is what screen readers get. */}
      <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-meter" style={{ width: `${percent}%` }} />
      </div>
    </li>
  );
}

export function MasteryPanel({ knowledge, counts, onReset }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section
      aria-labelledby="mastery-heading"
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <h2 id="mastery-heading" className="font-semibold text-lg">
        What you know
      </h2>
      <p className="mt-1 text-muted text-sm">
        The chance you've got each one, based on your answers.
      </p>

      <h3 className="mt-5 font-medium">Tasks</h3>
      <ul className="mt-2 flex flex-col gap-3">
        {TASK_TYPES.map((type) => (
          <Meter
            key={type}
            label={TASK_TYPE_NAMES[type]}
            p={knowledge.tasks[type]}
            count={counts.tasks[type]}
          />
        ))}
      </ul>

      <h3 className="mt-5 font-medium">Tone</h3>
      <ul className="mt-2">
        <Meter label="Right tone for the listener" p={knowledge.tone} count={counts.tone} />
      </ul>

      <h3 className="mt-5 font-medium">Grammar</h3>
      <p className="mt-1 text-muted text-sm">
        ◐ marks grammar that phone dictation often can't hear, so a correct answer counts for less.
      </p>
      <ul className="mt-2 flex flex-col gap-3">
        {SKILL_IDS.map((id) => (
          <Meter
            key={id}
            label={SKILLS[id].name}
            p={knowledge.skills[id]}
            count={counts.skills[id]}
            faint={SKILLS[id].audibility === "faint"}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          if (confirming) {
            onReset();
            setConfirming(false);
          } else {
            setConfirming(true);
          }
        }}
        onBlur={() => setConfirming(false)}
        className="mt-5 min-h-11 text-muted text-sm underline underline-offset-4"
      >
        {confirming ? "Tap again to erase all progress" : "Reset progress"}
      </button>
    </section>
  );
}
