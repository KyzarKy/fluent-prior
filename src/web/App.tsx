// The practice loop: show a scenario, take an answer, show the grade, update the learner
// model, and choose the next scenario. Logic lives in src/core; this file wires it to
// React state and the browser.

import { useMemo, useState } from "react";
import type { CapExceeded, Grade } from "../core/contract";
import {
  dueRetries,
  knowledge,
  nextScenario,
  type Observation,
  practiceCounts,
  recentScenarioIds,
  toObservations,
} from "../core/learner";
import { dailyKnowledge } from "../core/progress";
import { SCENARIOS, type Scenario } from "../core/scenarios";
import { requestGrade } from "./api";
import { AnswerForm } from "./components/AnswerForm";
import { FeedbackCard } from "./components/FeedbackCard";
import { MasteryPanel } from "./components/MasteryPanel";
import { ScenarioCard } from "./components/ScenarioCard";
import { StatusMessage } from "./components/StatusMessage";
import { learnerId, loadLog, saveLog } from "./storage";

/** New per page load. Only the per-session spend cap uses it. */
const SESSION_ID = crypto.randomUUID();
const LEARNER_ID = learnerId();
const RECENT_TO_SKIP = 3;

export type Status =
  | { kind: "answering" }
  | { kind: "grading" }
  | { kind: "graded"; grade: Grade }
  | { kind: "capped"; capped: CapExceeded }
  | { kind: "failed" };

function chooseNext(log: readonly Observation[], current?: Scenario): Scenario {
  const skip = recentScenarioIds(log, RECENT_TO_SKIP);
  if (current) skip.push(current.id);
  return nextScenario(SCENARIOS, knowledge(log), skip, dueRetries(log));
}

export function App() {
  const [log, setLog] = useState<Observation[]>(loadLog);
  const [scenario, setScenario] = useState(() => chooseNext(log));
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "answering" });

  const current = useMemo(() => knowledge(log), [log]);
  const counts = useMemo(() => practiceCounts(log), [log]);
  const history = useMemo(() => dailyKnowledge(log), [log]);
  // Checked against the log as it was when the scenario was chosen; answering it clears it.
  const [retry, setRetry] = useState(() => dueRetries(log).includes(scenario.id));

  function updateLog(next: Observation[]) {
    setLog(next);
    saveLog(next);
  }

  async function submit() {
    setStatus({ kind: "grading" });
    const result = await requestGrade({
      scenarioId: scenario.id,
      answer,
      learnerId: LEARNER_ID,
      sessionId: SESSION_ID,
    });
    if (result.kind === "graded") {
      const observations = toObservations(result.grade, scenario, "app", new Date().toISOString());
      updateLog([...log, ...observations]);
      setStatus({ kind: "graded", grade: result.grade });
    } else if (result.kind === "capped") {
      setStatus({ kind: "capped", capped: result.capped });
    } else {
      setStatus({ kind: "failed" });
    }
  }

  function next() {
    const chosen = chooseNext(log, scenario);
    setScenario(chosen);
    setRetry(dueRetries(log).includes(chosen.id));
    setAnswer("");
    setStatus({ kind: "answering" });
  }

  function resetProgress() {
    updateLog([]);
    setScenario(chooseNext([]));
    setRetry(false);
    setAnswer("");
    setStatus({ kind: "answering" });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 pt-6 pb-10">
      <header>
        <h1 className="font-semibold text-2xl tracking-tight">Fluent Prior</h1>
        <p className="text-muted-foreground text-sm">
          English practice for hotel, resort and restaurant work
        </p>
      </header>

      <main className="flex flex-col gap-5">
        <ScenarioCard scenario={scenario} retry={retry} />
        <AnswerForm
          answer={answer}
          onChange={setAnswer}
          onSubmit={submit}
          onNext={next}
          status={status}
        />
        {status.kind === "graded" && <FeedbackCard grade={status.grade} scenario={scenario} />}
        <StatusMessage status={status} />
        <MasteryPanel
          knowledge={current}
          counts={counts}
          history={history}
          onReset={resetProgress}
        />
      </main>
    </div>
  );
}
