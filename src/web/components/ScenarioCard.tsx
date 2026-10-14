// The situation and the task, in the words a learner would hear at work. A scenario that
// came back from the retry queue (ADR 0006) says so, so the repeat doesn't look like a bug.

import { Card } from "@kyzarky/ui";
import { ROLE_NAMES, type Scenario } from "../../core/scenarios";

const CHIP = "inline-block rounded-full px-3 py-1 font-medium text-xs uppercase tracking-wide";

export function ScenarioCard({ scenario, retry }: { scenario: Scenario; retry: boolean }) {
  return (
    <Card aria-labelledby="scenario-heading">
      <div className="mb-3 flex flex-wrap gap-2">
        <p className={`${CHIP} bg-muted text-muted-foreground`}>{ROLE_NAMES[scenario.role]}</p>
        {retry && <p className={`${CHIP} bg-warning/15 text-warning`}>Second try</p>}
      </div>
      <h2 id="scenario-heading" className="text-lg leading-snug">
        {scenario.situation}
      </h2>
      <p className="mt-4 font-medium text-muted-foreground text-sm">Your task</p>
      <p className="mt-1 text-base">{scenario.task}</p>
    </Card>
  );
}
