// What the learner model believes: P(known) for each skill. Faint skills are marked,
// because a correct answer counts for less when dictation may have filled it in (ADR 0002).

import { useState } from "react";
import type { Mastery } from "../../core/learner";
import { SKILL_IDS, SKILLS, type SkillId } from "../../core/skills";

interface Props {
  mastery: Mastery;
  counts: Record<SkillId, number>;
  onReset: () => void;
}

export function MasteryPanel({ mastery, counts, onReset }: Props) {
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
        The chance you know each skill, based on your answers. ◐ marks skills where phone dictation
        often can't hear mistakes, so a correct answer counts for less.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {SKILL_IDS.map((id) => {
          const percent = Math.round(mastery[id] * 100);
          const skill = SKILLS[id];
          return (
            <li key={id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>
                  {skill.name}
                  {skill.audibility === "faint" && (
                    <span className="ml-1 text-muted" title="Hard for dictation to hear">
                      ◐
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-muted tabular-nums">
                  {percent}% · {counts[id]} {counts[id] === 1 ? "answer" : "answers"}
                </span>
              </div>
              {/* Decorative: the percentage in the text above is what screen readers get. */}
              <div
                aria-hidden="true"
                className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted"
              >
                <div className="h-full rounded-full bg-meter" style={{ width: `${percent}%` }} />
              </div>
            </li>
          );
        })}
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
