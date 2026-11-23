// Compares graders skill by skill: caught, missed and invented for chosen skills, counted
// only on answers every results file graded. Reads results files; grades nothing.
//
//   npx tsx evals/skill-report.ts articles,past-regular <results file> [results file ...]
//
// Counting is compareSkills from scoring.ts, so the rules match the eval: the whole key is
// used, so a skill another mistake accepts as an alternative isn't counted as invented.

import { readFileSync } from "node:fs";
import { answers } from "./grade";
import { compareSkills, precisionRecallF05 } from "./scoring";

interface Grade {
  mistakes: { skill: string }[];
  correctUses: { skill: string }[];
}
interface ResultsFile {
  model: string;
  results: Record<string, { ok: boolean; grade?: Grade }>;
}

const [skillArg, ...paths] = process.argv.slice(2);
if (!skillArg || paths.length === 0) {
  console.error("Usage: npx tsx evals/skill-report.ts <skill,skill> <results file> [...]");
  process.exit(1);
}
const skills = new Set(skillArg.split(","));
const files: ResultsFile[] = paths.map((path) => JSON.parse(readFileSync(path, "utf8")));

const graded = (file: ResultsFile, id: string) => file.results[id]?.ok === true;
const shared = answers.filter(
  (entry) => entry.ky && files.every((f) => graded(f, String(entry.id))),
);
console.log(`${shared.length} answers graded by every file\n`);

const pct = (x: number) => `${Math.round(x * 100)}%`;
for (const file of files) {
  const tally = new Map<string, { caught: number; missed: number; invented: number }>();
  for (const skill of [...skills, "together"])
    tally.set(skill, { caught: 0, missed: 0, invented: 0 });
  for (const entry of shared) {
    // `shared` holds only answers every file graded, so each has a grade.
    const grade = file.results[String(entry.id)]?.grade as Grade;
    const flagged = grade.mistakes.map((m) => m.skill).filter((s) => skills.has(s));
    const credited = grade.correctUses.map((m) => m.skill);
    const result = compareSkills(entry.ky?.mistakes ?? [], flagged, credited);
    for (const kind of ["caught", "missed", "invented"] as const) {
      for (const skill of result[kind].filter((s) => skills.has(s))) {
        for (const name of [skill, "together"]) {
          const row = tally.get(name);
          if (row) row[kind]++;
        }
      }
    }
  }
  console.log(file.model);
  for (const [skill, { caught, missed, invented }] of tally) {
    const { precision, recall, f05 } = precisionRecallF05(caught, missed, invented);
    console.log(
      `  ${skill.padEnd(14)} caught ${caught}, missed ${missed}, invented ${invented}` +
        `  P ${pct(precision)} R ${pct(recall)} F0.5 ${pct(f05)}`,
    );
  }
  console.log();
}
