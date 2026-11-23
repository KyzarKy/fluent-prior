# Own grader: a two-skill test

Can a small model trained on made-up errors catch real learners' article and past-tense
(-ed) mistakes? [ADR 0010](../../docs/decisions/0010-own-grader-spike.md) has the plan and
the pass bar, set before training. Nothing here is used by the app.

## The steps

| Step | Command (from this folder) | Reads | Writes |
|---|---|---|---|
| 1. Export scenarios | `npx tsx lab/own-grader/export-scenarios.ts` (from the repo root) | `src/core/scenarios.ts` | `data/scenarios.json`, without the sample answers from the key |
| 2. Write correct answers | Claude subagents, one per scenario, following [WRITER-BRIEF.md](WRITER-BRIEF.md) | `data/scenarios.json` | `data/clean/<scenario>.jsonl` |
| 3. Add errors | `.venv/Scripts/python examples.py` | `data/clean/` | `data/examples.jsonl` |
| 4. Train | `.venv/Scripts/python train.py` | `data/examples.jsonl` | `model/` (not committed) |
| 5. Grade the key, once | `.venv/Scripts/python predict.py` | `model/`, the key | `results/<time>-own-grader.json` |
| 6. Compare | `npx tsx evals/skill-report.ts articles,past-regular <files>` (from the repo root) | results files | a table |

Only step 3 (to drop overlapping answers) and step 5 read the answer key. Training and
threshold choice never do.

## Setup

Python 3.12 and an NVIDIA GPU (it falls back to the CPU, slowly).

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cu128
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m spacy download en_core_web_sm
```

## Result of the first attempt

No-go by the bar in ADR 0010: on the key it caught 11 of 12 mistakes but invented 9
(gpt-oss-120b: 12 caught, 4 invented). Past-regular nearly matched 120b; articles failed.
The ADR's log has the numbers and the diagnosis.

## A second attempt

The article false flags sat next to mistakes the model never saw as decoys, so it learned
that anything wrong next to a noun is an article. The fix is more decoys, in
`noise_options` in `examples.py`. Decoys are errors in other skills, labeled as no mistake
for these two.

1. **Add decoys,** each one a change that is wrong in any context:
   - possessive -s: drop the `'s` after a name or noun ("Ms. Park's phone" to "Ms. Park
     phone", "today's special" to "today special");
   - "to" after tell or ask with a person ("tell the chef" to "tell to the chef");
   - a dropped subject before is ("if it is more" to "if is more");
   - a base verb after a preposition ("for disturbing you" to "for disturb you");
   - dictation homophones, which the key never counts (here to hear, there to their).

   Print a sample of examples with their labels and read it before training, as in the
   first attempt.
2. **Rebuild and retrain:** `python examples.py`, then `python train.py`. Keep the held-out
   scenarios and the 90% sanity bar. If a skill misses the bar, read its false flags and
   fix the data, never the threshold.
3. **Score the key once more:** `python predict.py` writes a new results file. Compare it
   with `npx tsx evals/skill-report.ts articles,past-regular
   evals/results/2026-10-05T0159-gpt-oss-120b.json <new file>` against the same bar
   (catch at least 10 of 12, invent at most 4 = go; catch 8 or fewer or invent 8 or more =
   no-go).
4. **Log it in ADR 0010** as the key's second use, with the numbers, whatever they are.

Rules that held up, and should keep holding:

- Nothing that makes training data or chooses a threshold reads `evals/`. Only the
  five-word overlap filter in `examples.py` and `predict.py` do.
- Parallel answer writers use the Write tool only, never shared scratch files, and every
  file passes `node lab/own-grader/check-clean.mjs` before training.
- `train.py` loads the base model as float32; Transformers 5 loads it as float16 by
  default, and AdamW then turns every weight to NaN.
