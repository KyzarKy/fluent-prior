// What the learner model believes, in the three tracks of ADR 0006: P(known) for each
// grammar skill, each task type, and tone, now or over the days the learner practiced
// (ROADMAP: progress over time). Faint skills are marked, because a correct answer counts
// for less when dictation may have filled it in (ADR 0002).

import { useState } from "react";
import type { Knowledge, PracticeCounts } from "../../core/learner";
import type { DayKnowledge } from "../../core/progress";
import { SKILL_IDS, SKILLS } from "../../core/skills";
import { TASK_TYPE_NAMES, TASK_TYPES } from "../../core/tasks";
import { Sparkline } from "./Sparkline";

interface Props {
  knowledge: Knowledge;
  counts: PracticeCounts;
  history: readonly DayKnowledge[];
  onReset: () => void;
}

const percent = (p: number) => Math.round(p * 100);

/**
 * The model is never certain, so it never says 100%. Rounding would show 100% from 99.5% up,
 * where after a long streak several slips can pass without the number moving.
 */
const percentLabel = (p: number) => (percent(p) === 100 ? "99%+" : `${percent(p)}%`);

/** "2026-10-04" as "Oct 4". Without a time zone offset, the date is read as local. */
const shortDate = (day: string) =>
  new Date(`${day}T00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Meter({
  label,
  p,
  count,
  trend,
  faint,
}: {
  label: string;
  p: number;
  count: number;
  /**
   * P(known) at the end of each day with practice, null before this one was first
   * practiced. Set only in the over-time view.
   */
  trend?: readonly (number | null)[];
  faint?: boolean;
}) {
  let detail = `${percentLabel(p)} · ${count} ${count === 1 ? "answer" : "answers"}`;
  if (trend) {
    const first = trend.find((value) => value !== null) ?? p;
    detail = count > 0 ? `${percentLabel(first)} → ${percentLabel(p)}` : "Not practiced yet";
  }

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
        <span className="shrink-0 text-muted tabular-nums">{detail}</span>
      </div>
      {/* Decorative: the text above is what screen readers get. */}
      {!trend && (
        <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-meter" style={{ width: `${percent(p)}%` }} />
        </div>
      )}
      {trend && count > 0 && <Sparkline values={trend} />}
    </li>
  );
}

export function MasteryPanel({ knowledge, counts, history, onReset }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [overTime, setOverTime] = useState(false);
  // A line needs two days. Until then there's only "now".
  const canShowTrend = history.length >= 2;
  const showTrend = overTime && canShowTrend;
  // Knowledge and PracticeCounts have the same shape, so one picker reads both.
  const trendOf = (pick: (k: Knowledge) => number) =>
    showTrend
      ? history.map((day) => (pick(day.counts) > 0 ? pick(day.knowledge) : null))
      : undefined;
  const firstDay = history[0]?.day ?? "";
  const lastDay = history.at(-1)?.day ?? "";

  return (
    <section
      aria-labelledby="mastery-heading"
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="mastery-heading" className="font-semibold text-lg">
          What you know
        </h2>
        {canShowTrend && (
          <fieldset className="flex rounded-full bg-surface-muted p-1 text-sm">
            <legend className="sr-only">Show</legend>
            {[false, true].map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={overTime === value}
                onClick={() => setOverTime(value)}
                className={`min-h-11 rounded-full px-4 ${
                  overTime === value ? "bg-surface font-medium shadow-sm" : "text-muted"
                }`}
              >
                {value ? "Over time" : "Now"}
              </button>
            ))}
          </fieldset>
        )}
      </div>
      <p className="mt-1 text-muted text-sm">
        {showTrend
          ? `How the chance you've got each one changed from ${shortDate(firstDay)} to ${shortDate(lastDay)}, one point for each day you practiced.`
          : "The chance you've got each one, based on your answers."}
      </p>
      {history.length === 1 && (
        <p className="mt-1 text-muted text-sm">
          Practice on another day to see your progress over time.
        </p>
      )}

      <h3 className="mt-5 font-medium">Tasks</h3>
      <ul className="mt-2 flex flex-col gap-3">
        {TASK_TYPES.map((type) => (
          <Meter
            key={type}
            label={TASK_TYPE_NAMES[type]}
            p={knowledge.tasks[type]}
            count={counts.tasks[type]}
            trend={trendOf((k) => k.tasks[type])}
          />
        ))}
      </ul>

      <h3 className="mt-5 font-medium">Tone</h3>
      <ul className="mt-2">
        <Meter
          label="Right tone for the listener"
          p={knowledge.tone}
          count={counts.tone}
          trend={trendOf((k) => k.tone)}
        />
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
            trend={trendOf((k) => k.skills[id])}
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
