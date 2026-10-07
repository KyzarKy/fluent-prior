import { describe, expect, it } from "vitest";
import { taskVerdict } from "./tasks.js";

const present = (part: number) => ({ part, present: true });
const missing = (part: number) => ({ part, present: false });

describe("taskVerdict", () => {
  it("is yes when every part is present", () => {
    expect(taskVerdict(2, [present(1), present(2)])).toBe("yes");
  });

  it("is partly when some parts are present", () => {
    expect(taskVerdict(3, [present(1), missing(2), present(3)])).toBe("partly");
  });

  it("is no when no part is present", () => {
    expect(taskVerdict(2, [missing(1), missing(2)])).toBe("no");
  });

  it("allows only yes or no for a one-part checklist", () => {
    expect(taskVerdict(1, [present(1)])).toBe("yes");
    expect(taskVerdict(1, [missing(1)])).toBe("no");
  });

  it("refuses a report that skips, repeats, or invents parts", () => {
    expect(taskVerdict(2, [present(1)])).toBeNull();
    expect(taskVerdict(2, [present(1), present(1)])).toBeNull();
    expect(taskVerdict(2, [present(1), present(3)])).toBeNull();
  });
});
