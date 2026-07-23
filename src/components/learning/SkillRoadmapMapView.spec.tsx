// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SkillRoadmapMapView } from "./SkillRoadmapMapView";

vi.mock("@/components/learning/roadmap-store", () => ({
  useActiveWeekPlans: () => [
    {
      weekNumber: 1,
      moduleId: "module-1",
      moduleTitle: "TypeScript",
      sessions: [
        {
          id: "session-1",
          moduleId: "module-1",
          skillCanonical: "typescript",
          sessionNumber: 1,
          title: "TypeScript foundations",
          skill: "TypeScript",
          dayOfWeek: 1,
          estimatedMinutes: 60,
          status: "in-progress",
          stars: 0,
          maxStars: 3,
          sections: [],
          resources: [],
        },
      ],
    },
  ],
}));

vi.mock("@/store/useSidebarStore", () => ({
  useSidebarStore: (selector: (state: { collapsed: boolean }) => unknown) =>
    selector({ collapsed: false }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" } }),
}));

describe("SkillRoadmapMapView integration", () => {
  afterEach(cleanup);

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

  it("uses Escape to close the drawer before leaving full screen", () => {
    render(
      <MemoryRouter>
        <SkillRoadmapMapView />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
    fireEvent.click(screen.getByRole("button", { name: /TypeScript foundations/i }));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Resources")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit full screen" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Full screen" })).toBeInTheDocument();
  });
});
