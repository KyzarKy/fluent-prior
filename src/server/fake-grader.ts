// A grader that never calls a model, for UI work and tests without a key or a bill. The
// server uses it only when GRADER=fake is set, so it can't be switched on by accident.

import type { Grader } from "./grader";

export const fakeGrader: Grader = async (scenario, answer) => {
  const [first, second] = scenario.targetSkills;
  const quote = answer.slice(0, 30);
  return {
    ok: true,
    costUsd: 0,
    output: {
      mistakes: second ? [{ skill: second, quote, fix: "(fake fix)", why: "(fake rule)" }] : [],
      correctUses: first ? [{ skill: first, quote }] : [],
      // First part present, the rest missing, so the UI shows a partial answer.
      taskParts: scenario.taskParts.map((_, index) => ({
        part: index + 1,
        present: index === 0,
        evidence: index === 0 ? quote : "",
      })),
      tone: "neutral",
      feedback: "(Fake grader) Clear and polite. Try adding one more detail.",
      betterVersion: answer,
    },
  };
};
