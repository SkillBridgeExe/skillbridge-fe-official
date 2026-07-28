// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LearningSession from "./LearningSession";

const mocks = vi.hoisted(() => ({
  loadActive: vi.fn(() => new Promise(() => undefined)),
  setActiveRoadmap: vi.fn(),
  clearRoadmap: vi.fn(),
}));

vi.mock("@/components/layout/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/learning", () => ({
  SessionDetail: () => <div>session detail</div>,
}));
vi.mock("@/components/learning/roadmap-store", () => ({
  useActiveWeekPlans: () => [],
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
  });

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
});
