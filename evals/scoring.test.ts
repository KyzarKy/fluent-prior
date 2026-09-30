import { describe, expect, it } from "vitest";
import { compareSkills, precisionRecallF05, wilson } from "./scoring";

describe("compareSkills", () => {
  it("credits an accepted alternative skill", () => {
    const key = [{ skill: "modal-verbs", alsoAccept: ["future-forms"] }];
    expect(compareSkills(key, ["future-forms"], []).caught).toEqual(["modal-verbs"]);
  });

  it("counts two mistakes in one skill once, as the learner model does", () => {
    const key = [{ skill: "past-regular" }, { skill: "past-regular" }];
    expect(compareSkills(key, [], [])).toMatchObject({ missed: ["past-regular"] });
  });

  it("neither requires nor penalizes optional mistakes and out-of-catalog alternatives", () => {
    const key = [
      { skill: "plurals", optional: true },
      { skill: null, alsoAccept: ["modal-verbs"] },
    ];
    expect(compareSkills(key, ["plurals", "modal-verbs"], [])).toEqual({
      caught: [],
      missed: [],
      invented: [],
      falseCredit: [],
    });
  });

  it("reports invented mistakes and false credit", () => {
    const result = compareSkills([{ skill: "articles" }], ["plurals"], ["articles"]);
    expect(result.invented).toEqual(["plurals"]);
    expect(result.falseCredit).toEqual(["articles"]);
  });
});

describe("precisionRecallF05", () => {
  it("weights precision over recall", () => {
    const precise = precisionRecallF05(5, 5, 0).f05;
    const thorough = precisionRecallF05(5, 0, 5).f05;
    expect(precise).toBeGreaterThan(thorough);
  });
});

describe("wilson", () => {
  it("gives the familiar interval for 16 of 20", () => {
    const [low, high] = wilson(16, 20);
    expect(low).toBeCloseTo(0.584, 2);
    expect(high).toBeCloseTo(0.919, 2);
  });
});
