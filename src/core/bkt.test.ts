import { describe, expect, it } from "vitest";
import { BASE_PARAMS, posterior, update } from "./bkt.js";

const RIGHT = { right: 1, wrong: 0 };
const WRONG = { right: 0, wrong: 1 };
const MIXED = { right: 1, wrong: 1 };

describe("posterior", () => {
  it("applies Bayes' rule to a correct answer", () => {
    // 0.3 * 0.9 / (0.3 * 0.9 + 0.7 * 0.2) = 0.27 / 0.41
    expect(posterior(0.3, RIGHT, BASE_PARAMS)).toBeCloseTo(0.27 / 0.41, 10);
  });

  it("applies Bayes' rule to a wrong answer", () => {
    // 0.3 * 0.1 / (0.3 * 0.1 + 0.7 * 0.8) = 0.03 / 0.59
    expect(posterior(0.3, WRONG, BASE_PARAMS)).toBeCloseTo(0.03 / 0.59, 10);
  });

  it("multiplies the likelihoods of a correct and a wrong use in one answer", () => {
    // 0.3 * (0.9 * 0.1) / (0.3 * 0.09 + 0.7 * (0.2 * 0.8)) = 0.027 / 0.139
    expect(posterior(0.3, MIXED, BASE_PARAMS)).toBeCloseTo(0.027 / 0.139, 10);
  });
});

describe("update", () => {
  it("adds the chance of learning from the practice after conditioning", () => {
    const conditioned = posterior(0.3, WRONG, BASE_PARAMS);
    expect(update(0.3, WRONG, BASE_PARAMS)).toBeCloseTo(conditioned + (1 - conditioned) * 0.1, 10);
  });

  it("matches ADR 0002's table for one answer from the prior", () => {
    expect(update(0.3, WRONG, BASE_PARAMS)).toBeCloseTo(0.15, 2);
    expect(update(0.3, MIXED, BASE_PARAMS)).toBeCloseTo(0.27, 2);
    expect(update(0.3, RIGHT, BASE_PARAMS)).toBeCloseTo(0.69, 2);
  });

  it("climbs toward 1 with repeated correct answers", () => {
    let p = BASE_PARAMS.init;
    for (let i = 0; i < 10; i++) p = update(p, RIGHT, BASE_PARAMS);
    expect(p).toBeGreaterThan(0.99);
  });
});
