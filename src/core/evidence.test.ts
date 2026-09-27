// Pins the evidence table in ADR 0002. If these numbers change, the ADR changes with them.

import { describe, expect, it } from "vitest";
import { likelihoodRatios, paramsFor } from "./evidence";
import { SKILLS } from "./skills";

describe("paramsFor", () => {
  it("leaves clear skills at the base parameters", () => {
    const ratios = likelihoodRatios(paramsFor(SKILLS["past-irregular"], "app"));
    expect(ratios.correct).toBeCloseTo(4.5);
    expect(ratios.error).toBeCloseTo(8);
  });

  it("makes a correct faint form weak evidence", () => {
    const ratios = likelihoodRatios(paramsFor(SKILLS["third-person-s"], "app"));
    expect(ratios.correct).toBeCloseTo(0.95 / 0.6);
  });

  it("keeps a visible faint error as strong as a clear one", () => {
    const faint = likelihoodRatios(paramsFor(SKILLS.articles, "app"));
    const clear = likelihoodRatios(paramsFor(SKILLS["past-irregular"], "app"));
    expect(faint.error).toBeCloseTo(clear.error);
  });
});
