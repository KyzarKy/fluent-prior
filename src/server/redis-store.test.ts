import type { Redis } from "@upstash/redis";
import { describe, expect, it } from "vitest";
import { createRedisStore } from "./redis-store.js";

/** Records the commands each transaction sends. */
function fakeRedis(stored: unknown = null) {
  const transactions: unknown[][] = [];
  const redis = {
    get: async () => stored,
    multi() {
      const commands: unknown[] = [];
      const tx = {
        incrbyfloat(...args: unknown[]) {
          commands.push(["incrbyfloat", ...args]);
          return tx;
        },
        expire(...args: unknown[]) {
          commands.push(["expire", ...args]);
          return tx;
        },
        exec: async () => transactions.push(commands),
      };
      return tx;
    },
  };
  return { redis: redis as unknown as Redis, transactions };
}

describe("createRedisStore", () => {
  it("adds and sets the expiry only if the window has none, in one transaction", async () => {
    const { redis, transactions } = fakeRedis();
    await createRedisStore(redis).add("cap:app:all:usd:day:0", 0.012, 86400);
    expect(transactions).toEqual([
      [
        ["incrbyfloat", "cap:app:all:usd:day:0", 0.012],
        ["expire", "cap:app:all:usd:day:0", 86400, "NX"],
      ],
    ]);
  });

  it("reads a missing counter as 0 and a stored one as a number", async () => {
    expect(await createRedisStore(fakeRedis(null).redis).get("k")).toBe(0);
    expect(await createRedisStore(fakeRedis("1.5").redis).get("k")).toBe(1.5);
  });
});
