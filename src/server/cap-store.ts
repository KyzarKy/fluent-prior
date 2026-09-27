// An in-memory CounterStore for local development. Serverless instances don't share
// memory, so production needs a durable store; choosing it is open in ADR 0003.

import type { CounterStore } from "../core/caps";

export function createMemoryStore(now: () => number = Date.now): CounterStore {
  const entries = new Map<string, { value: number; expiresAt: number }>();

  function live(key: string) {
    const entry = entries.get(key);
    if (entry && entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  return {
    async get(key) {
      return live(key)?.value ?? 0;
    },
    async add(key, amount, ttlSeconds) {
      const entry = live(key);
      entries.set(key, {
        value: (entry?.value ?? 0) + amount,
        // The window's expiry is set by its first write, like Redis INCR then EXPIRE NX.
        expiresAt: entry?.expiresAt ?? now() + ttlSeconds * 1000,
      });
    },
  };
}
