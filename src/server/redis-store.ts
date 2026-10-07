// The production CounterStore (ADR 0007): Upstash Redis, shared by every serverless
// instance. It behaves like the in-memory store in cap-store.ts, which the cap tests use.

import type { Redis } from "@upstash/redis";
import type { CounterStore } from "../core/caps.js";

export function createRedisStore(redis: Redis): CounterStore {
  return {
    async get(key) {
      // A missing key is null. Upstash parses numeric strings, but Number() covers both.
      return Number((await redis.get(key)) ?? 0);
    },
    async add(key, amount, ttlSeconds) {
      // Dollar amounts are fractions, so INCRBYFLOAT. NX sets the expiry only on a window's
      // first write; resetting it on every write would keep a busy window open forever.
      await redis.multi().incrbyfloat(key, amount).expire(key, ttlSeconds, "NX").exec();
    },
  };
}
