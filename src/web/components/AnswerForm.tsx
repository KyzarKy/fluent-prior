// The answer box. The app takes text; learners speak through their keyboard's microphone
// (ADR 0001), so the box doubles as "here's what your phone heard", and they can fix it.
// Once checked, the answer is final: one answer per showing of a situation, so each grade
// is one observation in the log, never a second try at the same words. The Check button
// lives in the page's action bar and submits this form by its id.

import { Button } from "@kyzarky/ui";
import { MAX_ANSWER_CHARS } from "../../core/contract";
import type { Status } from "../App";

interface Props {
  answer: string;
  /** A learner's answer from the answer key, for visitors who'd rather not write one. */
  sampleAnswer: string;
  onChange: (answer: string) => void;
  onSubmit: () => void;
  status: Status;
}

export function AnswerForm({ answer, sampleAnswer, onChange, onSubmit, status }: Props) {
  const grading = status.kind === "grading";
  const graded = status.kind === "graded";
  const empty = answer.trim().length === 0;
  const isSample = answer === sampleAnswer;

  return (
    <form
      id="answer-form"
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!empty && !grading && !graded) onSubmit();
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
        aria-describedby="answer-help answer-count"
        value={answer}
        readOnly={graded}
        onChange={(event) => onChange(event.target.value)}
        maxLength={MAX_ANSWER_CHARS}
        rows={4}
        autoCapitalize="sentences"
        autoCorrect="off"
        spellCheck={false}
        className="w-full resize-y rounded-xl border border-input bg-card p-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 read-only:resize-none read-only:bg-muted"
      />
      <div className="flex items-center justify-between gap-3">
        {empty && !grading ? (
          <Button variant="outline" onClick={() => onChange(sampleAnswer)}>
            Try a sample answer
          </Button>
        ) : (
          <span />
        )}
        {/* Read with the box, not announced on every keystroke. */}
        <p id="answer-count" className="text-muted-foreground text-xs">
          {answer.length} / {MAX_ANSWER_CHARS}
        </p>
      </div>
      {isSample && !graded && (
        <p className="text-muted-foreground text-sm">
          A real learner's answer, mistakes included. Check it to see how it's graded.
        </p>
      )}
    </form>
  );
}
