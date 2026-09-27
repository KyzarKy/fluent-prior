// A grader that never calls a model, for UI work and tests without a key or a bill. The
// server uses it only when GRADER=fake is set, so it can't be switched on by accident.

import type { Grader } from "./grader";

export const fakeGrader: Grader = async (scenario, answer) => {
  const [first, second] = scenario.targetSkills;
  return {
    ok: true,
    costUsd: 0,
    output: {
      taskMet: answer.length > 20 ? "yes" : "partly",
      feedback: "(Fake grader) Clear and polite. Try adding one more detail.",
      betterVersion: answer,
      skillsUsed: [
        ...(first
          ? [{ skill: first, correct: true, quote: answer.slice(0, 30), note: "Fake: correct." }]
          : []),
        ...(second
          ? [{ skill: second, correct: false, quote: answer.slice(0, 30), note: "Fake: wrong." }]
          : []),
      ],
    },
  };
};
