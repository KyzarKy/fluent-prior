// Local development entry: serves the API on :8787, where Vite proxies /api.

import Anthropic from "@anthropic-ai/sdk";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createMemoryStore } from "./cap-store";
import { createGrader } from "./grader";

const app = createApp({
  grade: createGrader(new Anthropic()),
  store: createMemoryStore(),
  ipHashSalt: process.env.IP_HASH_SALT ?? "local-dev",
});

serve({ fetch: app.fetch, port: 8787 }, (info) => {
  console.log(`API on http://localhost:${info.port}`);
});
