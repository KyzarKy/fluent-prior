// The production API on Vercel (ADR 0007): the same Hono app as local development, with the
// free grader and the spend-cap counters in Upstash Redis. vercel.json sends every /api
// path here. Unlike src/server/node.ts there's no GRADER switch: production stays free.

import { Redis } from "@upstash/redis";
import Groq from "groq-sdk";
import { createApp } from "../src/server/app.js";
import { createGroqGrader } from "../src/server/groq-grader.js";
import { createRedisStore } from "../src/server/redis-store.js";

const ipHashSalt = process.env.IP_HASH_SALT;
// A known salt would let anyone holding the counter keys test guesses at IP addresses.
if (!ipHashSalt) throw new Error("IP_HASH_SALT is not set");

const app = createApp({
  grade: createGroqGrader(new Groq()),
  store: createRedisStore(Redis.fromEnv()),
  ipHashSalt,
});

export default { fetch: app.fetch };
