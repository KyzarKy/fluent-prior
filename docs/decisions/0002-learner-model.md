# 0002. Learner model: knowledge tracing, weighted by what dictation can hear

**Status:** accepted, 2026-09-26. The parameter values are starting guesses, to be tuned.

## Context

The app needs a model of what the learner knows, to choose what to practice next and,
later, to show a tutor. Bayesian Knowledge Tracing (Corbett & Anderson, 1995) is the
standard model in education research. Each skill is a hidden state, known or not known,
with four parameters:

| Parameter | Meaning | Start |
|---|---|---|
| `init` | P(known) before any evidence | 0.3 |
| `learn` | P(not known → known) after each practice | 0.1 |
| `slip` | P(wrong answer \| known) | 0.1 |
| `guess` | P(right answer \| not known) | 0.2 |

Dictation adds a complication ([ADR 0001](0001-text-in-meaning-graded.md)). Some skills
sound clearly different when wrong: "I go" versus "I went", word order, vocabulary. Others
turn on a tiny sound: the *-s* in "goes", the *-ed* in "walked", "a" versus "the". For
those, the recognizer's fluent-speech prior often hides the learner's error.

## Decision

**Each skill in the catalog is marked `clear` or `faint`:** how well dictation preserves a
mistake in it.

**For faint skills, the recognizer is part of the observation model.** If the recognizer
keeps a small-sound error with probability `keep`, what we can observe is:

- P(visible error | known) = `slip` × `keep`
- P(visible error | not known) = (1 − `guess`) × `keep`

So a faint skill's effective parameters are:

- `slip'` = `slip` × `keep`
- `guess'` = 1 − (1 − `guess`) × `keep`

That's one number, `keep`, starting at 0.5. With the starting values, the evidence works
out like this:

| | Correct answer counts as | Error counts as |
|---|---|---|
| Clear skill | 4.5× evidence for known | 8× evidence for not known |
| Faint skill | 1.6× evidence for known | 8× evidence for not known |

An error is equally strong evidence either way, because it got through the recognizer. A
correct faint form counts for much less, because the recognizer might have supplied it.

**Every observation has a `source`.** v1 has one source, `app`, and treats every app answer
as possibly dictated. Later sources (`typed-drill`, `tutor`) get their own reliability:
`keep` = 1 for a drill the learner must type, and low slip and guess for a tutor who heard
the learner in person.

**Observations are an append-only log.** P(known) for each skill is computed by running
the log through the model in order. Nothing edits an observation.

**Next scenario:** the one whose target skills have the lowest average P(known), skipping
the last three scenarios seen.

**Storage:** the log lives in the browser's localStorage in v1. There are no accounts yet.

## Amendment, 2026-09-27: mixed answers

An answer can use a skill both correctly and incorrectly ("i **find** a broken lamp… somebody
**broke** it"). Until now any mistake made the whole observation wrong, so a mixed answer
counted the same as an all-wrong one. Now each observation's `outcome` is `right`, `wrong`
or `mixed`: at most one correct use and one mistake count per skill per answer. That's
still one practice opportunity, with one Bayes step and one learning step, but the
likelihood includes both uses:

- P(evidence | known) = (1 − `slip`)^right × `slip`^wrong
- P(evidence | not known) = `guess`^right × (1 − `guess`)^wrong

The cap is 1 of each because uses within one answer aren't independent: someone who says
"find" in one clause tends to repeat the pattern. Starting from 0.3 on a clear skill:

| Evidence in one answer | P(known) after |
|---|---|
| wrong | 0.15 |
| mixed | 0.27 |
| right | 0.69 |

A mixed answer is weak evidence either way. On a faint skill it still leans clearly toward
not known, because a visible error is strong evidence there and a correct form is weak.
Stored logs from before this amendment read `correct: true/false` as `right`/`wrong`.

## Why

- Deriving the faint parameters from one `keep` rate means the adjustment has a physical
  meaning that can be measured: dictate sentences with known errors and count how many
  survive.
- A log with sources means tutor feedback later is just another source. The model, and
  what it's computed from, don't change.
- The grader reports what it saw; code decides what it's worth. Weighting in the prompt
  would be unauditable and untestable.

## Consequences

- BKT has no forgetting. A skill practiced once in March still counts in June. Adding a
  decay term is on the roadmap.
- Clearing the browser loses progress, until accounts arrive with the tutor features.
- The starting values are guesses from the BKT literature's typical ranges, not fitted to
  data. The tests pin the behavior (the evidence ratios above), not the exact numbers.
