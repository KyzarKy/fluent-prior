# Roadmap

## v1: practice loop (now)

- A hospitality scenario pack: front desk, housekeeping, kitchen, food prep, front of house.
- Answer by dictation or typing; the model grades meaning and reports skills
  ([ADR 0001](decisions/0001-text-in-meaning-graded.md)).
- Knowledge tracing per skill, weighted by what dictation can hear, choosing the next
  scenario ([ADR 0002](decisions/0002-learner-model.md)).
- Layered spend caps ([ADR 0003](decisions/0003-spend-caps.md)).
- A free grader by default ([ADR 0004](decisions/0004-free-grader-first.md)).
- Runs locally. Deploy once the production counter store is chosen. The repo stays private until v1 ships.

## v1.1: measure

- **Grader eval.** Ky hand-grades 20 answers; compare the free grader (gpt-oss-120b on
  Groq, [ADR 0004](decisions/0004-free-grader-first.md)) with Sonnet 5, Haiku 4.5 and
  Opus 5. The result decides whether and when to switch to a paid grader.
- **Measure `keep`.** Dictate sentences with known small-sound errors on a few phones and
  count how many survive. Replace the 0.5 guess.
- **Measure cost** per graded answer and update ADR 0003's estimate.
- **Typed drills** for faint skills: "type this one", logged with source `typed-drill`.
- Prompt caching, if the system prompt is long enough to qualify.

## Decided, design next

- **Three separate tracks** (Ky, 2026-09-29): grammar skills; task completion (`taskMet`,
  completeness only); and tone, a scale shown as "how this may sound", never a mistake.
  Skills stay grammatical. An ADR comes with the design: the tone scale, how completeness
  feeds the learner model, and which current skills aren't grammar.
- **Word choice goes to a tutor log.** Phrasing that sounds off without breaking a grammar
  rule is recorded for the tutor and never penalized.

## Next: the tutor (central to the vision)

The learner practices between sessions with a real tutor, and the app connects the two.
To be designed after v1:

- **Tutor view of learner data:** mastery over time, recent answers, weakest skills, so
  the tutor can plan the next in-person lesson.
- **Tutor feedback into the model:** after a session, the tutor records what they
  observed. It enters the log as observations with source `tutor`, weighted as the most
  reliable evidence there is.
- Needs accounts, learner-controlled sharing, and server-side storage of the log.

## Later: progress over time

The learner sees how they've improved, as charts with a short written explanation. Order
relative to the tutor work, accounts and security is open.

- **Charts per track:** mastery for each grammar skill, tone, and task completion by task
  type, over days and weeks.
- **A written summary** in simple English, for example "Your past tense is much steadier
  than two weeks ago; articles still come and go." Code computes the trends and the model
  only words them, so the summary can't invent progress (CLAUDE.md rule 3). Each summary is
  a model call, so it goes through the spend caps.
- **No new data needed:** observations are append-only and timestamped, so mastery on any
  past day comes from replaying the log up to that day.
- The tutor view's "mastery over time" can share these charts.

## Ideas, not scheduled

- Other varieties of English (British, Australian, New Zealand, South African), selectable
  per learner ([ADR 0005](decisions/0005-american-english.md)).
- A comparisons skill ("than anyone else", "than any other room"): a real rule, and useful
  when describing rooms and dishes.

- Feedback in the learner's first language.
- More profession packs.
- Scenarios generated for the learner's own workplace, reviewed before use.
- Forgetting: a decay term, so old practice counts for less.
- Detecting dictated versus typed answers from how the text arrives.
