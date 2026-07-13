import { describe, expect, it } from "vitest";
import { normalizeUserSkill } from "./skills";

describe("normalizeUserSkill", () => {
  it("preserves the backend category used by dashboard grouping", () => {
    expect(
      normalizeUserSkill({
        id: "skill-1",
        displayName: "React",
        category: "frontend_framework",
        level: 4,
      }),
    ).toEqual({
      skillId: "skill-1",
      name: "React",
      skillName: "React",
      category: "frontend_framework",
      level: 4,
    });
  });
});
