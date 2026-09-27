# 0001. Text in, meaning graded

**Status:** accepted, 2026-09-26.

## Context

This is speaking practice, so answers should be spoken. There were three ways to handle
speech:

- **Score pronunciation.** That needs analysis of the audio itself: a paid pronunciation
  API, or a large model downloaded into the browser. It's the hardest part of the idea,
  and it isn't what a learner at work needs most. A guest cares whether they were
  understood.
- **Transcribe in the app** with the browser's speech API, and show "here's what I heard"
  so the learner can fix mistakes.
- **Let the learner's device do it.** Every phone keyboard has a microphone button, and so
  do Windows (Win+H) and macOS.

All three share one problem: speech recognizers are trained on fluent speech, so when a
sound is unclear they choose the grammatical version. "He go" can come out as "he goes."
No phone has a setting that turns this off, because it isn't a filter that runs after
recognition; it's how the recognizer chooses words. Gboard's grammar fixing ("Fix it") is
a separate feature that only runs when asked.

## Decision

- **The app takes text.** Learners answer with their device's dictation, or type. The app
  has no speech code. The text box already shows what the device heard, so fixing a
  mishearing needs no extra screen.
- **A model grades meaning first:** did the answer do what the situation asked? Then it
  reports each grammar or vocabulary skill it saw used, correctly or not, quoting the
  learner's words.
- **Never graded:** punctuation, capitalization, and the spelling of words that sound
  alike (their/there, to/too). The device chose those, not the learner.
- **Grader:** Claude Sonnet 5 (`claude-sonnet-5`) with structured output, at `medium`
  effort. The response is validated against a Zod schema before anything uses it.

## Why

- It moves the hard part from signal processing to judgment, which is what language
  models are good at.
- Device dictation works on every phone and laptop with no code, and learners already
  know how to use it.
- Grading meaning first matches what matters at work.

## Consequences

- The app can't tell spoken answers from typed ones. [ADR 0002](0002-learner-model.md)
  handles this by treating every answer as possibly dictated.
- Grading costs money on every answer, so [ADR 0003](0003-spend-caps.md) caps spending.
- The model choice is one constant. A hand-graded set of 20 answers will show whether a
  cheaper model agrees with Ky as well as Sonnet 5 does (see the [ROADMAP](../ROADMAP.md)).
