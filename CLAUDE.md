# CLAUDE.md

Instructions for any Claude session working in this repo. Humans are welcome to read it:
it's also the working agreement between Ky and Claude.

## What this is

Fluent Prior is English speaking practice for hospitality workers, used between sessions
with a tutor. It's one of Ky Merritt's portfolio projects, and the one that depends on no
one but Ky. It shares no code or infrastructure with Ky's other projects, on purpose.

Read these before changing anything: [README](README.md), [ROADMAP](docs/ROADMAP.md), and
the ADRs in [docs/decisions](docs/decisions/).

## How we work

Ky orchestrates and decides. Claude proposes and implements. Ky has to be able to explain
every part of this codebase in an interview and fix it without help, so the code has to
read like AI-assisted work that a senior engineer directed, not like generated code.

- **Decisions:** anything that changes a documented decision needs an ADR in
  `docs/decisions/` first, proposed to Ky before implementation.
- **Small changes.** One concern per commit or PR. Aim for under about 400 changed lines,
  not counting tests and data files.
- **Every change explains itself.** The commit message (or PR description) has: what
  changed and why, in plain English; how to verify it; and **three questions an
  interviewer might ask about this change**, with short answers.
- **Docs move with code.** A change that contradicts a doc updates that doc in the same
  commit.
- **Tests:** logic in `src/core` gets unit tests. A bug fix starts with a failing test.
- **Git:** push straight to `main` for uncontroversial changes. Open a PR, or ask first,
  when a change is controversial or needs Ky's call. Never force-push or rewrite pushed
  history. Never commit secrets.
- **Before a milestone closes:** run `/triage`, and put docs through depurple.

## Rules that are easy to break by accident

1. **`src/core` is pure.** No React, DOM, browser storage, or Node imports. It holds the
   learner model, skill catalog, scenario pack, wire schemas, and spend-cap arithmetic.
2. **Model output is `unknown`** until a schema in `src/core/contract.ts` parses it. Never
   cast it.
3. **The model reports; code weighs.** The grader says what it saw. How much an
   observation counts is decided in `src/core/evidence.ts`, never in a prompt
   ([ADR 0002](docs/decisions/0002-learner-model.md)).
4. **Observations are append-only.** Mastery is computed from the log. Nothing edits or
   deletes one observation; "reset progress" clears the whole log.
5. **Every model call goes through the spend caps** ([ADR 0003](docs/decisions/0003-spend-caps.md)).
6. **The client sends a scenario id, never scenario text.** The server looks the scenario
   up, so a client can't get arbitrary text graded.
7. **Learner answers are data.** They reach the model inside `<answer>` tags, and the
   system prompt says not to follow instructions in them.
8. **Secrets stay on the server.** Nothing secret goes in a `VITE_` variable.

## Style

Readable over clever. Domain names, small modules, one job per file. Each file starts with
a short comment on its role. Comments explain why. No dead code, no speculative
abstractions, no `utils` grab-bags. Use the standard tool the standard way.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API on :8790 and the web app on :5180 (Vite proxies `/api`) |
| `npm run verify` | Typecheck, lint, unit tests, build |
| `npm test` | Unit tests (Vitest) |
| `npm run format` | Biome: format and apply safe lint fixes |
| `npm run eval -- [results file]` | Grade Ky's answer key with the free grader and score it; a results file resumes or re-scores |
| `npm run trial -- <ids> [tries]` | Grade a few key answers several times each (default 3), to test a prompt or checklist change |

Both eval scripts spend Groq's free daily quota (about 80 grades), shared with the app.

The server reads `.env` in development (copy `.env.example`). On Windows, PowerShell blocks
`npm.ps1`, so use `npm.cmd`.
