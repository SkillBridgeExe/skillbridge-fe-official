import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("SkillRoadmapMapView integration", () => {
  it("renders from normalized active week plans without depending on the legacy composed roadmap", () => {
    const componentPath = path.join(
      process.cwd(),
      "src",
      "components",
      "learning",
      "SkillRoadmapMapView.tsx",
    );

    expect(fs.existsSync(componentPath)).toBe(true);
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).toContain("useActiveWeekPlans");
    expect(source).not.toContain("composedRoadmap");
    expect(source).not.toContain("persistedRoadmap");

    const page = fs.readFileSync(
      path.join(process.cwd(), "src", "pages", "user", "Learning.tsx"),
      "utf8",
    );
    expect(page).toContain("<SkillRoadmapMapView />");
  });
});
