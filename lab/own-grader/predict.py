"""Grades the answer key's articles and past-regular with the trained model (ADR 0010).

The key is scored once: every run writes a new results file, and ADR 0010 records each use.

    .venv/Scripts/python predict.py

Writes results/<time>-own-grader.json in the shape evals/skill-report.ts reads. Only the
mistakes are filled in; quote is the word the model marked, fix is empty.
"""

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from transformers import AutoModelForTokenClassification

import train
from examples import KEY, SKILLS

HERE = Path(__file__).parent


def main():
    model_dir = HERE / "model"
    model = AutoModelForTokenClassification.from_pretrained(model_dir).to(train.device).eval()
    thresholds = json.loads((model_dir / "thresholds.json").read_text())
    entries = json.loads(KEY.read_text(encoding="utf8"))["answers"]

    results = {}
    for entry in entries:
        words = entry["answer"].split()
        probs = train.word_probabilities(model, [words])[0]
        mistakes, highest = [], {}
        for k, skill in enumerate(SKILLS):
            best = max(range(len(probs)), key=lambda w: probs[w][k])
            highest[skill] = round(probs[best][k], 4)
            if probs[best][k] > thresholds[skill]:
                mistakes.append({"skill": skill, "quote": words[best], "fix": ""})
        results[str(entry["id"])] = {
            "ok": True,
            "grade": {"mistakes": mistakes, "correctUses": []},
            "probabilities": highest,
        }

    commit = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True
    ).stdout.strip()
    started = datetime.now(timezone.utc)
    out = HERE / "results" / f"{started:%Y-%m-%dT%H%M}-own-grader.json"
    out.parent.mkdir(exist_ok=True)
    body = {
        "model": "own-grader (deberta-v3-small)",
        "commit": commit,
        "startedAt": started.isoformat(),
        "skills": SKILLS,
        "thresholds": thresholds,
        "results": results,
    }
    out.write_text(json.dumps(body, indent=2) + "\n", encoding="utf8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
