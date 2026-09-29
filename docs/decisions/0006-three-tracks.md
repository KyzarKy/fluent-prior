# 0006. Three separate tracks: grammar, task completion, tone

**Status:** accepted, 2026-09-29, including the checklists and task types below (reviewed
by Ky the same day).

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
| `polite-requests` | The tone track. Its grammar stays: word order in `question-forms`, and "could you help", not "could you to help", in `modal-verbs` |
| `apologizing` | The tone track: an apology is one of the things that makes an answer polite |
| `workplace-vocabulary` | The tutor's word log (ROADMAP), with word choice |

`obligation` is renamed `modal-verbs` and widened from must, have to and should to every
modal verb, because "could you to help" is the same rule as "must to tell" and would
otherwise go untracked once `polite-requests` is gone.

Saved logs keep working: entries for removed skills are dropped on load, renamed skills are
mapped to their new id, and the rest of the learner's history stays.

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

## Task types and checklists

The lines as of 2026-09-29. `src/core/scenarios.ts` is the source of truth.

| Scenario | Task type | Parts of a complete answer |
|---|---|---|
| early-arrival | Guest problems | Explains the room isn't ready or when it will be · Suggests an additional activity to pass the time until the room is ready |
| slow-food | Guest problems | Tells the guests when their food will arrive · Offers something extra, beyond an apology, to make up for the wait |
| noisy-room | Guest problems | Offers a solution (call next door, or move rooms) |
| pharmacy-directions | Guest information | Gives directions a guest could follow |
| todays-special | Guest information | Names the dish · Mentions the sides |
| peanut-allergy | Guest information | Says what they'll do next about the allergy · Explains how the kitchen keeps the guest's food free of peanuts |
| come-back-later | Requests | Arranges a new time (asks for one or proposes one) |
| check-in-id | Requests | Asks for photo ID · Asks for a credit card |
| delivery-question | Requests | Asks where the delivery goes |
| broken-lamp | Reporting up | Says what's broken and where · Says when it was noticed |
| ran-out-of-salmon | Reporting up | Tells the chef the salmon is gone · Asks what servers should tell guests |
| room-report | Reporting up | Reports what was done in room 305 |
| end-of-shift | Briefing coworkers | Clean the station · Label stored food · Take out the trash |
| shift-handoff | Briefing coworkers | The guest's calls about the air conditioning · The maintenance visit and fix |

Settled in review:

- **Apologizing isn't a checklist part.** The task text never asks for one, so requiring it
  would mark a learner incomplete for something they weren't asked to do. An apology counts
  toward tone instead.
- **One-part checklists are fine.** Those scenarios can only be yes or no.

## How to write checklist lines

Added 2026-09-29, after the grader counted "come back 3 o'clock" as suggesting something to
do while waiting, and failed an answer that named the separate cutting board but not the
chef's check.

1. **Describe the listener's need, not a loose action.** "Suggests something the guest can
   do" is met by "come back at 3". "Suggests an additional activity to pass the time" says
   what the guest needs, and "come back later" doesn't meet it.
2. **Parts don't overlap.** One piece of an answer should satisfy at most one part.
   "Additional" does this for early-arrival: part 2 has to add something beyond part 1. The
   old peanut-allergy list had "Reassures the guest" beside "Explains the procedure", and
   explaining the procedure is the reassurance, so reassurance is no longer a part.
3. **Name a category, never example answers.** "An activity to pass the time" is a
   category; "coffee in the lobby" would be fitting the checklist to one answer.
4. **List a detail only if every complete answer must include it.** The grader reads a list
   as a requirement: "(separate cutting board, chef checks the plates)" failed an answer
   that gave only the board.
5. **The task text and the checklist mean the same thing.** The checklist can be more
   explicit, but it can't require more than the task asks; otherwise it grades a hidden
   expectation. Tighten the task text to match, without modeling the scenario's target
   grammar: early-arrival's task says "spend the wait", not "until the room is ready",
   which would hand the learner "is" in a scenario that grades be-verbs.

Test each new line two ways: the laziest answer that matches its words without meeting the
need should fail, and a borderline good answer should pass. Then grade the answer key's
entries for that scenario, before and after, so a fix for one answer can't quietly break
another.

## Consequences

- The grader's output gains a checklist result and a tone value. The contract, the prompt,
  the answer key and the UI all change with it.
- The learner model gains task-type tracks alongside skills. Next-scenario choice can target
  either.
- Every scenario needs a task type and a checklist; `scenarios.test.ts` should enforce it.
- [ADR 0001](0001-text-in-meaning-graded.md)'s "reports each grammar or vocabulary skill"
  now means grammar skills only.
