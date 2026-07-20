import { describe, expect, it } from "vitest";
import { resolveBlockedNavigation } from "./use-unsaved-navigation-guard";

describe("data-router unsaved navigation guard decisions", () => {
  it("proceeds or resets each blocked transition exactly once", () => {
    expect(resolveBlockedNavigation("blocked", true)).toBe("proceed");
    expect(resolveBlockedNavigation("blocked", false)).toBe("reset");
    expect(resolveBlockedNavigation("unblocked", true)).toBe("none");
  });
});
