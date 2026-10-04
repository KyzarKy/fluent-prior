// Grades a few answers from Ky's key several times each, to check whether a prompt or
// checklist change helped. The grader samples, so the same answer can come out differently
// from one try to the next: a single try before and after can't tell a fix from luck.
//
//   npm run trial -- 11,34,39       3 tries each
//   npm run trial -- 11,34,39 5     5 tries each
//
// Prints every try, then a tally per answer. Saves nothing: put the tallies in the commit
// message of the change they measured.

import Groq from "groq-sdk";
import { createGroqGrader } from "../src/server/groq-grader";
import { answers, gradeEntry, PACE_MS, sleep } from "./grade";
import { compareSkills } from "./scoring";

const [idList, triesArg = "3"] = process.argv.slice(2);
if (!idList) throw new Error("Usage: npm run trial -- <id,id,...> [tries]");
const tries = Number(triesArg);

const rows = idList.split(",").map((id) => {
  const entry = answers.find((a) => String(a.id) === id);
  if (!entry?.ky) throw new Error(`No answer #${id} in evals/grader-set.json`);
  return {
    entry,
    ky: entry.ky,
    graded: 0,
    unusable: 0,
    taskAgree: 0,
    toneAgree: 0,
    missed: [] as string[],
    invented: [] as string[],
  };
});

const grader = createGroqGrader(new Groq());
let calls = 0;
trials: for (let round = 1; round <= tries; round++) {
  for (const row of rows) {
    if (calls++ > 0) await sleep(PACE_MS);
    const result = await gradeEntry(grader, row.entry);
    if (result === "daily quota") {
      console.log("Daily quota reached: the tally below is partial.");
      break trials;
    }
    row.graded++;
    const tag = `#${row.entry.id} try ${round}`;
    if (!result.ok) {
      row.unusable++;
      console.log(`${tag}: unusable (${result.reason})`);
      continue;
    }
    const { grade } = result;
    const comparison = compareSkills(
      row.ky.mistakes,
      grade.mistakes.map((m) => m.skill),
      grade.correctUses.map((u) => u.skill),
    );
    if (grade.taskMet === row.ky.taskMet) row.taskAgree++;
    if ([row.ky.tone, ...(row.ky.toneAlsoAccept ?? [])].includes(grade.tone)) row.toneAgree++;
    row.missed.push(...comparison.missed);
    row.invented.push(...comparison.invented);
    const flagged = grade.mistakes.map((m) => `${m.skill} "${m.quote}" → "${m.fix}"`);
    console.log(
      `${tag}: task ${grade.taskMet} (Ky ${row.ky.taskMet}) · tone ${grade.tone} (Ky ${row.ky.tone}) · missed [${comparison.missed.join(", ")}] · invented [${comparison.invented.join(", ")}]`,
    );
    console.log(`  ${flagged.join("; ") || "no mistakes flagged"}`);
  }
}

const tally = (skills: string[], of: number) =>
  [...new Set(skills)]
    .map((skill) => `${skill} ${skills.filter((s) => s === skill).length}/${of}`)
    .join(", ") || "none";

console.log("\nTally");
for (const row of rows) {
  const usable = row.graded - row.unusable;
  console.log(
    `#${row.entry.id} "${row.entry.answer}": ${row.graded} ${row.graded === 1 ? "try" : "tries"}`,
  );
  console.log(
    `  task matches Ky ${row.taskAgree}/${usable} · tone ${row.toneAgree}/${usable} · unusable ${row.unusable}`,
  );
  console.log(`  missed: ${tally(row.missed, usable)}`);
  console.log(`  invented: ${tally(row.invented, usable)}`);
}
