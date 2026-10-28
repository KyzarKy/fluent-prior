// What the learner model believes, in the three tracks of ADR 0006: P(known) for each
// grammar skill, each task type, and tone, now or over the days the learner practiced
// (ROADMAP: progress over time). Faint skills are marked, because a correct answer counts
// for less when dictation may have filled it in (ADR 0002).

import { Button, Card, List, ListRow, Meter, SegmentedControl } from "@kyzarky/ui";
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
  /** Showing the made-up sample learner instead of this learner's own progress. */
  sample?: boolean;
  onReset?: () => void;
  onShowSample?: () => void;
  onBack?: () => void;
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

export function MasteryPanel({
  knowledge,
  counts,
  history,
  sample = false,
  onReset,
  onShowSample,
  onBack,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  // The sample is there to show progress, so it opens on Over time.
  const [overTime, setOverTime] = useState(sample);
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
          {sample ? "What a sample learner knows" : "What you know"}
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
      {sample && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted p-3 text-sm">
          <p>A made-up learner's two weeks, to show how progress looks.</p>
          <Button variant="outline" onClick={onBack}>
            Back to your progress
          </Button>
        </div>
      )}
      <p className="mt-3 text-muted-foreground text-sm">
        {showTrend
          ? `How sure the app is that ${sample ? "they know" : "you know"} each one, from the day ${sample ? "they" : "you"} first practiced it (left) to today (right).`
          : `How sure the app is that ${sample ? "they know" : "you know"} each one, based on ${sample ? "their" : "your"} answers.`}
      </p>
      {!sample && history.length < 2 && (
        <>
          {history.length === 1 && (
            <p className="mt-1 text-muted-foreground text-sm">
              Practice on another day to see your progress over time.
            </p>
          )}
          {/* Its own row: a button inside a paragraph sits partway along the text's line. */}
          <Button variant="outline" onClick={onShowSample} className="mt-3">
            See a sample learner's two weeks
          </Button>
        </>
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

      {onReset && (
        <Button
          variant="outline"
          onClick={() => {
            if (confirming) {
              onReset();
              setConfirming(false);
            } else {
              setConfirming(true);
            }
          }}
          onBlur={() => setConfirming(false)}
          className={`mt-5 ${confirming ? "text-destructive" : ""}`}
        >
          {confirming ? "Tap again to erase all progress" : "Reset progress"}
        </Button>
      )}
    </Card>
  );
}
