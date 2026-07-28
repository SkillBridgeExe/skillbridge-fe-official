// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LearningSession from "./LearningSession";

const mocks = vi.hoisted(() => ({
  loadActive: vi.fn(() => new Promise(() => undefined)),
  setActiveRoadmap: vi.fn(),
  clearRoadmap: vi.fn(),
  weekPlans: [] as Array<{
    weekNumber: number;
    moduleId: string;
    moduleTitle: string;
    sessions: Array<Record<string, unknown>>;
  }>,
}));

vi.mock("@/components/layout/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === "learning.session.loadingRoadmap"
        ? "Đang tải lộ trình..."
        : key,
  }),
}));
vi.mock("@/components/learning", () => ({
  SessionDetail: () => <div>session detail</div>,
}));
vi.mock("@/components/learning/roadmap-store", () => ({
  useActiveWeekPlans: () => mocks.weekPlans,
  useRoadmapStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      setActiveRoadmap: mocks.setActiveRoadmap,
      clearRoadmap: mocks.clearRoadmap,
    }),
}));
vi.mock("@/services/learning-roadmaps-v2.service", () => ({
  getCurrentActiveLearningRoadmap: mocks.loadActive,
  hydrateActiveLearningRoadmap: (
    load: () => Promise<unknown>,
    setActive: (roadmap: unknown) => void,
    clear: () => void,
  ) =>
    load().then((roadmap) => {
      if (roadmap) setActive(roadmap);
      else clear();
      return roadmap;
    }),
}));
vi.mock("@/store/useSidebarStore", () => ({
  useSidebarStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({ setCollapsed: vi.fn(), setForceCollapsed: vi.fn() }),
    { getState: () => ({ collapsed: false }) },
  ),
}));

describe("LearningSession", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
    mocks.weekPlans = [];
  });

  afterEach(cleanup);

  it("waits for the server roadmap before redirecting an empty local cache", () => {
    render(
      <MemoryRouter initialEntries={["/learning/session/session-1"]}>
        <Routes>
          <Route path="/learning/session/:id" element={<LearningSession />} />
          <Route path="/learning" element={<div>learning destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status").textContent).toContain("Đang tải lộ trình");
    expect(screen.queryByText("learning destination")).toBeNull();
  });

  it("renders an owner-validated cached session while the server refresh is pending", () => {
    mocks.weekPlans = [
      {
        weekNumber: 1,
        moduleId: "module-1",
        moduleTitle: "React",
        sessions: [
          {
            id: "session-1",
            moduleId: "module-1",
            sessionNumber: 1,
            title: "React foundations",
            skill: "React",
            dayOfWeek: 1,
            estimatedMinutes: 60,
            status: "in-progress",
            stars: 0,
            maxStars: 5,
            sections: [],
            resources: [],
          },
        ],
      },
    ];

    render(
      <MemoryRouter initialEntries={["/learning/session/session-1"]}>
        <Routes>
          <Route path="/learning/session/:id" element={<LearningSession />} />
          <Route path="/learning" element={<div>learning destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("session detail")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
