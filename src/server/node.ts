// Local development entry: serves the API on :8790, where Vite proxies /api.

import Anthropic from "@anthropic-ai/sdk";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createMemoryStore } from "./cap-store";
import { fakeGrader } from "./fake-grader";
import { createGrader } from "./grader";

const useFake = process.env.GRADER === "fake";
if (useFake) console.warn("GRADER=fake: answers are not really graded.");

const app = createApp({
  grade: useFake ? fakeGrader : createGrader(new Anthropic()),
  store: createMemoryStore(),
  ipHashSalt: process.env.IP_HASH_SALT ?? "local-dev",
});

serve({ fetch: app.fetch, port: 8790 }, (info) => {
  console.log(`API on http://localhost:${info.port}`);
});
