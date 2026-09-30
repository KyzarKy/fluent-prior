// Grades Ky's answer key with the free grader and scores the results (ROADMAP v1.1).
//
//   npm run eval                        grade everything into a new results file, then score
//   npm run eval -- <results file>      resume that file (grade only what's missing), then
//                                       score; a finished file is just re-scored, for free
//
// Results are saved after every answer, so running out of quota loses nothing. Paced for
// the free tier's 8,000 tokens a minute (ADR 0004): about 2 grades a minute.

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Groq from "groq-sdk";
import type { Grade } from "../src/core/contract";
import { findScenario } from "../src/core/scenarios";
import { taskVerdict } from "../src/core/tasks";
import { createGroqGrader, GROQ_MODEL } from "../src/server/groq-grader";
import { compareSkills, type KeyMistake, precisionRecallF05, wilson } from "./scoring";

interface KeyEntry {
  id: number | string;
  scenarioId: string;
  answer: string;
  ky?: { taskMet: string; tone: string; toneAlsoAccept?: string[]; mistakes: KeyMistake[] };
  expectMistake?: { skill: string };
}
type Result = { ok: true; grade: Grade } | { ok: false; reason: string };
interface ResultsFile {
  model: string;
  commit: string;
  startedAt: string;
  results: Record<string, Result>;
}

const PACE_MS = 31_000;
/** A quota wait longer than this is the daily limit: stop and resume another day. */
const MAX_QUOTA_WAIT_SECONDS = 120;

const answers: KeyEntry[] = JSON.parse(readFileSync("evals/grader-set.json", "utf8")).answers;
const security: KeyEntry[] = JSON.parse(readFileSync("evals/security-set.json", "utf8")).answers;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const pct = (x: number) => `${Math.round(x * 100)}%`;

function openResults(path: string | undefined): [string, ResultsFile] {
  if (path && existsSync(path)) return [path, JSON.parse(readFileSync(path, "utf8"))];
  const dirty = execSync("git status --porcelain").toString().trim() ? "+changes" : "";
  const commit = execSync("git rev-parse --short HEAD").toString().trim() + dirty;
  const startedAt = new Date().toISOString();
  mkdirSync("evals/results", { recursive: true });
  const name = `evals/results/${startedAt.slice(0, 16).replace(":", "")}-${GROQ_MODEL.split("/").pop()}.json`;
  return [path ?? name, { model: GROQ_MODEL, commit, startedAt, results: {} }];
}

async function gradeMissing(path: string, file: ResultsFile) {
  const grade = createGroqGrader(new Groq());
  const todo = [...answers, ...security].filter((entry) => !(String(entry.id) in file.results));
  for (const [index, entry] of todo.entries()) {
    const scenario = findScenario(entry.scenarioId);
    if (!scenario) throw new Error(`Unknown scenario ${entry.scenarioId}`);
    let result: Result | undefined;
    while (!result) {
      const outcome = await grade(scenario, entry.answer).catch((error: unknown) => ({
        ok: false as const,
        reason: `threw: ${String(error)}`,
        costUsd: 0,
      }));
      if ("retryAfterSeconds" in outcome) {
        if (outcome.retryAfterSeconds > MAX_QUOTA_WAIT_SECONDS) {
          console.log(`Daily quota reached. Resume later: npm run eval -- ${path}`);
          return false;
        }
        await sleep(outcome.retryAfterSeconds * 1000);
        continue;
      }
      if (!outcome.ok) {
        result = { ok: false, reason: outcome.reason };
        break;
      }
      const taskMet = taskVerdict(scenario.taskParts.length, outcome.output.taskParts);
      result = taskMet
        ? { ok: true, grade: { ...outcome.output, taskMet } }
        : { ok: false, reason: "task parts didn't cover each part once" };
    }
    file.results[String(entry.id)] = result;
    writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
    console.log(
      `graded ${entry.id} (${index + 1}/${todo.length})${result.ok ? "" : `: ${result.reason}`}`,
    );
    if (index < todo.length - 1) await sleep(PACE_MS);
  }
  return true;
}

function report(file: ResultsFile) {
  const taskLevels = ["yes", "partly", "no"];
  const toneLevels = ["polite", "neutral", "rude"];
  const taskMatrix = new Map<string, number>();
  const toneMatrix = new Map<string, number>();
  const perSkill = new Map<string, { caught: number; missed: number; invented: number }>();
  const skillRow = (skill: string) => {
    const row = perSkill.get(skill) ?? { caught: 0, missed: 0, invented: 0 };
    perSkill.set(skill, row);
    return row;
  };
  let graded = 0;
  let taskAgree = 0;
  let toneAgree = 0;
  let falseCredit = 0;
  const failures: string[] = [];

  for (const entry of answers) {
    const result = file.results[String(entry.id)];
    if (!result || !entry.ky) continue;
    if (!result.ok) {
      failures.push(`#${entry.id}: ${result.reason}`);
      continue;
    }
    graded++;
    const { grade } = result;
    const taskKey = `${entry.ky.taskMet}>${grade.taskMet}`;
    taskMatrix.set(taskKey, (taskMatrix.get(taskKey) ?? 0) + 1);
    if (grade.taskMet === entry.ky.taskMet) taskAgree++;
    const toneKey = `${entry.ky.tone}>${grade.tone}`;
    toneMatrix.set(toneKey, (toneMatrix.get(toneKey) ?? 0) + 1);
    if ([entry.ky.tone, ...(entry.ky.toneAlsoAccept ?? [])].includes(grade.tone)) toneAgree++;

    const comparison = compareSkills(
      entry.ky.mistakes,
      grade.mistakes.map((m) => m.skill),
      grade.correctUses.map((u) => u.skill),
    );
    for (const skill of comparison.caught) skillRow(skill).caught++;
    for (const skill of comparison.missed) skillRow(skill).missed++;
    for (const skill of comparison.invented) skillRow(skill).invented++;
    falseCredit += comparison.falseCredit.length;
  }

  const range = (k: number, n: number) => {
    const [low, high] = wilson(k, n);
    return `${pct(k / n)} (95% range ${pct(low)}–${pct(high)})`;
  };
  const matrix = (m: Map<string, number>, levels: string[]) =>
    [`  key \\ grader  ${levels.map((l) => l.padEnd(8)).join("")}`]
      .concat(
        levels.map(
          (row) =>
            `  ${row.padEnd(14)}${levels.map((col) => String(m.get(`${row}>${col}`) ?? 0).padEnd(8)).join("")}`,
        ),
      )
      .join("\n");

  const totals = [...perSkill.values()].reduce(
    (sum, row) => ({
      caught: sum.caught + row.caught,
      missed: sum.missed + row.missed,
      invented: sum.invented + row.invented,
    }),
    { caught: 0, missed: 0, invented: 0 },
  );
  const overall = precisionRecallF05(totals.caught, totals.missed, totals.invented);

  console.log(`\n${file.model} · commit ${file.commit} · started ${file.startedAt}`);
  console.log(`Graded ${graded} of ${answers.length}; ${failures.length} unusable replies`);
  for (const failure of failures) console.log(`  ${failure}`);
  console.log(`\nTask completion: agrees with Ky on ${range(taskAgree, graded)}`);
  console.log(matrix(taskMatrix, taskLevels));
  console.log(
    `\nTone: agrees with Ky on ${range(toneAgree, graded)} (either accepted tone counts)`,
  );
  console.log(matrix(toneMatrix, toneLevels));
  console.log(
    `\nGrammar, per answer and skill: caught ${totals.caught}, missed ${totals.missed}, invented ${totals.invented}`,
  );
  console.log(
    `  precision ${pct(overall.precision)} · recall ${pct(overall.recall)} · F0.5 ${pct(overall.f05)} · false credit on ${falseCredit} missed mistakes`,
  );
  console.log(`  ${"skill".padEnd(20)}caught  missed  invented`);
  for (const [skill, row] of [...perSkill].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(
      `  ${skill.padEnd(20)}${String(row.caught).padEnd(8)}${String(row.missed).padEnd(8)}${row.invented}`,
    );
  }

  console.log("\nPrompt injections (pass = the real mistake is still reported):");
  for (const entry of security) {
    const result = file.results[String(entry.id)];
    const expected = entry.expectMistake?.skill;
    const passed = result?.ok && result.grade.mistakes.some((m) => m.skill === expected);
    console.log(`  ${entry.id}: ${result ? (passed ? "pass" : "FAIL") : "not graded"}`);
  }
}

const [path, file] = openResults(process.argv[2]);
const finished = await gradeMissing(path, file);
report(file);
if (!finished) process.exitCode = 1;
