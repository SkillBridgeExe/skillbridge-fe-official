// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { StoryReadinessPanel } from "./StoryReadinessPanel";
import type { GapItem, StoryReadinessResponse } from "@shared/api";

// i18n: echo the key so we can assert which branch rendered.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

function makeGap(overrides: Partial<GapItem> = {}): GapItem {
  return {
    requirement_id: "req-1",
    source: "role_rubric",
    type: "hard_skill",
    canonical_name: "typescript",
    display_name: "TypeScript",
    importance: "REQUIRED",
    cv_status: "missing",
    cv_level: 0,
    required_level: 3,
    gap_levels: 3,
    satisfied_by: null,
    evidence_refs: [],
    evidence_risk: "none",
    fixability: "learn",
    market_demand: 0.8,
    severity: 0.9,
    confidence: 0.7,
    recommended_next_action: "Học TypeScript qua dự án thực tế",
    ...overrides,
  };
}

const baseData: StoryReadinessResponse = {
  readiness: 68,
  band: "building",
  overall_score: 62,
  required_coverage: 0.5,
  matched_count: 4,
  missing_count: 1,
  gap_items: [makeGap()],
  roadmap_pointer: { route: "/learning/roadmap", payload: { role_code: "frontend_developer" } },
  role_has_rubric: true,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StoryReadinessPanel", () => {
  it("renders score, gap details and navigates to the roadmap on CTA", () => {
    render(<StoryReadinessPanel data={baseData} onClose={() => {}} />);

    expect(screen.getByText("68%")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    // recommended_next_action is rendered verbatim from BE data (not translated).
    expect(screen.getByText("Học TypeScript qua dự án thực tế")).toBeInTheDocument();

    fireEvent.click(screen.getByText("builder.storyReadiness.roadmapBtn"));
    expect(mockNavigate).toHaveBeenCalledWith("/learning/roadmap", {
      state: { role_code: "frontend_developer" },
    });
  });

  it("honest no-rubric state: hides the numeric score, gaps and roadmap CTA", () => {
    render(
      <StoryReadinessPanel
        data={{ ...baseData, role_has_rubric: false, readiness: 0, band: "starting", gap_items: [] }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("builder.storyReadiness.noRubricTitle")).toBeInTheDocument();
    // Anti-fabrication: no meaningless "0%" — an em-dash placeholder instead.
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("68%")).not.toBeInTheDocument();
    // Gap list + roadmap CTA are suppressed when there is no rubric.
    expect(screen.queryByText("builder.storyReadiness.gapListTitle")).not.toBeInTheDocument();
    expect(screen.queryByText("builder.storyReadiness.roadmapBtn")).not.toBeInTheDocument();
  });

  it("shows the honest empty-gap state when there are no gaps", () => {
    render(
      <StoryReadinessPanel data={{ ...baseData, gap_items: [], missing_count: 0 }} onClose={() => {}} />,
    );
    expect(screen.getByText("builder.storyReadiness.noGapsTitle")).toBeInTheDocument();
  });
});
