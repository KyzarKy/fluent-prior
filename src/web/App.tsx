// The practice loop: show a scenario, take an answer, show the grade, update the learner
// model, and choose the next scenario. Logic lives in src/core; this file wires it to
// React state and the browser.

import { Button, Link } from "@kyzarky/ui";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { sampleLearnerLog } from "../core/sample-learner";
import { SCENARIOS, type Scenario } from "../core/scenarios";
import { requestGrade } from "./api";
import { AnswerForm } from "./components/AnswerForm";
import { FeedbackCard } from "./components/FeedbackCard";
import { HowItWorks } from "./components/HowItWorks";
import { MasteryPanel } from "./components/MasteryPanel";
import { ScenarioCard } from "./components/ScenarioCard";
import { StatusMessage } from "./components/StatusMessage";
import { Tabs } from "./components/Tabs";
import { learnerId, loadLog, saveLog } from "./storage";

/** New per page load. Only the per-session spend cap uses it. */
const SESSION_ID = crypto.randomUUID();
const LEARNER_ID = learnerId();
const RECENT_TO_SKIP = 3;
const VIEWS = [
  { id: "practice", label: "Practice" },
  { id: "progress", label: "Progress" },
] as const;
type View = (typeof VIEWS)[number]["id"];
/** How it works is a place with its own URL, so it can be linked to and Back closes it. */
const HOW_IT_WORKS = "#how-it-works";

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
  const [view, setView] = useState<View>("practice");
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  // Counts situations shown, so a grade that arrives after Next is logged but not shown.
  const showing = useRef(0);

  const current = useMemo(() => knowledge(log), [log]);
  const counts = useMemo(() => practiceCounts(log), [log]);
  const history = useMemo(() => dailyKnowledge(log), [log]);
  // Shown in place of the learner's own progress when asked for; never saved or mixed in.
  const [viewingSample, setViewingSample] = useState(false);
  const sample = useMemo(() => {
    const sampleLog = sampleLearnerLog(new Date());
    return {
      knowledge: knowledge(sampleLog),
      counts: practiceCounts(sampleLog),
      history: dailyKnowledge(sampleLog),
    };
  }, []);
  // Checked against the log as it was when the scenario was chosen; answering it clears it.
  const [retry, setRetry] = useState(() => dueRetries(log).includes(scenario.id));

  function updateLog(next: Observation[]) {
    setLog(next);
    saveLog(next);
  }

  function closeHowItWorks() {
    // Drop the fragment without adding a history entry, so Back doesn't reopen it.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setHash("");
  }

  async function submit() {
    // An answer is the learner's own, so their own progress is what should show.
    setViewingSample(false);
    setStatus({ kind: "grading" });
    const shown = showing.current;
    const result = await requestGrade({
      scenarioId: scenario.id,
      answer,
      learnerId: LEARNER_ID,
      sessionId: SESSION_ID,
    });
    if (result.kind === "graded") {
      const observations = toObservations(result.grade, scenario, "app", new Date().toISOString());
      // From the latest log, not this render's: the learner may have moved on meanwhile.
      setLog((latest) => {
        const next = [...latest, ...observations];
        saveLog(next);
        return next;
      });
    }
    if (shown !== showing.current) return;
    if (result.kind === "graded") {
      setStatus({ kind: "graded", grade: result.grade });
    } else if (result.kind === "capped") {
      setStatus({ kind: "capped", capped: result.capped });
    } else {
      setStatus({ kind: "failed" });
    }
  }

  function next() {
    showing.current++;
    const chosen = chooseNext(log, scenario);
    setScenario(chosen);
    setRetry(dueRetries(log).includes(chosen.id));
    setAnswer("");
    setStatus({ kind: "answering" });
    // The button is at the bottom of the feedback; the new situation is at the top.
    window.scrollTo({ top: 0 });
    document.getElementById("scenario-heading")?.focus({ preventScroll: true });
  }

  function resetProgress() {
    updateLog([]);
    setScenario(chooseNext([]));
    setRetry(false);
    setAnswer("");
    setStatus({ kind: "answering" });
  }

  // One check per showing: a failed or capped check can be tried again, a graded one can't.
  const canCheck =
    answer.trim().length > 0 && status.kind !== "grading" && status.kind !== "graded";

  return (
    // On Practice the action bar is the page's last row, and its own padding is the bottom
    // margin: more below it would scroll into view as a blank strip under the buttons.
    <div
      className={`mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 pt-6 ${view === "practice" ? "" : "pb-10"}`}
    >
      <header>
        <h1 className="font-semibold text-2xl tracking-tight">Fluent Prior</h1>
        <p className="text-muted-foreground text-sm">
          English practice for hotel, resort and restaurant work.{" "}
          <Link href={HOW_IT_WORKS}>How it works</Link>
        </p>
      </header>

      <main className="flex flex-col gap-5">
        <Tabs label="View" tabs={VIEWS} selected={view} onSelect={setView} />
        <div
          role="tabpanel"
          id="panel-practice"
          aria-labelledby="tab-practice"
          hidden={view !== "practice"}
          className="flex flex-col gap-5"
        >
          <ScenarioCard scenario={scenario} retry={retry} />
          <AnswerForm
            answer={answer}
            sampleAnswer={scenario.sampleAnswer}
            onChange={setAnswer}
            onSubmit={submit}
            status={status}
          />
          {status.kind === "graded" && <FeedbackCard grade={status.grade} scenario={scenario} />}
          <StatusMessage status={status} />
          {/* Always on screen on a phone, and never moving: stuck to the bottom of the view. */}
          <div className="sticky bottom-0 -mx-4 flex gap-3 border-border border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button type="submit" form="answer-form" disabled={!canCheck} className="flex-1 px-3!">
              {status.kind === "grading" ? "Checking…" : "Check my answer"}
            </Button>
            <Button variant="outline" onClick={next} className="flex-1 px-3!">
              Next situation <span aria-hidden="true">→</span>
            </Button>
          </div>
        </div>
        <div
          role="tabpanel"
          id="panel-progress"
          aria-labelledby="tab-progress"
          hidden={view !== "progress"}
        >
          {viewingSample ? (
            <MasteryPanel key="sample" {...sample} sample onBack={() => setViewingSample(false)} />
          ) : (
            <MasteryPanel
              key="own"
              knowledge={current}
              counts={counts}
              history={history}
              onReset={resetProgress}
              onShowSample={() => setViewingSample(true)}
            />
          )}
        </div>
      </main>
      <HowItWorks open={hash === HOW_IT_WORKS} onClose={closeHowItWorks} />
    </div>
  );
}
