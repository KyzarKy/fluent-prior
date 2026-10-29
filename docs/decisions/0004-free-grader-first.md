# 0004. A free open model is the primary grader

**Status:** accepted, 2026-09-27. Replaces the grader choice in
[ADR 0001](0001-text-in-meaning-graded.md); the rest of 0001 stands. [ADR 0009](0009-backup-grader.md)
adds gpt-oss-20b as a backup for when this model's quota runs out. Amended 2026-10-29:
Groq's 30-day log caveat, from Groq's own docs.

## Context

ADR 0001 chose Claude Sonnet 5, at about 1¢ an answer. Ky wants v1 to be guaranteed free,
even if grading is less accurate, and may switch to Sonnet later. Running a model on the
learner's phone fails on memory and download size, and a GPU server costs more than Sonnet
at portfolio traffic. What's left is a hosted open model on a free tier.

Free-tier limits and policies below were checked on 2026-09-27 from third-party summaries.
Recheck them against the provider's own docs before relying on them.

## Decision

- **Grader:** OpenAI's open-weight `gpt-oss-120b`, hosted by Groq, with strict JSON-schema
  output and `medium` reasoning effort. The schema comes from the same Zod contract, and
  the reply is parsed by it as before.
- **Guaranteed free:** the Groq account has no payment method. Going over the free quota
  gets an HTTP 429, never a bill. `src/core/pricing.ts` prices the model at $0, so a paid
  model can't be swapped in without a visible price change.
- **Out of quota:** the grader reports it, and the learner sees the same message as for the
  whole-app spend cap. It's a limit, not a failure.
- **Rejected JSON:** Groq sometimes refuses a reply that breaks the schema
  (`json_validate_failed`, 1 in 60 in the first eval), including one cut off at the output
  ceiling. The grader retries once, inside the same capped request, at `low` reasoning
  effort (Ky, 2026-10-07): a reply that ran out of tokens at medium would likely run out
  again, and low effort used less than half the output (2026-09-27, below). A retried
  grade may be a little less accurate (same measurement). That second call isn't checked
  against the caps again, which is safe only because the free grader costs $0; a paid
  grader shouldn't copy it.
- **Sonnet stays:** `GRADER=anthropic` selects it; `GRADER=fake` still exists for UI work.
  The prompt, the parsing, and the contract are shared, so the only difference between
  graders is the provider call.

## Why

- Groq's free tier needs no card, so "free" is enforced by the provider rather than by our
  code.
- Groq keeps no inference data by default. It may keep request logs for up to 30 days when
  looking into errors or suspected abuse
  ([Your Data in GroqCloud](https://console.groq.com/docs/your-data), checked 2026-10-29). Learner answers are personal, so this matters
  more than speed.
- Among Groq's strong models, `gpt-oss-120b` had the largest free daily token allowance
  (about 200K tokens a day, per the sources above). At about 2,400 tokens a grade (measured below), that's
  roughly 80 graded answers a day.

## Consequences

- About 80 graded answers a day (measured on 2026-10-06 as 65 to 70; see below), shared by
  everyone, eval runs included. Fine for a portfolio demo, not for
  real users. The whole-app cap in ADR 0003 gains a count limit (60 answers a day), so we
  stop before Groq does and can say why.
- Grading will likely miss more small grammar errors than Sonnet. The 20-answer eval on the
  [ROADMAP](../ROADMAP.md) measures it, and that number decides whether and when to switch.
- Free-tier terms can change without notice. If Groq's do, Cloudflare Workers AI (10,000
  free units of compute a day, also no card) is the fallback, one provider file away.

## Measured, 2026-09-27

One grade of "i find a broken lamp…" at each reasoning effort:

| Effort | Prompt tokens | Output (of which reasoning) | Total |
|---|---|---|---|
| low | 1,139 | 480 (300) | 1,619 |
| medium | 1,187 | 1,223 (1,098) | 2,410 |

- **Stay at medium.** Low effort filed "find → found" under regular past; medium filed it
  correctly under irregular past.
- **Output limit lowered from 4,000 to 2,000 tokens.** The free tier also allows 8,000
  tokens a minute, and each request appears to count as its prompt plus the output limit,
  not the tokens actually used: Groq's usage graph showed 5.5K–6.5K per request with the
  4,000 limit. That's inferred from the numbers, not from Groq's docs. At 2,000, a request
  counts as about 3,200, so two grades fit in a minute instead of one.
- If an answer ever needs more than 2,000 output tokens, the reply stops early and shows as
  a failed grade (`finish_reason length` in the server log), so it can't pass unnoticed.

## Measured, 2026-10-04: the daily limit

- **It behaves like a rolling 24-hour window, not a midnight reset.** At 20:35 UTC, with the
  day's quota spent, a 112-token request went through but a grade didn't, and the grade's
  429 said `retry-after: 903` (15 minutes), not the 3.4 hours to midnight UTC. Tokens seem
  to free up as day-old ones age out.
- **No header reports it.** `x-ratelimit-*-tokens` are the per-minute limit (8,000) and
  `x-ratelimit-*-requests` are requests per day (1,000). Only a 429's `retry-after` says
  when the daily token limit allows another grade.

## Measured, 2026-10-06: tokens per grade

Two full eval runs, 128 grades (results 2026-10-05T0159 and T0200):

- **About 3,000 tokens a grade:** a prompt of about 1,690 (1,187 on 2026-09-27; every rule
  added since costs tokens on every call) and output of about 1,200, of which about 1,015
  is reasoning. That's 65 to 70 grades a day in the 200,000-token daily limit.
- **Prompt caching barely helps.** Groq caches automatically and cached tokens don't count
  toward limits, but the cache served only 4 to 6% of prompt tokens. Hits aren't
  guaranteed, so capacity can't be planned around them.
- **Eval runs compete with the app.** A full run is about 190,000 tokens, nearly a day's
  quota. Two runs side by side took every grade the quota freed for about 32 hours, leaving
  the app none. The app's
  60-answers-a-day cap (ADR 0003) doesn't help while an eval runs.
- **Little headroom under the output ceiling.** The largest reply was 1,964 of 2,000
  tokens. A longer one is cut off and fails. Lower reasoning effort is the lever if that
  starts happening.

## Measured, 2026-10-07: the first cut-off

Trials of the 15 phase 1 probes (45 grades, PR #1): #69, at 168 characters the longest
answer in the key, ran out of output tokens once. Groq returned `json_validate_failed`, and
the retry, then still at medium effort, ran out too, so the grade failed. In the app the
learner would have seen "couldn't grade". That's 1 grade in 45, and why the retry now uses
low effort.
