// The practice loop: show a scenario, take an answer, show the grade, update the learner
// model, and choose the next scenario. Logic lives in src/core; this file wires it to
// React state and the browser.

import { useMemo, useState } from "react";
import type { CapExceeded, GraderOutput } from "../core/contract";
import {
  mastery,
  nextScenario,
  type Observation,
  practiceCounts,
  recentScenarioIds,
  toObservations,
} from "../core/learner";
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
  | { kind: "graded"; grade: GraderOutput }
  | { kind: "capped"; capped: CapExceeded }
  | { kind: "failed" };

function chooseNext(log: readonly Observation[], current?: Scenario): Scenario {
  const skip = recentScenarioIds(log, RECENT_TO_SKIP);
  if (current) skip.push(current.id);
  return nextScenario(SCENARIOS, mastery(log), skip);
}

export function App() {
  const [log, setLog] = useState<Observation[]>(loadLog);
  const [scenario, setScenario] = useState(() => chooseNext(log));
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "answering" });

  const knowledge = useMemo(() => mastery(log), [log]);
  const counts = useMemo(() => practiceCounts(log), [log]);

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
      const observations = toObservations(
        result.grade,
        scenario.id,
        "app",
        new Date().toISOString(),
      );
      updateLog([...log, ...observations]);
      setStatus({ kind: "graded", grade: result.grade });
    } else if (result.kind === "capped") {
      setStatus({ kind: "capped", capped: result.capped });
    } else {
      setStatus({ kind: "failed" });
    }
  }

  function next() {
    setScenario(chooseNext(log, scenario));
    setAnswer("");
    setStatus({ kind: "answering" });
  }

  function resetProgress() {
    updateLog([]);
    setScenario(chooseNext([]));
    setAnswer("");
    setStatus({ kind: "answering" });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 pt-6 pb-10">
      <header>
        <h1 className="font-semibold text-2xl tracking-tight">Fluent Prior</h1>
        <p className="text-muted text-sm">English practice for hotel, resort and restaurant work</p>
      </header>

      <main className="flex flex-col gap-5">
        <ScenarioCard scenario={scenario} />
        <AnswerForm
          answer={answer}
          onChange={setAnswer}
          onSubmit={submit}
          onNext={next}
          status={status}
        />
        {status.kind === "graded" && <FeedbackCard grade={status.grade} />}
        <StatusMessage status={status} />
        <MasteryPanel mastery={knowledge} counts={counts} onReset={resetProgress} />
      </main>
    </div>
  );
}
