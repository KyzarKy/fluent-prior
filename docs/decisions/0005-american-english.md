# 0005. The app teaches American English

**Status:** accepted, 2026-09-29.

## Context

Some usage differs by variety, and the grader has to pick one. The eval turned up the first
case: "in Main Street" is standard British English, where American English says "on Main
Street" ([ADR 0002](0002-learner-model.md), 2026-09-29 amendment). Ky, who writes the
answer key, speaks American English, and the first learners are in Washington State.

## Decision

- The grader judges by American English usage, and the system prompt says so.
- The skill catalog stays variety-neutral: skills name grammar ("place prepositions"), not
  the answers. What counts as correct within a skill comes from the target variety.

## Consequences

- British, Australian, New Zealand, South African and other varieties are far-future
  roadmap items. Supporting one means a per-variety line in the grader prompt, an answer key
  graded by a speaker of that variety, and a setting for the learner. The catalog and the
  learner model don't change.
- The eval's answer key is American. An answer that's correct only in another variety is a
  mistake here, and that's intended.
