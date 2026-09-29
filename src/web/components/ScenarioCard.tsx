// The situation and the task, in the words a learner would hear at work. A scenario that
// came back from the retry queue (ADR 0006) says so, so the repeat doesn't look like a bug.

import { ROLE_NAMES, type Scenario } from "../../core/scenarios";

const CHIP = "inline-block rounded-full px-3 py-1 font-medium text-xs uppercase tracking-wide";

export function ScenarioCard({ scenario, retry }: { scenario: Scenario; retry: boolean }) {
  return (
    <section
      aria-labelledby="scenario-heading"
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <p className={`${CHIP} bg-surface-muted text-muted`}>{ROLE_NAMES[scenario.role]}</p>
        {retry && <p className={`${CHIP} bg-partly/15 text-partly`}>Second try</p>}
      </div>
      <h2 id="scenario-heading" className="text-lg leading-snug">
        {scenario.situation}
      </h2>
      <p className="mt-4 font-medium text-muted text-sm">Your task</p>
      <p className="mt-1 text-base">{scenario.task}</p>
    </section>
  );
}
