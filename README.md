# Fluent Prior

English speaking practice for people who work in hotels, resorts and restaurants. It's
meant for the days between sessions with a real tutor.

## How it works

1. The app gives you a work situation: a guest arrives before check-in, the kitchen ran
   out of salmon, the next shift needs a handoff.
2. You answer out loud with your phone's keyboard microphone, or you type.
3. A model grades the answer: did you get the job done, and which grammar and vocabulary
   did you use correctly?
4. A Bayesian model of what you know updates, and picks the next situation to work on
   your weakest skill.

## Why "prior"

Speech recognition has a prior: it's trained on fluent speech, so when a sound is
unclear it guesses the grammatical version. If a learner says "he go to the store," the
transcript may say "he goes to the store." An error that survives dictation is strong
evidence; a correct *-s* or *-ed* is weak evidence, because the recognizer might have
filled it in. The learner model weighs each answer with that in mind
([ADR 0002](docs/decisions/0002-learner-model.md)).

## Status

v1 in progress. See the [ROADMAP](docs/ROADMAP.md) and the
[decisions](docs/decisions/).

## Running it locally

Requires Node 24.

```bash
npm install
cp .env.example .env    # then add ANTHROPIC_API_KEY
npm run dev             # API on :8790, web app on :5180
```

On Windows PowerShell, use `npm.cmd` in place of `npm`.
