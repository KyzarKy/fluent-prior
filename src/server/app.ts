// The HTTP API: health and grading. Every model call passes the spend caps first and
// records its cost afterward (ADR 0003). Dependencies come in as arguments so tests can
// swap the grader and the counter store.

import { createHash } from "node:crypto";
import { type Context, Hono } from "hono";
import { type CounterStore, checkCaps, recordUsage } from "../core/caps.js";
import { type CapExceeded, GradeRequest, type GradeResponse } from "../core/contract.js";
import { findScenario } from "../core/scenarios.js";
import { taskVerdict } from "../core/tasks.js";
import type { Grader } from "./grader.js";

export interface AppDeps {
  grade: Grader;
  store: CounterStore;
  ipHashSalt: string;
  now?: () => Date;
}

/**
 * The client's IP address. Hosting platforms set these headers; locally they're absent.
 * Before deploying, confirm the host overwrites them so a client can't pick its own.
 */
function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return c.req.header("x-real-ip") ?? forwarded ?? "local";
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono().basePath("/api");

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/grade", async (c) => {
    const body = GradeRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "invalid-request" }, 400);

    const scenario = findScenario(body.data.scenarioId);
    if (!scenario) return c.json({ error: "unknown-scenario" }, 404);

    const who = {
      sessionId: body.data.sessionId,
      learnerId: body.data.learnerId,
      networkId: createHash("sha256")
        .update(deps.ipHashSalt + clientIp(c))
        .digest("hex"),
    };
    const now = deps.now?.() ?? new Date();

    const check = await checkCaps(deps.store, who, now);
    if (!check.ok) {
      c.header("Retry-After", String(check.resetsInSeconds));
      const capped: CapExceeded = {
        error: "cap",
        layer: check.layer,
        resetsInSeconds: check.resetsInSeconds,
      };
      return c.json(capped, 429);
    }

    let outcome: Awaited<ReturnType<Grader>>;
    try {
      outcome = await deps.grade(scenario, body.data.answer);
    } catch (error) {
      // No response means nothing was billed, so there's no cost to record.
      console.error("Grader call failed:", error);
      return c.json({ error: "grader-unavailable" }, 502);
    }

    await recordUsage(deps.store, who, now, outcome.costUsd);
    if ("retryAfterSeconds" in outcome) {
      // The free grader's quota is a limit like our own app cap, so it reads the same.
      c.header("Retry-After", String(outcome.retryAfterSeconds));
      const capped: CapExceeded = {
        error: "cap",
        layer: "app",
        resetsInSeconds: outcome.retryAfterSeconds,
      };
      return c.json(capped, 429);
    }
    if (!outcome.ok) {
      console.error("Grader reply unusable:", outcome.reason);
      return c.json({ error: "grader-unavailable" }, 502);
    }
    // The verdict is computed here from the checklist, never taken from the model (ADR 0006).
    const taskMet = taskVerdict(scenario.taskParts.length, outcome.output.taskParts);
    if (!taskMet) {
      console.error("Grader reply unusable: task parts", outcome.output.taskParts);
      return c.json({ error: "grader-unavailable" }, 502);
    }
    const graded: GradeResponse = {
      grade: { ...outcome.output, taskMet },
      costUsd: outcome.costUsd,
    };
    return c.json(graded);
  });

  return app;
}
