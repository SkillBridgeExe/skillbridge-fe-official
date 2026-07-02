import { describe, expect, it } from "vitest";
import { findBulletWithSkill } from "./find-bullet-with-skill";

const entries = [
  {
    id: "exp-1",
    description: "Built REST APIs with Node.js and PostgreSQL.",
    achievements: "- Reduced latency by 20%\n- Wrote React components for admin dashboards",
  },
  {
    id: "exp-2",
    description: "Maintained mobile releases.",
    achievements: "Shipped React Native screens",
  },
];

describe("findBulletWithSkill", () => {
  it("finds a skill mention in the description first", () => {
    expect(findBulletWithSkill(entries, { canonical: "node_js", displayName: "Node.js" })).toEqual({
      entryId: "exp-1",
      field: "description",
    });
  });

  it("finds a skill mention in a specific achievements line", () => {
    expect(findBulletWithSkill(entries, { canonical: "react", displayName: "React" })).toEqual({
      entryId: "exp-1",
      field: "achievements[1]",
    });
  });

  it("normalizes hyphen/underscore canonical names", () => {
    expect(findBulletWithSkill(entries, { canonical: "react-native", displayName: "React Native" })).toEqual({
      entryId: "exp-2",
      field: "achievements[0]",
    });
  });

  it("returns null when the CV has no matching bullet", () => {
    expect(findBulletWithSkill(entries, { canonical: "docker", displayName: "Docker" })).toBeNull();
  });
});
