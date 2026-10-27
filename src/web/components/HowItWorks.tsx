// What the app does and why, in plain words, for learners and for anyone looking at it as
// a portfolio piece. The "prior" paragraph is the idea behind the name (README).
//
// A modal <dialog>: the browser traps focus inside it, closes it on Escape, and returns
// focus to the button that opened it.

import { Button, Card } from "@kyzarky/ui";
import { useEffect, useRef } from "react";

export function HowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape is the keyboard way out, built into <dialog>.
    <dialog
      ref={dialog}
      aria-labelledby="how-it-works-heading"
      onClose={onClose}
      // A click outside the card lands on the dialog's backdrop, which belongs to the dialog.
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-xl bg-transparent p-0 backdrop:bg-black/50"
    >
      <Card className="max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <h2 id="how-it-works-heading" className="font-semibold text-lg">
            How it works
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="-mr-2 text-xl"
          >
            ×
          </Button>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <p>You get a real moment from hotel, resort, or restaurant work, and you answer.</p>
          <p>
            A "grader", the <code>openai/gpt-oss-120b</code> model on Groq, checks three separate
            things: whether you did every part of the task, how your tone might sound to the
            listener, and which grammar rules you used and how well you applied them. The app, not
            the model, decides how much each answer counts toward your learning progress for each
            rule.
          </p>
          <p>
            A Bayesian model keeps a running estimate for each grammar rule, each kind of task, and
            tone, and picks your next situation to practice what's weakest.
          </p>
          <h3 className="font-semibold">Why "prior"</h3>
          <p>
            Speech recognition is trained on fluent speakers. When a small sound is unclear, the
            recognizer guesses the grammatical version, so "he go" can come out as "he goes". That
            means a mistake that makes it through dictation is strong evidence, and a correct -s or
            -ed is weak evidence. Skills marked ◐ count correct answers for less for that reason.
          </p>
          <h3 className="font-semibold">Your data</h3>
          <p className="text-muted-foreground text-sm">
            There are no accounts. Your progress stays in this browser. Answers go to the grader, an
            open model hosted by Groq, to be checked, and Fluent Prior doesn't save them.
          </p>
        </div>
      </Card>
    </dialog>
  );
}
