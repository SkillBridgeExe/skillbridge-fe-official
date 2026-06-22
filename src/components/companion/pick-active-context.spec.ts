import { describe, expect, it } from "vitest";
import { pickActiveContext } from "./pick-active-context";

describe("pickActiveContext", () => {
  it("picks the most-visible context", () => {
    expect(
      pickActiveContext([
        { id: "a", ratio: 0.2 },
        { id: "b", ratio: 0.8 },
      ]),
    ).toBe("b");
  });

  it("returns null when nothing is visible", () => {
    expect(pickActiveContext([{ id: "a", ratio: 0 }])).toBeNull();
  });

  it("breaks ties by higher priority", () => {
    expect(
      pickActiveContext([
        { id: "a", ratio: 0.5, priority: 1 },
        { id: "b", ratio: 0.5, priority: 5 },
      ]),
    ).toBe("b");
  });

  it("returns null for empty array", () => {
    expect(pickActiveContext([])).toBeNull();
  });
});
