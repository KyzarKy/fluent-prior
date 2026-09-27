// Wire shapes: what the browser sends, what the grader must return, and what the server
// responds with. Types come from these schemas, and anything from the network or the model
// is `unknown` until one of them parses it (CLAUDE.md rule 2).

import { z } from "zod";
import { SKILL_IDS } from "./skills";

export const MAX_ANSWER_CHARS = 600;

export const GradeRequest = z.object({
  scenarioId: z.string(),
  answer: z.string().trim().min(1).max(MAX_ANSWER_CHARS),
  learnerId: z.uuid(),
  sessionId: z.uuid(),
});
export type GradeRequest = z.infer<typeof GradeRequest>;

// Sent to the model as its output schema, so it avoids length constraints that
// structured output doesn't support. Lengths are asked for in the prompt instead.
export const GraderOutput = z.object({
  taskMet: z.enum(["yes", "partly", "no"]),
  feedback: z.string(),
  betterVersion: z.string(),
  skillsUsed: z.array(
    z.object({
      skill: z.enum(SKILL_IDS),
      correct: z.boolean(),
      quote: z.string(),
      note: z.string(),
    }),
  ),
});
export type GraderOutput = z.infer<typeof GraderOutput>;

export const GradeResponse = z.object({
  grade: GraderOutput,
  costUsd: z.number(),
});
export type GradeResponse = z.infer<typeof GradeResponse>;

export const CapLayer = z.enum(["session", "learner", "network", "app"]);
export type CapLayer = z.infer<typeof CapLayer>;

export const CapExceeded = z.object({
  error: z.literal("cap"),
  layer: CapLayer,
  resetsInSeconds: z.number(),
});
export type CapExceeded = z.infer<typeof CapExceeded>;

export const ErrorResponse = z.object({
  error: z.enum(["invalid-request", "unknown-scenario", "grader-unavailable"]),
});
