// The default grader (ADR 0004): gpt-oss-120b on Groq's free tier. The account has no
// payment method, so running out of quota is an HTTP 429, never a bill.

import Groq from "groq-sdk";
import { z } from "zod";
import { GraderOutput } from "../core/contract.js";
import { costUsd } from "../core/pricing.js";
import {
  type Grader,
  MAX_OUTPUT_TOKENS,
  parseReply,
  SYSTEM_PROMPT,
  userMessage,
} from "./grader.js";

export const GROQ_MODEL = "openai/gpt-oss-120b";
const OUTPUT_SCHEMA = z.toJSONSchema(GraderOutput);
/** If Groq doesn't say when the quota resets, assume the daily window. */
const DEFAULT_RETRY_SECONDS = 60 * 60;

export function createGroqGrader(client: Groq): Grader {
  return async (scenario, answer) => {
    const request = () =>
      client.chat.completions.create({
        model: GROQ_MODEL,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        reasoning_effort: "medium",
        response_format: {
          type: "json_schema",
          json_schema: { name: "grade", schema: OUTPUT_SCHEMA, strict: true },
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage(scenario, answer) },
        ],
      });
    try {
      // Groq rejects a reply that breaks the schema (1 in 60 in the first eval). A second
      // sample usually passes, and calls on the free tier cost nothing, so retry once.
      const response = await request().catch((error: unknown) => {
        if (error instanceof Groq.BadRequestError && error.message.includes("json_validate_failed"))
          return request();
        throw error;
      });
      const usage = response.usage;
      const cost = costUsd(GROQ_MODEL, {
        input_tokens: usage?.prompt_tokens ?? 0,
        output_tokens: usage?.completion_tokens ?? 0,
      });
      const choice = response.choices[0];
      if (choice?.finish_reason !== "stop") {
        return { ok: false, reason: `finish_reason ${choice?.finish_reason}`, costUsd: cost };
      }
      const outcome = parseReply(choice.message.content, cost);
      if (!outcome.ok) return outcome;
      const tokens = {
        input: usage?.prompt_tokens ?? 0,
        cachedInput: usage?.prompt_tokens_details?.cached_tokens ?? 0,
        output: usage?.completion_tokens ?? 0,
        reasoning: usage?.completion_tokens_details?.reasoning_tokens ?? 0,
      };
      return { ...outcome, tokens };
    } catch (error) {
      if (error instanceof Groq.RateLimitError) {
        const retryAfter = Number(error.headers?.get?.("retry-after"));
        return {
          ok: false,
          reason: "quota",
          costUsd: 0,
          retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : DEFAULT_RETRY_SECONDS,
        };
      }
      throw error;
    }
  };
}
