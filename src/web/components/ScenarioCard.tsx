// The situation and the task, in the words a learner would hear at work.

import { ROLE_NAMES, type Scenario } from "../../core/scenarios";

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  return (
    <section
      aria-labelledby="scenario-heading"
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <p className="mb-3 inline-block rounded-full bg-surface-muted px-3 py-1 font-medium text-muted text-xs uppercase tracking-wide">
        {ROLE_NAMES[scenario.role]}
      </p>
      <h2 id="scenario-heading" className="text-lg leading-snug">
        {scenario.situation}
      </h2>
      <p className="mt-4 font-medium text-muted text-sm">Your task</p>
      <p className="mt-1 text-base">{scenario.task}</p>
    </section>
  );
}
