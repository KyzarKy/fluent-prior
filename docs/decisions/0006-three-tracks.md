# 0006. Three separate tracks: grammar, task completion, tone

**Status:** 2026-09-29. Accepted: the three tracks, the skill removals, the tone scale.
Proposed, for Ky's review before code: the task checklists and task types below.

## Context

The first eval grades showed three different things tangled together. `taskMet` mixed
completeness with tone ("partly: doesn't suggest anything, and isn't especially polite").
Four skills weren't grammar: `register` and `polite-requests` are tone, `apologizing` is
part of some tasks, and `workplace-vocabulary` is a set of separate words. Tone came in
degrees, with no single right answer, so it couldn't be a quote → fix mistake.

## Decision

**1. Grammar skills** stay in the Bayesian learner model ([ADR 0002](0002-learner-model.md)),
and skills are grammar only. The four non-grammar skills are removed:

| Removed skill | Now |
|---|---|
| `register` | The tone track (3) |
| `polite-requests` | The tone track. Its grammar, question word order, stays in `question-forms` |
| `apologizing` | A task-checklist part, in scenarios where the task calls for it |
| `workplace-vocabulary` | The tutor's word log (ROADMAP), with word choice |

Saved logs keep working: entries for removed skills are dropped on load; the rest of the
learner's history stays.

**2. Task completion.** `taskMet` means completeness only.

- **Checklists.** Each scenario lists the parts a complete answer needs. The learner never
  sees them, so they can't prime the answer. The grader marks each part present or missing,
  and code computes the verdict: every part is yes, some is partly, none is no. As with
  mistakes-first, the grader commits to the details before the verdict.
- **Task-type tracks.** Scenarios are grouped by what the learner is doing. Each type is
  tracked with the same model as a grammar skill: yes counts as right, no as wrong, partly
  as mixed. Missing content is plain in text, so no dictation weighting applies.
- **Retry queue.** An answer that isn't complete brings its scenario back sooner.
- **Later, with real data:** an Elo-style ability score (a learner ability and a difficulty
  per scenario). Estimating difficulty needs answers from many learners, so it waits for
  accounts and real users.

**3. Tone** is its own scale: `polite`, `neutral`, `rude`. Too direct counts as rude. It's
never a mistake, and it's never part of `taskMet`.

- Learners see the effect, not a verdict about them: "may come across as rude", not "rude".
  Whether the learner meant it can't be known.
- What's expected depends on the listener. With a guest, polite is the target. With a
  coworker, neutral is fine. How tone feeds the learner model is designed with the checklist
  code, weighted low because dictation loses the voice that carries most of politeness.

## Proposed task types and checklists

| Scenario | Task type | Parts of a complete answer |
|---|---|---|
| early-arrival | Guest problems | Explains the room isn't ready or when it will be · Suggests something to do meanwhile |
| slow-food | Guest problems | Apologizes or acknowledges the wait · Gives an update (food in about 5 minutes) · Offers something to make it right |
| noisy-room | Guest problems | Apologizes or acknowledges the problem · Offers a solution (call next door, or move rooms) |
| pharmacy-directions | Guest information | Gives directions a guest could follow |
| todays-special | Guest information | Names the dish · Mentions the sides |
| peanut-allergy | Guest information | Reassures the guest · Says what they'll do next · Explains the kitchen's allergy procedure |
| come-back-later | Requests | Accepts the guest's wish · Arranges a time (asks for one or proposes one) |
| check-in-id | Requests | Asks for photo ID · Asks for a credit card |
| delivery-question | Requests | Asks where the delivery goes |
| broken-lamp | Reporting up | Says what's broken and where · Says when it was noticed |
| ran-out-of-salmon | Reporting up | Tells the chef the salmon is gone · Asks what servers should tell guests |
| room-report | Reporting up | Reports what was done in room 305 |
| end-of-shift | Briefing coworkers | Clean the station · Label stored food · Take out the trash |
| shift-handoff | Briefing coworkers | The guest's calls about the air conditioning · The maintenance visit and fix |

Two things to check in review:

- **Apologizing is a required part in two guest-problem scenarios.** The task text doesn't
  say "apologize", so a learner who solves the problem without one would get partly. The
  alternative is making apology part of tone instead.
- **One-part checklists** (pharmacy, delivery, room report) can only produce yes or no.

## Consequences

- The grader's output gains a checklist result and a tone value. The contract, the prompt,
  the answer key and the UI all change with it.
- The learner model gains task-type tracks alongside skills. Next-scenario choice can target
  either.
- Every scenario needs a task type and a checklist; `scenarios.test.ts` should enforce it.
- [ADR 0001](0001-text-in-meaning-graded.md)'s "reports each grammar or vocabulary skill"
  now means grammar skills only.
