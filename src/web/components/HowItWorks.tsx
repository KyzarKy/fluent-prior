// What the app does and why, in plain words, for learners and for anyone looking at it as
// a portfolio piece. The "prior" paragraph is the idea behind the name (README).

import { Modal } from "@kyzarky/ui";

export function HowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="How it works">
      <div className="flex flex-col gap-3">
        <p>You get a real moment from hotel, resort, or restaurant work, and you answer.</p>
        <p>
          A "grader", the <code>openai/gpt-oss-120b</code> model on Groq, checks three separate
          things: whether you did every part of the task, how your tone might sound to the listener,
          and which grammar rules you used and how well you applied them. When that model reaches
          its free limit, a smaller one, <code>openai/gpt-oss-20b</code>, grades instead; it more
          often flags a mistake you didn't make, or hears a polite answer as neutral. The app, not
          the grader, decides how much each answer counts toward your learning progress for each
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
    </Modal>
  );
}
