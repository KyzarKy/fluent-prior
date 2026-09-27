import { describe, expect, it } from "vitest";
import { BASE_PARAMS, posterior, update } from "./bkt";

describe("posterior", () => {
  it("applies Bayes' rule to a correct answer", () => {
    // 0.3 * 0.9 / (0.3 * 0.9 + 0.7 * 0.2) = 0.27 / 0.41
    expect(posterior(0.3, true, BASE_PARAMS)).toBeCloseTo(0.27 / 0.41, 10);
  });

  it("applies Bayes' rule to a wrong answer", () => {
    // 0.3 * 0.1 / (0.3 * 0.1 + 0.7 * 0.8) = 0.03 / 0.59
    expect(posterior(0.3, false, BASE_PARAMS)).toBeCloseTo(0.03 / 0.59, 10);
  });
});

describe("update", () => {
  it("adds the chance of learning from the practice after conditioning", () => {
    const conditioned = posterior(0.3, false, BASE_PARAMS);
    expect(update(0.3, false, BASE_PARAMS)).toBeCloseTo(conditioned + (1 - conditioned) * 0.1, 10);
  });

  it("climbs toward 1 with repeated correct answers", () => {
    let p = BASE_PARAMS.init;
    for (let i = 0; i < 10; i++) p = update(p, true, BASE_PARAMS);
    expect(p).toBeGreaterThan(0.99);
  });
});
