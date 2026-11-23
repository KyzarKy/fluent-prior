# Brief for the answer writers

Each Claude subagent that writes correct answers for ADR 0010 gets this brief and one
scenario from `data/scenarios.json`. It's kept here so anyone can see how the training data
was made.

## The job

Write 150 different answers to one scenario, as an intermediate English learner who works
in a hotel, resort or restaurant would say them out loud to the listener named in the
scenario. Every answer must be **grammatically correct American English**. Code adds the
mistakes later, so a mistake you write by accident becomes a wrong label.

## Rules

- **Correct grammar, every word.** Every article (a, an, the) where English needs one, and
  every verb in the right form and tense. No dropped words and no telegraphic notes: write
  "The towels in the closet are wet," never "towels closet wet".
- **Simple and real.** Intermediate learners: short sentences, everyday words, the
  occasional "um" is not needed. Some answers are one sentence, some are three or four. Aim
  for 5 to 45 words, spread out across that range.
- **Vary everything.** Different openings, different word order, different verbs, different
  amounts of detail. No two answers alike. Don't reuse the situation's wording more than
  the facts need.
- **Use past tense where it's natural.** When the answer reports what happened, use past
  verbs, many of them regular -ed verbs (checked, noticed, called, cleaned, asked, finished,
  fixed, looked, moved, turned). Don't force it where the present or future is right.
- **Use nouns with articles naturally:** a lamp, the guest, an hour, the kitchen.
- **Completeness varies.** About two thirds do every part of the task. The rest do only
  some of it, as a real learner sometimes would. Never refuse, never misstate the facts on
  screen.
- **Tone varies.** Mostly polite, some neutral, a few too direct, as real coworkers are.
- Write with normal capitals and punctuation. Code makes some answers look dictated.

## Never

- Never open or read anything in `evals/`, `src/`, or any other file except the scenario
  given and this brief. The answer key must stay unseen by anything that makes training
  data.
- Never include instructions, notes, numbering, or commentary in an answer.

## Output

Write the file named in your task, one JSON object per line, nothing else:

```
{"scenarioId": "<the scenario's id>", "answer": "<one answer>"}
```

Use only the Write tool for the file: no shell commands that write files, and no scratch
files anywhere. Write the first 50 answers, then write the file again with 100, then again
with all 150, so each batch gets fresh thought. (The first run used scratch files in a
shared folder, and parallel writers overwrote each other's drafts.)

Then run `node lab/own-grader/check-clean.mjs <scenario id>` from the repo root. It checks
the count, the JSON, repeats, and that the answers are about your scenario. Fix anything
it reports, run it again, and reply with its output.

## Supplement: routines in the present tense

Added after the first training run, which failed its sanity check on past-regular: the
answers above mostly report what happened, so the model rarely saw "check", "notice" or
"clean" used correctly in the present, and learned to flag them. The supplement writer
follows every rule above, except:

- 300 answers, written to `data/supplement/routines.jsonl` with scenarioId "routines".
- No scenario: each answer is something a hotel or restaurant worker says about how work
  is done: routines, instructions, habits, schedules, polite requests, and questions
  ("We clean the rooms on this floor every morning", "Can you check the order for me?").
- Use regular verbs in their base or -s form where that's correct: check, notice, look,
  finish, stop, call, clean, ask, change, fix, turn, count, start, walk, help, wash, open,
  close, prepare, order, deliver, fill, wipe, label, carry.
- Use "check" as a noun sometimes too (a guest's check, the check-in desk).
- Leave out three topics, which are the held-out test scenarios: cooler or fridge
  temperature checks, noise complaints or room changes, and splitting a table's checks.
- The checker doesn't apply (it knows only the scenarios). Check the file yourself:
  exactly 300 lines, each valid JSON with scenarioId "routines", no repeats.
