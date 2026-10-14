// What the learner model believes, in the three tracks of ADR 0006: P(known) for each
// grammar skill, each task type, and tone, now or over the days the learner practiced
// (ROADMAP: progress over time). Faint skills are marked, because a correct answer counts
// for less when dictation may have filled it in (ADR 0002).

import { Card, List, ListRow, Meter, SegmentedControl } from "@kyzarky/ui";
import { useState } from "react";
import type { Knowledge, PracticeCounts } from "../../core/learner";
import { type DayKnowledge, localDay, type TrendPoint, trendLine } from "../../core/progress";
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

function MasteryRow({
  label,
  p,
  count,
  trend,
  faint,
}: {
  label: string;
  p: number;
  count: number;
  /** This row's line, from its first day with practice to today. Only in the over-time view. */
  trend?: readonly TrendPoint[];
  faint?: boolean;
}) {
  let detail = `${percentLabel(p)} · ${count} ${count === 1 ? "answer" : "answers"}`;
  if (trend) {
    const first = trend[0]?.p ?? p;
    detail = count > 0 ? `${percentLabel(first)} → ${percentLabel(p)}` : "Not practiced yet";
  }

  return (
    <ListRow
      label={
        <>
          {label}
          {faint && (
            <span className="ml-1 text-muted-foreground" title="Hard for dictation to hear">
              ◐
            </span>
          )}
        </>
      }
      detail={detail}
    >
      {trend ? <Sparkline points={trend} /> : <Meter value={p} />}
    </ListRow>
  );
}

export function MasteryPanel({ knowledge, counts, history, onReset }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [overTime, setOverTime] = useState(false);
  // A line needs two days. Until then there's only "now".
  const canShowTrend = history.length >= 2;
  const showTrend = overTime && canShowTrend;
  const today = localDay(new Date().toISOString());
  const trendOf = (pick: (k: Knowledge) => number) =>
    showTrend ? trendLine(history, pick, today) : undefined;

  return (
    <Card aria-labelledby="mastery-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="mastery-heading" className="font-semibold text-lg">
          What you know
        </h2>
        {canShowTrend && (
          <SegmentedControl
            label="Show"
            value={overTime ? "over-time" : "now"}
            onChange={(view) => setOverTime(view === "over-time")}
            options={[
              { value: "now", label: "Now" },
              { value: "over-time", label: "Over time" },
            ]}
          />
        )}
      </div>
      <p className="mt-1 text-muted-foreground text-sm">
        {showTrend
          ? "How the chance you've got each one changed, from the day you first practiced it (left) to today (right)."
          : "The chance you've got each one, based on your answers."}
      </p>
      {history.length === 1 && (
        <p className="mt-1 text-muted-foreground text-sm">
          Practice on another day to see your progress over time.
        </p>
      )}

      <List heading={<h3>Tasks</h3>}>
        {TASK_TYPES.map((type) => (
          <MasteryRow
            key={type}
            label={TASK_TYPE_NAMES[type]}
            p={knowledge.tasks[type]}
            count={counts.tasks[type]}
            trend={trendOf((k) => k.tasks[type])}
          />
        ))}
      </List>

      <List heading={<h3>Tone</h3>}>
        <MasteryRow
          label="Right tone for the listener"
          p={knowledge.tone}
          count={counts.tone}
          trend={trendOf((k) => k.tone)}
        />
      </List>

      <List
        heading={<h3>Grammar</h3>}
        description="◐ marks grammar that phone dictation often can't hear, so a correct answer counts for less."
      >
        {SKILL_IDS.map((id) => (
          <MasteryRow
            key={id}
            label={SKILLS[id].name}
            p={knowledge.skills[id]}
            count={counts.skills[id]}
            trend={trendOf((k) => k.skills[id])}
            faint={SKILLS[id].audibility === "faint"}
          />
        ))}
      </List>

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
        className="mt-5 min-h-11 text-muted-foreground text-sm underline underline-offset-4"
      >
        {confirming ? "Tap again to erase all progress" : "Reset progress"}
      </button>
    </Card>
  );
}
