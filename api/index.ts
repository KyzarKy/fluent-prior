// The production API on Vercel (ADR 0007): the same Hono app as local development, with the
// free grader and the spend-cap counters in Upstash Redis. vercel.json sends every /api
// path here. Unlike src/server/node.ts there's no GRADER switch: production stays free.

import { Redis } from "@upstash/redis";
import Groq from "groq-sdk";
import { createApp } from "../src/server/app.js";
import { withBackup } from "../src/server/grader.js";
import { createGroqGrader, GROQ_BACKUP_MODEL } from "../src/server/groq-grader.js";
import { createRedisStore } from "../src/server/redis-store.js";

const ipHashSalt = process.env.IP_HASH_SALT;
// A known salt would let anyone holding the counter keys test guesses at IP addresses.
if (!ipHashSalt) throw new Error("IP_HASH_SALT is not set");

const groq = new Groq();
const app = createApp({
  grade: withBackup(createGroqGrader(groq), createGroqGrader(groq, GROQ_BACKUP_MODEL)),
  store: createRedisStore(Redis.fromEnv()),
  ipHashSalt,
});

export default { fetch: app.fetch };
