# 0004. A free open model is the primary grader

**Status:** accepted, 2026-09-27. Replaces the grader choice in
[ADR 0001](0001-text-in-meaning-graded.md); the rest of 0001 stands.

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
- **Sonnet stays:** `GRADER=anthropic` selects it; `GRADER=fake` still exists for UI work.
  The prompt, the parsing, and the contract are shared, so the only difference between
  graders is the provider call.

## Why

- Groq's free tier needs no card, so "free" is enforced by the provider rather than by our
  code.
- Groq keeps no inference data by default. Learner answers are personal, so this matters
  more than speed.
- Among Groq's strong models, `gpt-oss-120b` had the largest free daily token allowance
  (about 200K tokens a day, per the sources above). At about 2,500 tokens a grade, that's
  roughly 80 graded answers a day.

## Consequences

- About 80 graded answers a day, shared by everyone. Fine for a portfolio demo, not for
  real users. The whole-app cap in ADR 0003 gains a count limit (60 answers a day), so we
  stop before Groq does and can say why.
- Grading will likely miss more small grammar errors than Sonnet. The 20-answer eval on the
  [ROADMAP](../ROADMAP.md) measures it, and that number decides whether and when to switch.
- Free-tier terms can change without notice. If Groq's do, Cloudflare Workers AI (10,000
  free units of compute a day, also no card) is the fallback, one provider file away.
