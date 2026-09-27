// Spend-cap arithmetic (ADR 0003): the limits, which counters a request touches, and
// whether any is full. Counters live behind CounterStore, so this runs in tests without a
// server; the server supplies the store.

import type { CapLayer } from "./contract";

export interface CounterStore {
  get(key: string): Promise<number>;
  add(key: string, amount: number, ttlSeconds: number): Promise<void>;
}

type Window = "minute" | "hour" | "day" | "month" | "session";

export interface Limit {
  layer: CapLayer;
  window: Window;
  unit: "answers" | "usd";
  max: number;
}

const LEARNER_LIMITS = { minute: 5, hour: 40, day: 100 } as const;
/** Loose, because a whole hotel staff may share one network. */
const NETWORK_MULTIPLIER = 5;

export const LIMITS: Limit[] = [
  { layer: "session", window: "session", unit: "answers", max: 30 },
  ...(["minute", "hour", "day"] as const).flatMap((window): Limit[] => [
    { layer: "learner", window, unit: "answers", max: LEARNER_LIMITS[window] },
    {
      layer: "network",
      window,
      unit: "answers",
      max: LEARNER_LIMITS[window] * NETWORK_MULTIPLIER,
    },
  ]),
  // Under the free grader's daily quota, so we stop first and can say why (ADR 0004).
  { layer: "app", window: "day", unit: "answers", max: 60 },
  { layer: "app", window: "minute", unit: "usd", max: 0.25 },
  { layer: "app", window: "hour", unit: "usd", max: 1 },
  { layer: "app", window: "day", unit: "usd", max: 3 },
  { layer: "app", window: "month", unit: "usd", max: 15 },
];

/** Who a request belongs to. The network id is a hashed IP address. */
export interface Requester {
  sessionId: string;
  learnerId: string;
  networkId: string;
}

interface Bucket {
  key: string;
  ttlSeconds: number;
  resetsInSeconds: number;
}

const SESSION_TTL_SECONDS = 24 * 60 * 60;

function bucketFor(limit: Limit, who: Requester, now: Date): Bucket {
  const owner = {
    session: who.sessionId,
    learner: who.learnerId,
    network: who.networkId,
    app: "all",
  }[limit.layer];
  const prefix = `cap:${limit.layer}:${owner}:${limit.unit}:${limit.window}`;
  const epochSeconds = Math.floor(now.getTime() / 1000);

  switch (limit.window) {
    case "session":
      return { key: prefix, ttlSeconds: SESSION_TTL_SECONDS, resetsInSeconds: SESSION_TTL_SECONDS };
    case "minute":
    case "hour":
    case "day": {
      const size = { minute: 60, hour: 3600, day: 86400 }[limit.window];
      const start = epochSeconds - (epochSeconds % size);
      return {
        key: `${prefix}:${start}`,
        ttlSeconds: size,
        resetsInSeconds: start + size - epochSeconds,
      };
    }
    case "month": {
      // Calendar months in UTC, so the cap lines up with the bill.
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const nextMonthSeconds = Date.UTC(year, month + 1, 1) / 1000;
      const resetsInSeconds = nextMonthSeconds - epochSeconds;
      return {
        key: `${prefix}:${year}-${month + 1}`,
        ttlSeconds: resetsInSeconds,
        resetsInSeconds,
      };
    }
  }
}

export type CapCheck = { ok: true } | { ok: false; layer: CapLayer; resetsInSeconds: number };

/** Fails on the first full layer, in the order of LIMITS. */
export async function checkCaps(
  store: CounterStore,
  who: Requester,
  now: Date,
  limits: readonly Limit[] = LIMITS,
): Promise<CapCheck> {
  for (const limit of limits) {
    const bucket = bucketFor(limit, who, now);
    if ((await store.get(bucket.key)) >= limit.max) {
      return { ok: false, layer: limit.layer, resetsInSeconds: bucket.resetsInSeconds };
    }
  }
  return { ok: true };
}

/** Called after every model call, graded or not: a failed parse still cost money. */
export async function recordUsage(
  store: CounterStore,
  who: Requester,
  now: Date,
  costUsd: number,
  limits: readonly Limit[] = LIMITS,
): Promise<void> {
  for (const limit of limits) {
    const bucket = bucketFor(limit, who, now);
    const amount = limit.unit === "usd" ? costUsd : 1;
    await store.add(bucket.key, amount, bucket.ttlSeconds);
  }
}
