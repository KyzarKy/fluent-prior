# 0010. Test whether a model we train ourselves can grade two skills

**Status:** tested, 2026-11-22: **no-go** by the bar set before training (it invented 9
mistakes; the stop line was 8). Changes nothing in the app. See the log at the end.

## Context

Every grade calls gpt-oss-120b on Groq (ADR 0004), with gpt-oss-20b as the backup
([ADR 0009](0009-backup-grader.md)). That works, but its limits come from the provider:

- **Quota:** 65 to 70 grades a day for 120b, about 59 for 20b, shared with eval runs.
- **Prompt injection:** 20b lets about 1 injection in 5 through (ADR 0009).
- **Noise:** re-grading 19 unchanged answers moved grammar F0.5 from 89% to 86%.
- **Hard yes or no:** the grader says a mistake is there or not. The learner model
  ([ADR 0002](0002-learner-model.md)) could use a probability, but gets a flag.

Part of the grade is classification: which skills have a mistake, which task parts are
there, and the tone. A small model trained for that would be ours: it runs on a CPU, has no
quota, gives the same answer every time, takes no instructions, and gives a probability.
The writing part (feedback and the better version) is harder to replace, and this test
leaves it alone.

What the research says (checked 2026-11-21):

- **Taggers beat small rewriting models at grammar.** GECToR, a sequence tagger, scores
  65 to 73 F0.5 on BEA-2019 ([Omelianchuk et al., 2020](https://arxiv.org/abs/2005.12592)).
  A 3B Qwen fine-tuned to rewrite scored 53 on BEA-dev
  ([model card](https://huggingface.co/amiya/qwen2.5-3b-gec-v2)).
- **Public learner data is off limits.** The Cambridge corpora (FCE, Write & Improve) are
  for non-commercial use, and models built from Write & Improve 2024 need Cambridge's
  approval before release
  ([CUP&A](https://researchdatasets.cambridge.org/datasets/write-and-improve-corpus-2024)).
- **Synthetic errors work.** Adding errors of a chosen type to correct sentences ("tagged
  corruption") improved results on BEA-2019 and CoNLL-2014
  ([Stahlberg and Kumar, 2021](https://arxiv.org/abs/2105.13318)). Because code adds the
  errors, every label is known exactly. The known risk: made-up errors don't look the same
  as real learners' errors ([BEA 2026](https://aclanthology.org/2026.bea-1.32.pdf)), and
  only a real answer key can show the size of that gap.

One cheap test can show whether this direction is worth a month: two skills, one small
model, and Ky's answer key as the judge.

## Decision

Train a small token classifier on synthetic answers for **articles** and **regular past
tense (-ed)**, then score it on the answer key against 120b's existing results. It takes
two working days at most, costs $0, and uses no Groq quota.

### Why these two skills

- They have the most mistakes in the key: 14 for articles, 13 for past-regular.
- Both are "faint" skills (ADR 0002), so a probability would help the learner model most
  for these two.
- Articles is where 120b invents the most: 3 of its 10 invented mistakes. A tagger trained
  on known labels might do better there.
- Code can corrupt both safely: deleting or swapping a/an/the, or turning "cleaned" into
  "clean", reliably makes a mistake of that skill.

### Data

1. **Correct answers.** Claude writes about 150 correct answers for each of the 19
   scenarios, about 2,850 in all. They vary in completeness and vocabulary, and they look
   dictated: lowercase, little punctuation. The writer is never shown the answer key. Any
   answer that shares five words in a row with a key answer is dropped, so the test can't
   measure memorization (the same rule as for prompt examples).
2. **Corruption by code** (Python with spaCy):
   - articles: delete a/an before a singular noun, delete the before a singular noun,
     swap a and an, or put a before a plural noun. Swapping a for the is left out: it
     often leaves a correct sentence, which would be a wrong label;
   - past-regular: turn a regular past form (lemma + -ed) back into its lemma, as a past
     verb or after have. Passives are skipped, since "was cleaned" to "was clean" is still
     correct;
   - other skills, labeled as no mistake: drop a form of be, swap in/on/at, drop a
     third-person -s, make a plural singular, and turn an irregular past back into its
     lemma ("found" to "find"), so the model learns that not every error is one of its
     two, and that past-irregular isn't past-regular.

   Most answers are also lowercased and stripped of punctuation, as dictation leaves
   them.

   About 40% of examples keep no target error. One answer can have more than one error.
3. **Labels.** Each word gets two yes-or-no labels: an articles mistake, a past-regular
   mistake. A deleted word is marked on the word after the gap, as GECToR does.
4. **Splits.** Three whole scenarios are held out as the synthetic test set, which shows
   whether the model carries over to scenarios it never trained on. The rest split 90/10
   into train and dev.

### Model

DeBERTa-v3-small (MIT license), fine-tuned for token classification with Hugging Face
Transformers on Ky's laptop GPU (RTX 3050, 4 GB), with a free Colab GPU as the fallback.
A skill counts as flagged in an answer when any word's probability for it passes a
threshold. The threshold is chosen on the synthetic dev set,
never on the key.

### Scoring

- **First, a sanity check.** On the held-out synthetic scenarios, answer-level F0.5 must
  reach 90% for each skill. If it doesn't, training is broken: fix it before touching the
  key.
- **Then the key, once.** Predictions go into `lab/own-grader/results/` in the results
  format the eval uses, with only the mistakes filled in. They stay out of
  `evals/results/`, where `npm run eval` would try to resume them with Groq. A new
  `evals/skill-report.ts` prints caught, missed and invented for chosen skills across
  results files, counted only on answers every file has. It uses `compareSkills` from
  `evals/scoring.ts`, so the counting rules are the same as the eval's.
- **The comparison is the 62 answers in 120b's 2026-10-05T0159 run.** On those, for the two
  skills together, 120b caught 12, missed 0 and invented 4 (precision 75%, recall 100%,
  F0.5 79%). The model is also scored on all 77 answers, for reference.

### The bar, set before training

On the 62 answers, the two skills together:

| Result | Meaning |
|---|---|
| Catches at least 10 of 12 and invents at most 4 | **Go:** propose the full build |
| Catches 8 or fewer, or invents 8 or more | **No-go:** record the result and stop |
| Anything between | **Ky's call,** likely after grading more answers for these skills |

Twelve mistakes is a small sample: the 95% interval on "10 of 12" runs from about 55% to
95%. So this test can only show that the gap is small or that it's large. It can't show
the model is better. That's the reason for a wide middle band.

The key is used once. Any change after the first scoring makes a new results file, and this
ADR records how many times the key was used. Tuning against 12 mistakes would only fit the
model to those 12.

### Where it lives

The code goes in `lab/own-grader/`: a README, `requirements.txt`, and scripts to make data,
corrupt it, train, and predict. The app never imports it and it isn't deployed. Synthetic
data is committed (a few MB of JSONL). Model weights are not committed: `lab/**/model/`
goes in `.gitignore`.

### Not in this test

The other 10 skills, correct uses, task parts, tone, feedback, the better version, hosting
(ONNX on Vercel or in the browser), and any change to `src/`.

## Why

- It answers the question that decides everything else: does a model trained on made-up
  errors catch real learners' mistakes? If that fails, nothing built on top of it matters.
- It costs two days, not the month the full version would.
- The key, the scoring rules and 120b's results already exist, so the only new code is the
  experiment itself.
- Whatever the result, it's an interview story with a number in it: data made by code, a
  held-out test, a bar set before the run, and a decision rule.

## Consequences

- **Go:** a new ADR proposes the full build: all 12 skills and correct uses, then tone and
  task parts, then hosting. Feedback and the better version stay with the LLM or come from
  a template, decided then.
- **No-go:** this ADR is marked rejected, with the numbers. The synthetic data and
  `skill-report.ts` are still useful: the data can test prompts, and the report compares
  any two graders by skill.
- **Python joins a TypeScript repo,** in `lab/` only. CLAUDE.md's commands table gains a
  line for the lab, and Biome ignores it.

## Decided by Ky, 2026-11-21

1. **Claude writes the correct answers.** Ky checked Anthropic's terms on using Claude's
   output to train a model and found this use allowed. Claude subagents write them, one
   scenario each, so no single context holds all 2,850.
2. **The code goes in `lab/` in this repo.**
3. **Articles and past-regular,** as proposed.

## Log

**2026-11-21, data.** 19 Sonnet subagents wrote 150 correct answers each. The first run
let them keep scratch files in one shared folder, and parallel writers overwrote each
other's drafts: 8 of 19 files ended up mostly holding other scenarios' answers under the
wrong scenarioId. Their own checks passed, because they checked only the count and the
JSON. `lab/own-grader/check-clean.mjs` now also checks that each answer shares words with
its own scenario; the 8 files were rewritten with the Write tool only, and all 19 pass.
486 of 2,850 answers (17%) were dropped for sharing five words in a row with the key,
mostly fact phrases like "lamp in room 214".

**2026-11-21, training run 1.** 3,606 training examples, 4 epochs, 2.5 minutes on the RTX
3050. Transformers 5 loads this checkpoint as float16, which turned every weight to NaN
after the first AdamW step; `train.py` now loads it as float32. Held-out scenarios:

| Skill | Caught | Missed | Invented | F0.5 |
|---|---|---|---|---|
| articles | 346 | 59 | 7 | 95% |
| past-regular | 41 | 1 | 21 | 71% |

**Past-regular failed the sanity check.** All 21 invented flags were correct present-tense
or noun uses of common verbs ("we check it at 2 p.m."). The answers mostly reported the
past, so the model rarely saw those verbs used correctly in the present, and learned to
flag their base form. The fix was more data, not tuning: one writer added 300 present-tense
answers about routines, avoiding the held-out topics (the supplement section of
`lab/own-grader/WRITER-BRIEF.md`). This means the held-out set has now steered one data
change, so it's a slightly weaker test than before.

**2026-11-21, training run 2.** 4,146 training examples. Held-out scenarios:

| Skill | Caught | Missed | Invented | F0.5 |
|---|---|---|---|---|
| articles | 344 | 61 | 7 | 95% |
| past-regular | 39 | 3 | 6 | 88% |

Past-regular is 2 points under the 90% bar. Of its 6 invented flags, 2 are real mistakes
filed under the wrong skill ("what each person eat", and a dropped "is" next to the noun
"check"), 1 is ambiguous, and 3 are correct second-person instructions after a past-tense
sentence ("you check it at 2 p.m."). Whether that counts as passing is Ky's call; the key
hasn't been used.
Ky decided to count it as passing (2026-11-21): the misses are explained, which is what
the sanity check is for, and another fix would tune the model to the held-out set.

**2026-11-22, the key, scored once** (`lab/own-grader/results/2026-11-23T0014-own-grader.json`). On the 62
answers in 120b's run:

| | Caught (of 12) | Missed | Invented | F0.5 |
|---|---|---|---|---|
| gpt-oss-120b | 12 | 0 | 4 | 79% |
| Own model | 11 | 1 | 9 | 60% |
| By skill: articles | 7 | 0 | 8 | 52% |
| By skill: past-regular | 4 | 1 | 1 | 80% |

On all 77 answers: 17 caught, 1 missed, 12 invented. **No-go: it catches enough (11 of 12,
over the bar of 10) but invents 9, past the stop line of 8.**

Past-regular nearly matches 120b. Articles is where it fails, and the invented flags have a
pattern: most sit next to a different mistake the model never saw as a decoy in training.

- A missing possessive -s ("today special", "ms park phone", "the chef special") reads as a
  missing article: 5 flags, one of them on "the chefs special", which the key counts as
  correct.
- Mistakes the key files under no skill ("for disturb you", "if is more", "the card of
  credit"): 3 flags.
- "wait hear" (a dictation homophone), "one for leo", and "about AC" (arguably a missing
  "the"): 1 each.

The decoy errors in `examples.py` covered be, prepositions, third-person -s, plurals and
irregular past, but not possessive -s or mistakes outside the catalog, so the model learned
that anything wrong next to a noun is an article.

**What this shows.** Synthetic data transferred to real answers for past-regular, and for
catching article mistakes (11 of 11 on all 77 answers). It didn't transfer for telling an
article mistake from the mistakes around it. A second attempt would add possessive and
word-order decoys and score a new results file, and this log would record it as the key's
second use.
