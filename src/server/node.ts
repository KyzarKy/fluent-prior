// Local development entry: serves the API on :8790, where Vite proxies /api. GRADER picks
// the grader: groq (default, free, with a backup model; ADRs 0004 and 0009), anthropic, or fake (no model at all).

import Anthropic from "@anthropic-ai/sdk";
import { serve } from "@hono/node-server";
import Groq from "groq-sdk";
import { createAnthropicGrader } from "./anthropic-grader.js";
import { createApp } from "./app.js";
import { createMemoryStore } from "./cap-store.js";
import { fakeGrader } from "./fake-grader.js";
import { type Grader, withBackup } from "./grader.js";
import { createGroqGrader, GROQ_BACKUP_MODEL } from "./groq-grader.js";

function chooseGrader(name: string): Grader {
  switch (name) {
    case "groq": {
      const groq = new Groq();
      return withBackup(createGroqGrader(groq), createGroqGrader(groq, GROQ_BACKUP_MODEL));
    }
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
