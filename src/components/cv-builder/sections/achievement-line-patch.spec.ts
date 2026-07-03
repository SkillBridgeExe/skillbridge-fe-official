import { describe, expect, it } from "vitest";
import {
  getAchievementLine,
  parseAchievementFieldIndex,
  replaceAchievementLine,
  suggestionKeyForField,
} from "./achievement-line-patch";

describe("achievement-line-patch", () => {
  it("reads the exact achievement line matched by prove-it", () => {
    expect(getAchievementLine("First line\nReact line\nLast line", 1)).toBe("React line");
  });

  it("replaces only the matched achievement line and preserves the rest of the textarea", () => {
    expect(replaceAchievementLine("First line\nReact line\nLast line", 1, "Improved React dashboard")).toBe(
      "First line\nImproved React dashboard\nLast line",
    );
  });

  it("uses a line-specific suggestion key so undo does not collide with whole-field rewrites", () => {
    expect(suggestionKeyForField("exp-1", "achievements", 2)).toBe("exp-1_achievements[2]");
    expect(suggestionKeyForField("exp-1", "achievements")).toBe("exp-1_achievements");
  });

  it("parses an achievements[n] field path without leaking NaN", () => {
    expect(parseAchievementFieldIndex("achievements[3]")).toBe(3);
    expect(parseAchievementFieldIndex("description")).toBeUndefined();
  });
});
