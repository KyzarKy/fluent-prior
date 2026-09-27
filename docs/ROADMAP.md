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

## Next: the tutor (central to the vision)

The learner practices between sessions with a real tutor, and the app connects the two.
To be designed after v1:

- **Tutor view of learner data:** mastery over time, recent answers, weakest skills, so
  the tutor can plan the next in-person lesson.
- **Tutor feedback into the model:** after a session, the tutor records what they
  observed. It enters the log as observations with source `tutor`, weighted as the most
  reliable evidence there is.
- Needs accounts, learner-controlled sharing, and server-side storage of the log.

## Ideas, not scheduled

- Feedback in the learner's first language.
- More profession packs.
- Scenarios generated for the learner's own workplace, reviewed before use.
- Forgetting: a decay term, so old practice counts for less.
- Detecting dictated versus typed answers from how the text arrives.
