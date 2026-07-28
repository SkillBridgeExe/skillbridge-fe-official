// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LearningSidebar } from "./LearningSidebar";

vi.mock("@/components/learning/roadmap-store", () => ({
  useActiveWeekPlans: () => [],
  useRoadmapStore: (selector: (state: { activeRoadmap: null }) => unknown) =>
    selector({ activeRoadmap: null }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("LearningSidebar accessibility", () => {
  afterEach(cleanup);

  it("exposes the star-qualified unit percentage as a progress bar", () => {
    render(<LearningSidebar />);

    expect(
      screen.getByRole("progressbar", {
        name: "learning.sidebar.unitsWithStars",
      }),
    ).toHaveAttribute("aria-valuenow", "0");
  });
});
