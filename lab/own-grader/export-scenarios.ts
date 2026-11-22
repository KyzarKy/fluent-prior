// Writes the scenario pack to data/scenarios.json for the Python side and for the
// subagents that write correct answers. sampleAnswer is left out: it comes from the answer
// key, and nothing that makes training data may see the key (ADR 0010).
//
//   npx tsx lab/own-grader/export-scenarios.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { ROLE_NAMES, SCENARIOS } from "../../src/core/scenarios.js";

const scenarios = SCENARIOS.map(({ sampleAnswer: _key, role, ...rest }) => ({
  ...rest,
  role: ROLE_NAMES[role],
}));

mkdirSync("lab/own-grader/data", { recursive: true });
writeFileSync("lab/own-grader/data/scenarios.json", `${JSON.stringify(scenarios, null, 2)}\n`);
console.log(`Wrote ${scenarios.length} scenarios.`);
