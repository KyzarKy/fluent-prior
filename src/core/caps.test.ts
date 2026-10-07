import { describe, expect, it } from "vitest";
import { type CounterStore, checkCaps, type Limit, type Requester, recordUsage } from "./caps.js";
import { costUsd } from "./pricing.js";

/** Ignores expiry; tests move the clock into a new bucket instead. */
function memoryStore(): CounterStore {
  const counts = new Map<string, number>();
  return {
    get: async (key) => counts.get(key) ?? 0,
    add: async (key, amount) => {
      counts.set(key, (counts.get(key) ?? 0) + amount);
    },
  };
}

const who: Requester = { sessionId: "s1", learnerId: "l1", networkId: "n1" };
const noon = new Date("2026-09-26T12:00:10Z");

describe("checkCaps", () => {
  const limits: Limit[] = [{ layer: "learner", window: "minute", unit: "answers", max: 2 }];

  it("blocks once a layer is full, and says when it resets", async () => {
    const store = memoryStore();
    await recordUsage(store, who, noon, 0.01, limits);
    expect(await checkCaps(store, who, noon, limits)).toEqual({ ok: true });
    await recordUsage(store, who, noon, 0.01, limits);
    expect(await checkCaps(store, who, noon, limits)).toEqual({
      ok: false,
      layer: "learner",
      resetsInSeconds: 50,
    });
  });

  it("opens again in the next window", async () => {
    const store = memoryStore();
    await recordUsage(store, who, noon, 0.01, limits);
    await recordUsage(store, who, noon, 0.01, limits);
    expect(await checkCaps(store, who, new Date("2026-09-26T12:01:00Z"), limits)).toEqual({
      ok: true,
    });
  });

  it("counts other learners separately", async () => {
    const store = memoryStore();
    await recordUsage(store, who, noon, 0.01, limits);
    await recordUsage(store, who, noon, 0.01, limits);
    expect(await checkCaps(store, { ...who, learnerId: "l2" }, noon, limits)).toEqual({ ok: true });
  });

  it("caps the whole app in dollars across learners", async () => {
    const store = memoryStore();
    const appLimit: Limit[] = [{ layer: "app", window: "month", unit: "usd", max: 0.05 }];
    await recordUsage(store, who, noon, 0.03, appLimit);
    await recordUsage(store, { ...who, learnerId: "l2" }, noon, 0.03, appLimit);
    const check = await checkCaps(store, { ...who, learnerId: "l3" }, noon, appLimit);
    expect(check).toMatchObject({ ok: false, layer: "app" });
  });
});

describe("costUsd", () => {
  it("prices Sonnet 5 input and output tokens", () => {
    // 1,500 in at $2/M plus 700 out at $10/M
    expect(costUsd("claude-sonnet-5", { input_tokens: 1500, output_tokens: 700 })).toBeCloseTo(
      0.01,
    );
  });

  it("refuses a model with no price, so caps can't silently read zero", () => {
    expect(() => costUsd("mystery-model", { input_tokens: 1, output_tokens: 1 })).toThrow();
  });
});
