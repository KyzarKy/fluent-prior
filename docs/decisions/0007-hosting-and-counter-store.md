# 0007. Host on Vercel, count on Upstash Redis

**Status:** proposed, 2026-10-06, for Ky's decision. Closes the open item in
[ADR 0003](0003-spend-caps.md): the production counter store.

## Context

v1 deploys once the spend caps have a durable counter store (ROADMAP). The in-memory store
only works in one long-running process, and most free hosts run code in short-lived
instances that don't share memory.

What the host and store have to do:

- **Cost nothing, with no card on file.** The same rule as the grader (ADR 0004): going over
  a free limit should stop the app, never send a bill.
- **Count atomically, with expiry.** Each graded answer reads and then adds to 12 windowed
  counters (`src/core/caps.ts`). That's 24 store commands an answer. At the whole-app cap of
  60 answers a day, that's about 43,000 a month.
- **Report a client IP the client can't forge,** for the per-network cap.
- **Run the Hono app and the Groq SDK** as they are, with Groq's replies taking a few
  seconds.

Free-tier facts below were checked on 2026-10-06 from the providers' docs and pricing
pages, through web search. Check them again before relying on them.

## Options

| | Vercel + Upstash Redis | Cloudflare Workers + Durable Objects | Render free web service |
|---|---|---|---|
| Card needed | No | No | No |
| Over the limit | Vercel pauses the project; Upstash rejects commands | Requests fail | Service stops |
| Counter store | Redis `INCRBYFLOAT` and `EXPIRE NX`: the same semantics as the in-memory store | A Durable Object, a new kind of code to write and explain | The in-memory store, but every restart wipes the counters, including the daily ones |
| Client IP | Vercel overwrites `x-forwarded-for`, so clients can't set it | `CF-Connecting-IP`, set by Cloudflare | `x-forwarded-for` from Render's proxy (not checked whether a client can forge it) |
| Limits that matter | Hobby: about 1M function calls a month, 300 s a call. Upstash: 500K commands a month | 10 ms of CPU a request on the free plan: probably enough, but nothing in our code is measured against it | Sleeps after 15 idle minutes, then takes up to a minute to wake |
| Code changes | One entry file for Vercel, one Redis store file | A Workers entry, a Durable Object class, Wrangler for local dev | Almost none |

## Decision (proposed)

**Host on Vercel's Hobby plan; keep the spend-cap counters in Upstash Redis's free tier.**

- The web app deploys as static files. The Hono API runs as one Vercel Function, using the
  existing `createApp` with the production store.
- A new `src/server/redis-store.ts` implements `CounterStore` with `INCRBYFLOAT` and then
  `EXPIRE ... NX`: the expiry is set by a window's first write, just as the in-memory store
  does it. Dollars are fractional, so it's `INCRBYFLOAT`, not `INCR`.
- Secrets (`GROQ_API_KEY`, `IP_HASH_SALT`, the Upstash URL and token) live in Vercel's
  environment variables, never in a `VITE_` variable (CLAUDE.md rule 8).
- The Upstash database sits in the same region as the function (Vercel's default is
  Washington, D.C., so AWS us-east-1).
- Ky creates both accounts and adds the secrets. Both allow sign-in with GitHub.

## Why

- **Free by construction, like the grader.** Neither account holds a card, so a mistake in
  our caps can stop the app but can't bill anyone.
- **The store matches what's tested.** The in-memory store was written to behave like Redis
  `INCR` plus `EXPIRE NX`, so `caps.ts` and its tests carry over unchanged. Only the store
  file is new.
- **About 10% of the free command quota.** 43,000 of 500,000 a month at the app's own cap.
  The app cap trips long before Upstash's would.
- **Vercel is what frontend teams use.** A live Vite and React app on Vercel is the
  deployment most hiring managers for frontend roles will recognize.
- **Cloudflare is the runner-up.** One vendor instead of two, and Workers AI is already the
  fallback grader in ADR 0004. It loses on the 10 ms CPU limit, which nobody has measured
  for a grade (parsing the reply with Zod is the risk), and on a Durable Object being one
  more concept to own in an interview. Render loses because its free tier sleeps: a
  recruiter's first click would wait up to a minute.

## Consequences

- **Two accounts to look after.** If either free tier changes its terms, the store is one
  file and the host is one entry file.
- **A paused Hobby project can stay paused.** Vercel's community forum has reports of Hobby
  projects that went over their limits and needed support to unpause. At our traffic that
  shouldn't happen, but if it does, the fix is a support ticket, not a bill.
- **Hobby is for non-commercial use.** A portfolio project qualifies. A paid version for
  real employers would move to Vercel Pro or another host.
- **24 sequential Redis calls an answer** add some tens of milliseconds to a grade that
  takes seconds. Batch them into one round trip only if it shows up in timing.
- **Data stays where it is today.** Learner logs stay in the browser. The store holds
  counters keyed by random ids and hashed IP addresses, never answers.
- **On acceptance,** ADR 0003's open item points here, and the ROADMAP's v1 deploy line
  names the host.
