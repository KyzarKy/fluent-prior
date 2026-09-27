// Local development entry: serves the API on :8790, where Vite proxies /api. GRADER picks
// the grader: groq (default, free; ADR 0004), anthropic, or fake (no model at all).

import Anthropic from "@anthropic-ai/sdk";
import { serve } from "@hono/node-server";
import Groq from "groq-sdk";
import { createAnthropicGrader } from "./anthropic-grader";
import { createApp } from "./app";
import { createMemoryStore } from "./cap-store";
import { fakeGrader } from "./fake-grader";
import type { Grader } from "./grader";
import { createGroqGrader } from "./groq-grader";

function chooseGrader(name: string): Grader {
  switch (name) {
    case "groq":
      return createGroqGrader(new Groq());
    case "anthropic":
      return createAnthropicGrader(new Anthropic());
    case "fake":
      console.warn("GRADER=fake: answers are not really graded.");
      return fakeGrader;
    default:
      throw new Error(`Unknown GRADER "${name}". Use groq, anthropic, or fake.`);
  }
}

const app = createApp({
  grade: chooseGrader(process.env.GRADER ?? "groq"),
  store: createMemoryStore(),
  ipHashSalt: process.env.IP_HASH_SALT ?? "local-dev",
});

serve({ fetch: app.fetch, port: 8790 }, (info) => {
  console.log(`API on http://localhost:${info.port}`);
});
