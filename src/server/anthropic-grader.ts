// Grades with Claude Sonnet 5. Not the default since ADR 0004; selected with
// GRADER=anthropic.

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GraderOutput } from "../core/contract";
import { costUsd } from "../core/pricing";
import { type Grader, MAX_OUTPUT_TOKENS, parseReply, SYSTEM_PROMPT, userMessage } from "./grader";

export const ANTHROPIC_MODEL = "claude-sonnet-5";

export function createAnthropicGrader(client: Anthropic): Grader {
  return async (scenario, answer) => {
    // create(), not parse(): parse() throws on a bad reply before we can read the usage,
    // and every paid call has to reach the spend caps.
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage(scenario, answer) }],
      output_config: { effort: "medium", format: zodOutputFormat(GraderOutput) },
    });
    const cost = costUsd(ANTHROPIC_MODEL, response.usage);
    if (response.stop_reason !== "end_turn") {
      return { ok: false, reason: `stop_reason ${response.stop_reason}`, costUsd: cost };
    }
    const text = response.content.find((block) => block.type === "text")?.text;
    return parseReply(text, cost);
  };
}
