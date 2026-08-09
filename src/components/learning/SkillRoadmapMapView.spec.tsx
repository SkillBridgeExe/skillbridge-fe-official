// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SkillRoadmapMapView } from "./SkillRoadmapMapView";

const roadmapMocks = vi.hoisted(() => ({
  weeks: [
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
  ] as Array<Record<string, unknown>>,
}));

vi.mock("@/components/learning/roadmap-store", () => ({
  useActiveWeekPlans: () => roadmapMocks.weeks,
}));

vi.mock("@/store/useSidebarStore", () => ({
  useSidebarStore: (selector: (state: { collapsed: boolean }) => unknown) =>
    selector({ collapsed: false }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" } }),
}));

describe("SkillRoadmapMapView integration", () => {
  afterEach(() => {
    cleanup();
    roadmapMocks.weeks = [
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
    ];
  });

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

  it("keeps every subject and groups its sessions by calendar week", () => {
    roadmapMocks.weeks = [
      {
        weekNumber: 1,
        moduleId: "module-react",
        moduleTitle: "React",
        sessions: [
          {
            id: "session-react-1",
            moduleId: "module-react",
            skillCanonical: "react",
            sessionNumber: 1,
            title: "React foundations",
            skill: "React",
            dayOfWeek: 2,
            estimatedMinutes: 60,
            status: "in-progress",
            stars: 0,
            maxStars: 3,
            sections: [],
            resources: [],
          },
        ],
      },
      {
        weekNumber: 1,
        moduleId: "module-typescript",
        moduleTitle: "TypeScript",
        sessions: [
          {
            id: "session-typescript-1",
            moduleId: "module-typescript",
            skillCanonical: "typescript",
            sessionNumber: 1,
            title: "TypeScript foundations",
            skill: "TypeScript",
            dayOfWeek: 3,
            estimatedMinutes: 60,
            status: "locked",
            stars: 0,
            maxStars: 3,
            sections: [],
            resources: [],
          },
        ],
      },
      {
        weekNumber: 2,
        moduleId: "module-typescript",
        moduleTitle: "TypeScript",
        sessions: [
          {
            id: "session-typescript-2",
            moduleId: "module-typescript",
            skillCanonical: "typescript",
            sessionNumber: 2,
            title: "TypeScript application",
            skill: "TypeScript",
            dayOfWeek: 4,
            estimatedMinutes: 60,
            status: "locked",
            stars: 0,
            maxStars: 3,
            sections: [],
            resources: [],
          },
        ],
      },
    ];

    render(
      <MemoryRouter>
        <SkillRoadmapMapView />
      </MemoryRouter>,
    );

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getAllByText("TypeScript").length).toBeGreaterThan(0);
    expect(screen.getByText("Week 2")).toBeInTheDocument();
    expect(screen.getByText("TypeScript application")).toBeInTheDocument();
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

  it("removes the Escape listener when the active roadmap is cleared", () => {
    const { rerender } = render(
      <MemoryRouter>
        <SkillRoadmapMapView />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));

    roadmapMocks.weeks = [];
    rerender(
      <MemoryRouter>
        <SkillRoadmapMapView />
      </MemoryRouter>,
    );

    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
  });
});
