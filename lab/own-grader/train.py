"""Fine-tunes DeBERTa-v3-small to mark articles and past-regular mistakes word by word
(ADR 0010), picks each skill's threshold on the dev set, and reports the held-out
scenarios. Never reads the answer key.

    .venv/Scripts/python train.py

Writes model/ (weights, tokenizer, thresholds.json). Weights aren't committed.
"""

import json
import random
from pathlib import Path

import torch
from transformers import AutoModelForTokenClassification, AutoTokenizer

from examples import SKILLS

HERE = Path(__file__).parent
BASE = "microsoft/deberta-v3-small"
MAX_TOKENS = 128
BATCH = 32
EPOCHS = 4
LEARNING_RATE = 5e-5
SEED = 10

torch.manual_seed(SEED)
random.seed(SEED)
device = "cuda" if torch.cuda.is_available() else "cpu"
tokenizer = AutoTokenizer.from_pretrained(BASE)


def encode(words: list[str]):
    return tokenizer(words, is_split_into_words=True, truncation=True, max_length=MAX_TOKENS)


def word_probabilities(model, batch_words: list[list[str]]) -> list[list[list[float]]]:
    """Per word, the probability of each skill's mistake, read from the word's first piece."""
    enc = tokenizer(
        batch_words,
        is_split_into_words=True,
        truncation=True,
        max_length=MAX_TOKENS,
        padding=True,
        return_tensors="pt",
    ).to(device)
    with torch.no_grad(), torch.autocast(device, dtype=torch.bfloat16, enabled=device == "cuda"):
        probs = torch.sigmoid(model(**enc).logits.float()).cpu()
    out = []
    for b in range(len(batch_words)):
        per_word, seen = [], set()
        for t, w in enumerate(enc.word_ids(b)):
            if w is not None and w not in seen:
                seen.add(w)
                per_word.append(probs[b, t].tolist())
        out.append(per_word)
    return out


def answer_scores(model, rows) -> list[list[float]]:
    """Per answer, each skill's highest word probability: the chance the answer has one."""
    scores = []
    for i in range(0, len(rows), 64):
        for words in word_probabilities(model, [r["words"] for r in rows[i : i + 64]]):
            scores.append([max((w[k] for w in words), default=0.0) for k in range(len(SKILLS))])
    return scores


def f05(caught: int, missed: int, invented: int) -> tuple[float, float, float]:
    precision = caught / (caught + invented) if caught + invented else 1.0
    recall = caught / (caught + missed) if caught + missed else 1.0
    f = 1.25 * precision * recall / (0.25 * precision + recall) if precision + recall else 0.0
    return precision, recall, f


def answer_counts(scores, rows, k: int, threshold: float) -> tuple[int, int, int]:
    caught = missed = invented = 0
    for score, row in zip(scores, rows):
        truth = any(label[k] for label in row["labels"])
        flagged = score[k] > threshold
        caught += truth and flagged
        missed += truth and not flagged
        invented += flagged and not truth
    return caught, missed, invented


def batches(rows):
    order = rows[:]
    random.shuffle(order)
    for i in range(0, len(order), BATCH):
        chunk = order[i : i + BATCH]
        encs = [encode(r["words"]) for r in chunk]
        width = max(len(e["input_ids"]) for e in encs)
        ids = torch.full((len(chunk), width), tokenizer.pad_token_id)
        mask = torch.zeros((len(chunk), width), dtype=torch.long)
        labels = torch.zeros((len(chunk), width, len(SKILLS)))
        scored = torch.zeros((len(chunk), width), dtype=torch.bool)
        for b, (enc, row) in enumerate(zip(encs, chunk)):
            n = len(enc["input_ids"])
            ids[b, :n] = torch.tensor(enc["input_ids"])
            mask[b, :n] = 1
            seen = set()
            for t, w in enumerate(enc.word_ids()):
                # Only a word's first piece is trained, matching how it's read back.
                if w is not None and w not in seen:
                    seen.add(w)
                    labels[b, t] = torch.tensor(row["labels"][w], dtype=torch.float)
                    scored[b, t] = True
        yield ids.to(device), mask.to(device), labels.to(device), scored.to(device)


def main():
    rows = [json.loads(line) for line in (HERE / "data" / "examples.jsonl").open(encoding="utf8")]
    split = {s: [r for r in rows if r["split"] == s] for s in ("train", "dev", "test")}
    print({s: len(v) for s, v in split.items()}, "on", device)

    # Transformers 5 loads this checkpoint as float16 by default, where AdamW's epsilon
    # rounds to zero and the first step turns every weight to NaN. Train in float32.
    model = AutoModelForTokenClassification.from_pretrained(
        BASE, num_labels=len(SKILLS), dtype=torch.float32
    )
    model.to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=0.01)
    steps = EPOCHS * -(-len(split["train"]) // BATCH)
    schedule = torch.optim.lr_scheduler.OneCycleLR(
        optimizer, max_lr=LEARNING_RATE, total_steps=steps, pct_start=0.1
    )
    loss_fn = torch.nn.BCEWithLogitsLoss()

    for epoch in range(EPOCHS):
        model.train()
        total = 0.0
        for ids, mask, labels, scored in batches(split["train"]):
            with torch.autocast(device, dtype=torch.bfloat16, enabled=device == "cuda"):
                logits = model(input_ids=ids, attention_mask=mask).logits
            loss = loss_fn(logits.float()[scored], labels[scored])
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            schedule.step()
            optimizer.zero_grad()
            total += loss.item()
        print(f"epoch {epoch + 1}: train loss {total:.2f}")

    model.eval()
    dev_scores = answer_scores(model, split["dev"])
    test_scores = answer_scores(model, split["test"])
    thresholds = {}
    for k, skill in enumerate(SKILLS):
        # Chosen on dev only. The answer key never sets a threshold (ADR 0010).
        grid = [t / 100 for t in range(5, 96)]
        best = max(grid, key=lambda t: f05(*answer_counts(dev_scores, split["dev"], k, t))[2])
        thresholds[skill] = best
        for name, scores, part in (("dev", dev_scores, split["dev"]), ("test", test_scores, split["test"])):
            counts = answer_counts(scores, part, k, best)
            p, r, f = f05(*counts)
            print(
                f"{skill:13} {name:4} threshold {best:.2f}  caught {counts[0]}, missed "
                f"{counts[1]}, invented {counts[2]}  P {p:.0%} R {r:.0%} F0.5 {f:.0%}"
            )

    out = HERE / "model"
    model.save_pretrained(out)
    tokenizer.save_pretrained(out)
    (out / "thresholds.json").write_text(json.dumps(thresholds, indent=2) + "\n")
    print(f"saved to {out}")


if __name__ == "__main__":
    main()
