// The answer box. The app takes text; learners speak through their keyboard's microphone
// (ADR 0001), so the box doubles as "here's what your phone heard", and they can fix it.

import { MAX_ANSWER_CHARS } from "../../core/contract";
import type { Status } from "../App";

interface Props {
  answer: string;
  onChange: (answer: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  status: Status;
}

export function AnswerForm({ answer, onChange, onSubmit, onNext, status }: Props) {
  const grading = status.kind === "grading";
  const graded = status.kind === "graded";
  const empty = answer.trim().length === 0;

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
      <p id="answer-help" className="text-muted text-sm">
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
        className="w-full resize-y rounded-xl border border-border bg-surface p-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
      <p className="self-end text-muted text-xs" aria-live="polite">
        {answer.length} / {MAX_ANSWER_CHARS}
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={empty || grading}
          className="min-h-11 flex-1 rounded-xl bg-accent px-5 font-semibold text-accent-text disabled:opacity-50"
        >
          {grading ? "Checking…" : graded ? "Check again" : "Check my answer"}
        </button>
        {graded && (
          <button
            type="button"
            onClick={onNext}
            className="min-h-11 flex-1 rounded-xl border border-border bg-surface px-5 font-semibold"
          >
            Next situation
          </button>
        )}
      </div>
    </form>
  );
}
