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
