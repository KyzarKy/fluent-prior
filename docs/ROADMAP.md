# Roadmap

## v1: practice loop (now)

- A hospitality scenario pack: front desk, housekeeping, kitchen, food prep, front of house.
  Before shipping, fill its thin spots (phase 1 under "Scaling the scenario pack").
- Answer by dictation or typing; the model grades meaning and reports skills
  ([ADR 0001](decisions/0001-text-in-meaning-graded.md)).
- Knowledge tracing per skill, weighted by what dictation can hear, choosing the next
  scenario ([ADR 0002](decisions/0002-learner-model.md)).
- Layered spend caps ([ADR 0003](decisions/0003-spend-caps.md)).
- A free grader by default ([ADR 0004](decisions/0004-free-grader-first.md)).
- Runs locally. Deploy once the production counter store is chosen. The repo stays private until v1 ships.

## v1.1: measure

- **Grader eval.** Built: Ky's 60-answer key, `npm run eval`, `npm run trial`, and the free
  grader's results in `evals/results`. Next: grade the same key with Sonnet 5, Haiku 4.5 and
  Opus 5 ([ADR 0004](decisions/0004-free-grader-first.md)). The comparison decides whether
  and when to switch to a paid grader.
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
- **Word choice log** (decided 2026-09-29): phrasing that sounds off without breaking a
  grammar rule is recorded for the tutor and never penalized. The answer key records it;
  the grader doesn't report it yet.
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

## Scaling the scenario pack

Planned with Ky, 2026-10-04. Hospitality has 14 scenarios. At 10 answers a day a learner
starts repeating them on day two, and a right answer to a familiar scenario partly measures
memory, which weakens the learner model. Rough target: about 70 per profession, fewer with
variants.

**Where scenarios come from.** Drafts start from O*NET's task statements for each job:
what desk clerks, housekeepers, waiters, cooks and food prep workers actually do. Claude
rewrites each draft to this repo's conventions: the situation as work notes, the task as a
goal that doesn't model the target grammar, and a checklist that follows ADR 0006's rules.
Ky reviews every scenario before it ships. The O*NET database is licensed
[CC BY 4.0](https://www.onetcenter.org/license_db.html): credit the O*NET database and
USDOL/ETA, link the license, and say the text was adapted.

- **Phase 1, before v1 ships: fill the thin spots.** As of 2026-10-04, possessive 's is
  the target of 1 scenario, and past tense and modal verbs of 2 each. Food prep has 1
  scenario, kitchen 2, and briefing coworkers 2. About 6 new scenarios bring every skill,
  role and task type to at least 3.
- **Phase 2, after v1: tooling.**
  - A coverage report: scenarios per skill, task type and role, so new drafts aim at gaps.
  - A priming check that flags task text using the target grammar, like "will" in a
    future-forms scenario.
  - Checklist probes: 3 or 4 answers per new scenario with verdicts Ky approves (complete,
    one part missing, and one that matches the checklist's words without meeting the
    need), added to the answer key and tested with `npm run trial`.
  - Variants: one tested scenario with many sets of facts (rooms, dishes, times,
    complaints). Checklists that name categories stay true when the facts change, so
    variants need spot checks, not full testing, and learners can't memorize answers.
  - Scenarios move from TypeScript into data files once there are dozens.
- **Phase 3, with real learners.**
  - Completion, retry and grader-failure rates per scenario; rewrite or retire outliers.
  - A weekly audit of a sample of real answers. Claude wrote the answer key's answers, so
    real ones are the only full test of the grader.
  - New skills from evidence: when uncategorized mistakes cluster ("verb patterns" is 4 of
    the key's 12), or when a skill's learning curve shows it's really two skills.
- **Phase 4, new professions.** Each starts from O*NET and, ideally, a tutor or worker in
  the field. It adds roles and maybe task types, and reuses phase 2's tooling. The grammar
  skills mostly carry over.

## Ideas, not scheduled

- Other varieties of English (British, Australian, New Zealand, South African), selectable
  per learner ([ADR 0005](decisions/0005-american-english.md)).
- A comparisons skill ("than anyone else", "than any other room"): a real rule, and useful
  when describing rooms and dishes.
- Feedback in the learner's first language.
- Scenarios generated for the learner's own workplace, reviewed before use.
- Forgetting: a decay term, so old practice counts for less.
- Detecting dictated versus typed answers from how the text arrives.
- **Reuse grades for identical answers**, after removing what isn't graded (punctuation,
  capitalization, spacing). Same answer, same grade: it saves little, but grading becomes
  consistent. Needs the production store, and saved grades go stale when the prompt or a
  scenario changes. Not "similar" answers: similarity measures ignore the missing "is" or
  "-s" that the grammar grade is about.
- **A backup grader for when the quota runs out.** Groq's free limits are per model, so
  gpt-oss-20b has its own daily quota. If it scores well enough on the eval, it could grade
  instead of the app showing "limit reached".
