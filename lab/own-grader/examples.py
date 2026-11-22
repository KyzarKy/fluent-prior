"""Turns correct answers into labeled training examples by adding errors with code (ADR 0010).

Reads data/clean/*.jsonl and data/supplement/*.jsonl (one {"scenarioId", "answer"} per
line), writes data/examples.jsonl:
one {"scenarioId", "split", "words", "labels"} per line, where labels[i] is [articles,
past_regular] for words[i], each 0 or 1.

Because code adds every error, the labels are exact. The rules only make changes that are
wrong in any context; a change that can leave a correct sentence (a -> the, was cleaned ->
was clean) is skipped, since it would be a wrong label.

    .venv/Scripts/python examples.py
"""

import json
import random
import re
from pathlib import Path

import spacy

HERE = Path(__file__).parent
KEY = HERE.parent.parent / "evals" / "grader-set.json"
SKILLS = ["articles", "past-regular"]
ART, PAST = 0, 1

# Whole scenarios held out as the synthetic test set: does the model carry over to a
# scenario it never trained on? Picked by hand to mix roles and listeners.
TEST_SCENARIOS = {"noisy-room", "cooler-check", "separate-checks"}
VARIANTS_PER_ANSWER = 2
rng = random.Random(10)
nlp = spacy.load("en_core_web_sm")


def key_five_grams() -> set[tuple[str, ...]]:
    """Five-word runs in the answer key. Only used to drop training answers that overlap it."""
    grams = set()
    for entry in json.loads(KEY.read_text(encoding="utf8"))["answers"]:
        words = re.findall(r"[a-z0-9']+", entry["answer"].lower())
        grams.update(tuple(words[i : i + 5]) for i in range(len(words) - 4))
    return grams


class Draft:
    """An answer as spaCy tokens that can be edited, each carrying its own labels."""

    def __init__(self, doc):
        self.doc = doc
        # One entry per output token: [text, trailing space, labels]. None = deleted.
        self.tokens = [[t.text, t.whitespace_, [0, 0]] for t in doc]

    def mark(self, i: int, skill: int):
        """Marks token i, or the next surviving token for a deletion at the end."""
        for j in list(range(i, len(self.tokens))) + list(range(i - 1, -1, -1)):
            if self.tokens[j] is not None:
                self.tokens[j][2][skill] = 1
                return

    def delete(self, i: int, skill: int | None):
        self.tokens[i] = None
        if skill is not None:
            self.mark(i + 1, skill)

    def replace(self, i: int, text: str, skill: int | None):
        self.tokens[i][0] = text
        if skill is not None:
            self.tokens[i][2][skill] = 1

    def insert_before(self, i: int, text: str, skill: int):
        self.tokens[i][0] = f"{text} {self.tokens[i][0]}"
        self.tokens[i][2][skill] = 1

    def touched(self, i: int) -> bool:
        return self.tokens[i] is None or self.tokens[i][0] != self.doc[i].text

    def words(self) -> tuple[list[str], list[list[int]]]:
        """Whitespace words and their labels: a word is marked if any of its tokens is."""
        words, labels = [], []
        joined = True
        for token in self.tokens:
            if token is None:
                continue
            text, space, label = token
            for k, piece in enumerate(text.split(" ")):
                if joined and words and k == 0:
                    words[-1] += piece
                    labels[-1] = [max(a, b) for a, b in zip(labels[-1], label)]
                else:
                    words.append(piece)
                    labels.append(list(label))
            joined = space == ""
        return words, labels


def is_regular_past(token) -> bool:
    lemma, word = token.lemma_.lower(), token.lower_
    return word.endswith("ed") and word in {
        lemma + "ed",
        lemma + "d",
        lemma[:-1] + "ied",
        lemma + lemma[-1:] + "ed",
    }


# Each rule finds the tokens it may change and returns edits. Target rules carry a skill.
def article_options(doc):
    for t in doc:
        if t.dep_ != "det" or t.head.tag_ != "NN":
            # Plural or proper heads ("the towels" -> "towels") can stay correct.
            continue
        if t.lower_ in ("a", "an"):
            yield ("delete", t.i, ART)
            swapped = "an" if t.lower_ == "a" else "a"
            yield ("replace", t.i, swapped, ART)
        elif t.lower_ == "the":
            yield ("delete", t.i, ART)
    for t in doc:
        bare_plural = t.tag_ == "NNS" and not any(
            c.dep_ in ("det", "nummod", "poss") or c.tag_ == "CD" for c in t.children
        )
        if bare_plural and t.left_edge.i > 0 and doc[t.left_edge.i - 1].lower_ not in ("of",):
            yield ("insert", t.left_edge.i, "a", ART)


def past_options(doc):
    for t in doc:
        if not is_regular_past(t):
            continue
        after_have = t.tag_ == "VBN" and any(
            c.dep_ == "aux" and c.lemma_ == "have" for c in t.children
        )
        if t.tag_ == "VBD" or after_have:
            yield ("replace", t.i, t.lemma_.lower(), PAST)


PREPOSITIONS = ["in", "on", "at"]


def noise_options(doc):
    """Errors in other skills. The model must learn they aren't articles or past-regular."""
    for t in doc:
        if t.lemma_ == "be" and t.lower_ in ("is", "are", "am", "'s", "'re", "'m"):
            yield ("delete", t.i, None)
        elif t.tag_ == "VBZ" and t.lower_.endswith("s") and t.lemma_ not in ("be", "have", "do"):
            yield ("replace", t.i, t.lemma_.lower(), None)
        elif t.lower_ in PREPOSITIONS and t.dep_ == "prep":
            yield ("replace", t.i, rng.choice([p for p in PREPOSITIONS if p != t.lower_]), None)
        elif t.tag_ == "NNS" and t.lemma_.lower() != t.lower_:
            yield ("replace", t.i, t.lemma_.lower(), None)
        elif t.tag_ == "VBD" and not is_regular_past(t) and t.lemma_ not in ("be", "have", "do"):
            yield ("replace", t.i, t.lemma_.lower(), None)


def apply(draft: Draft, option) -> bool:
    kind, i = option[0], option[1]
    if draft.touched(i):
        return False
    if kind == "delete":
        draft.delete(i, option[2])
    elif kind == "replace":
        draft.replace(i, option[2], option[3])
    else:
        draft.insert_before(i, option[2], option[3])
    return True


def corrupt(doc) -> tuple[list[str], list[list[int]]]:
    draft = Draft(doc)
    # About 40% of examples keep no target error (ADR 0010).
    targets = rng.choices([0, 1, 2], weights=[40, 45, 15])[0]
    pools = [list(article_options(doc)), list(past_options(doc))]
    for _ in range(targets):
        pool = rng.choice([p for p in pools if p] or [[]])
        if pool:
            apply(draft, rng.choice(pool))
    noise = list(noise_options(doc))
    for _ in range(rng.choices([0, 1, 2], weights=[50, 35, 15])[0]):
        if noise:
            apply(draft, rng.choice(noise))
    words, labels = draft.words()
    return dictate(words), labels


def dictate(words: list[str]) -> list[str]:
    """Most key answers are lowercase with little punctuation, as dictation leaves them."""
    if rng.random() < 0.7:
        words = [w.lower() for w in words]
    if rng.random() < 0.6:
        stripped = [re.sub(r"[.,!?;:]+$", "", w) for w in words]
        words = [w if w else orig for w, orig in zip(stripped, words)]
    return words


def main():
    grams = key_five_grams()
    rows, dropped = [], 0
    paths = sorted((HERE / "data" / "clean").glob("*.jsonl"))
    # Present-tense routines, added after the first sanity check failed (WRITER-BRIEF.md).
    paths += sorted((HERE / "data" / "supplement").glob("*.jsonl"))
    for path in paths:
        for line in path.read_text(encoding="utf8").splitlines():
            if not line.strip():
                continue
            row = json.loads(line)
            words = re.findall(r"[a-z0-9']+", row["answer"].lower())
            if any(tuple(words[i : i + 5]) in grams for i in range(len(words) - 4)):
                dropped += 1
                continue
            rows.append(row)

    out = []
    for row, doc in zip(rows, nlp.pipe(r["answer"] for r in rows)):
        scenario = row["scenarioId"]
        if scenario in TEST_SCENARIOS:
            split = "test"
        else:
            split = "dev" if rng.random() < 0.1 else "train"
        for _ in range(VARIANTS_PER_ANSWER):
            words, labels = corrupt(doc)
            out.append({"scenarioId": scenario, "split": split, "words": words, "labels": labels})

    path = HERE / "data" / "examples.jsonl"
    path.write_text("".join(json.dumps(r) + "\n" for r in out), encoding="utf8")
    counts = {s: sum(r["split"] == s for r in out) for s in ("train", "dev", "test")}
    with_error = [sum(any(l[k] for l in r["labels"]) for r in out) for k in (ART, PAST)]
    print(f"{len(rows)} answers kept, {dropped} dropped for overlapping the key")
    print(f"{len(out)} examples: {counts}")
    print(f"with an articles error: {with_error[0]}, with a past-regular error: {with_error[1]}")


if __name__ == "__main__":
    main()
