// Checks data/clean/ files: 150 lines of valid JSON, the right scenarioId, no repeats inside a
// file or across files, and that each answer is about its own scenario. The last check
// exists because parallel writers once overwrote each other's drafts (ADR 0010): an answer
// counts against its file when it shares no words with its own scenario's situation and
// task but two or more with another's.
//
//   node lab/own-grader/check-clean.mjs [scenario id ...]     (default: every file)

import { readdirSync, readFileSync } from "node:fs";

const dir = "lab/own-grader/data/clean";
const scenarios = JSON.parse(readFileSync("lab/own-grader/data/scenarios.json", "utf8"));
const STOP = new Set(
  "the and you are can for your this that will with have now just was our what when where how they them their its not from about any all one".split(
    " ",
  ),
);
const words = (text) =>
  (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(ing|ed|es|s)$/, ""));
const vocab = new Map(
  scenarios.map((s) => [s.id, new Set(words([s.situation, s.task, ...s.taskParts].join(" ")))]),
);
/** True when the answer shares no words with its own scenario but two or more with another. */
const looksElsewhere = (answer, id) => {
  const own = words(answer).filter((w) => vocab.get(id)?.has(w)).length;
  if (own > 0) return false;
  return [...vocab].some(
    ([other, set]) => other !== id && words(answer).filter((w) => set.has(w)).length >= 2,
  );
};

const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
const wanted = process.argv.length > 2 ? new Set(process.argv.slice(2)) : null;
const owner = new Map();
let failed = false;
for (const file of files) {
  const id = file.replace(".jsonl", "");
  const lines = readFileSync(`${dir}/${file}`, "utf8").split("\n").filter(Boolean);
  const problems = [];
  const seen = new Set();
  let elsewhere = 0;
  for (const [n, line] of lines.entries()) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      problems.push(`line ${n + 1} is not JSON`);
      continue;
    }
    if (row.scenarioId !== id) problems.push(`line ${n + 1} has scenarioId ${row.scenarioId}`);
    const key = row.answer.toLowerCase().trim();
    if (seen.has(key)) problems.push(`line ${n + 1} repeats an earlier answer`);
    seen.add(key);
    if (owner.has(key) && owner.get(key) !== id)
      problems.push(`line ${n + 1} is also in ${owner.get(key)}`);
    owner.set(key, id);
    if (looksElsewhere(row.answer, id)) elsewhere++;
  }
  if (lines.length !== 150) problems.push(`${lines.length} lines, not 150`);
  // A short answer can miss its scenario's words by chance, so allow a few.
  if (elsewhere > 10) problems.push(`${elsewhere} answers look like another scenario's`);
  if (wanted && !wanted.has(id)) continue;
  failed ||= problems.length > 0;
  console.log(
    `${id}: ${problems.length ? problems.slice(0, 5).join("; ") : "ok"} (${elsewhere} near another scenario)`,
  );
}
process.exit(failed ? 1 : 0);
