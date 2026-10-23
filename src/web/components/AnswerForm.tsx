// The answer box. The app takes text; learners speak through their keyboard's microphone
// (ADR 0001), so the box doubles as "here's what your phone heard", and they can fix it.

import { Button } from "@kyzarky/ui";
import { MAX_ANSWER_CHARS } from "../../core/contract";
import type { Status } from "../App";

interface Props {
  answer: string;
  /** A learner's answer from the answer key, for visitors who'd rather not write one. */
  sampleAnswer: string;
  onChange: (answer: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  status: Status;
}

export function AnswerForm({ answer, sampleAnswer, onChange, onSubmit, onNext, status }: Props) {
  const grading = status.kind === "grading";
  const graded = status.kind === "graded";
  const empty = answer.trim().length === 0;
  const isSample = answer === sampleAnswer;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!empty && !grading) onSubmit();
      }}
    >
      <label htmlFor="answer" className="font-medium">
        Your answer
      </label>
      <p id="answer-help" className="text-muted-foreground text-sm">
        Tap the microphone on your keyboard and say it out loud, or type it. Fix anything your phone
        heard wrong before you check.
      </p>
      <textarea
        id="answer"
        aria-describedby="answer-help"
        value={answer}
        onChange={(event) => onChange(event.target.value)}
        maxLength={MAX_ANSWER_CHARS}
        rows={4}
        autoCapitalize="sentences"
        autoCorrect="off"
        spellCheck={false}
        className="w-full resize-y rounded-xl border border-input bg-card p-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
      <div className="flex items-center justify-between gap-3">
        {empty && !grading ? (
          <Button
            variant="ghost"
            onClick={() => onChange(sampleAnswer)}
            className="-ml-3 px-3 text-sm text-primary underline underline-offset-4"
          >
            Try a sample answer
          </Button>
        ) : (
          <span />
        )}
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {answer.length} / {MAX_ANSWER_CHARS}
        </p>
      </div>
      {isSample && !graded && (
        <p className="text-muted-foreground text-sm">
          A real learner's answer, mistakes included. Check it to see how it's graded.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={empty || grading} className="flex-1">
          {grading ? "Checking…" : graded ? "Check again" : "Check my answer"}
        </Button>
        {graded && (
          <Button variant="outline" onClick={onNext} className="flex-1">
            Next situation
          </Button>
        )}
      </div>
    </form>
  );
}
