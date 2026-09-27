# 0003. Layered spend caps

**Status:** accepted, 2026-09-26. The numbers are starting values, for Ky to adjust. The
production counter store is open (see Consequences).

## Context

Every graded answer is a paid model call ([ADR 0001](0001-text-in-meaning-graded.md)).
The app will be public, with no accounts in v1. It needs limits that keep one person from
using the whole budget, keep a bug or abuse from running up a bill, and keep costs
reasonable over a month.

## Decision

Caps in layers. Each catches something the layer above misses.

| Layer | Limit | Protects against |
|---|---|---|
| **Per call** | Answer ≤ 600 characters; model output ≤ 4,000 tokens | A single expensive request. Worst case ≈ 4.4¢ |
| **Per session** | 30 graded answers | Runaway loops in the UI; a nudge to take a break |
| **Per learner** | 5 a minute, 40 an hour, 100 a day | One person using the day's budget |
| **Per network (IP)** | 5× the per-learner limits | Someone rotating learner ids. Loose, because a whole hotel staff may share one Wi-Fi |
| **Whole app** | $0.25 a minute, $1 an hour, $3 a day, $15 a month | The bill. This is the layer that bounds spending |
| **Console workspace** | $20 a month | Bugs in all of the above. Anthropic enforces it |

**How it's enforced:**

- Before each call, the server checks every layer. If one is full, it returns HTTP 429
  naming the layer and when it resets, and the app says so plainly.
- After each call, it records the actual cost: the token counts in the response times the
  price table in `src/core/pricing.ts`.
- Counters are keyed by fixed windows (the current minute, hour, day, month) and expire
  after their window.
- The learner id is a random id the browser stores; the session id is per page load. Both
  can be forged, which is why the IP layer and the whole-app layer exist. IP addresses are
  hashed before they're used as keys.

**The arithmetic is pure** (`src/core/caps.ts`) and the counter store is an interface, so
the layers are unit-tested without a server.

## Why

- Check-then-record is simple and needs no reservation step. Concurrent requests can pass
  the check together, so the overshoot is at most (concurrent requests × 4.4¢).
- Dollar limits for the whole app, count limits for people: the bill is in dollars, but a
  person's fair share is easier to reason about as answers.
- The Console limit sits outside our code, so it still holds if our code is wrong.

## Consequences

- **Open: the production counter store.** Serverless functions don't share memory, so the
  in-memory store is for local development only. Before deploying, pick a durable store.
  The leading option is Upstash Redis on its free tier: atomic increment with expiry fits
  windowed counters. It stays separate from every other project's infrastructure.
- Typical cost per graded answer is estimated at about 1¢ (about 1,500 tokens in, 700 out
  including thinking, at Sonnet 5 prices). Replace the estimate with measured numbers after
  the first week.
- A learner who hits a limit sees why and when it resets, never a generic error.
