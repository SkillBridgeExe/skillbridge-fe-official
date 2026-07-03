// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ProgressBanner } from "./ProgressBanner";
import { useMatchProgressQuery } from "@/hooks/use-diagnosis";
import type { ProgressReportDto } from "@shared/api";

// i18n: echo the key, but interpolate the two keys that carry real values so
// assertions can check the actual delta/name text the component composes.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === "progress.scoreDeltaLabel") return "overall score compared to previous scan";
      if (key === "progress.strengthsKept") return `Kept: ${opts?.names}`;
      return key;
    },
  }),
}));

vi.mock("@/hooks/use-diagnosis", () => ({
  useMatchProgressQuery: vi.fn(),
}));

const mockedQuery = vi.mocked(useMatchProgressQuery);

function makeData(overrides: Partial<ProgressReportDto> = {}): ProgressReportDto {
  return {
    baseline: false,
    prev_count: 3,
    curr_count: 2,
    gaps_closed: [],
    gaps_worsened: [],
    avg_severity_delta: 0,
    prev_score: 70,
    curr_score: 82,
    transitions: [],
    dimension_changes: [],
    evidence_recognized: [],
    strengths_kept: [],
    required_coverage_delta: null,
    template_changed: false,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProgressBanner", () => {
  it("renders nothing for a baseline scan (no prior match to compare against)", () => {
    mockedQuery.mockReturnValue({
      data: makeData({ baseline: true }),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useMatchProgressQuery>);

    const { container } = render(<ProgressBanner matchId="m1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the score delta and the closed-gap name when full progress data is available", () => {
    mockedQuery.mockReturnValue({
      data: makeData({
        transitions: [
          {
            canonical_name: "docker",
            display_name: "Docker",
            prev_status: "missing",
            curr_status: "matched",
            kind: "closed",
            prev_severity: 0.8,
            curr_severity: 0,
          },
        ],
      }),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useMatchProgressQuery>);

    render(<ProgressBanner matchId="m1" />);
    expect(screen.getByText(/\+12/)).toBeInTheDocument();
    expect(screen.getByText(/Docker/)).toBeInTheDocument();
    expect(screen.getByText("overall score compared to previous scan")).toBeInTheDocument();
  });

  it("hides the score row when the scoring template changed (honest — scores aren't comparable)", () => {
    mockedQuery.mockReturnValue({
      data: makeData({ template_changed: true, prev_score: null }),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useMatchProgressQuery>);

    render(<ProgressBanner matchId="m1" />);
    expect(screen.queryByText(/\+12/)).not.toBeInTheDocument();
    expect(screen.getByText("progress.templateChanged")).toBeInTheDocument();
  });

  it('calls onExplain when "Giải thích thêm" is clicked', () => {
    mockedQuery.mockReturnValue({
      data: makeData(),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useMatchProgressQuery>);
    const onExplain = vi.fn();

    render(<ProgressBanner matchId="m1" onExplain={onExplain} />);
    fireEvent.click(screen.getByText("progress.explain"));
    expect(onExplain).toHaveBeenCalledTimes(1);
  });
});
