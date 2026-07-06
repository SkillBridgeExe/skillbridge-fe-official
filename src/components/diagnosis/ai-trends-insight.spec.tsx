// @vitest-environment jsdom
// Regression for the 2026-07-06 contract-sync audit: the FE used to type/filter
// insights on `.title/.detail` (fields the BE never sends) → every REAL BE item
// was dropped and the card rendered 0 insights. This locks the BE-shaped
// response to N rendered cards + the honest signals (sample size / stale line).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AiTrendsInsight } from "./AiTrendsInsight";
import { useTrendsInsightQuery } from "@/hooks/use-diagnosis";
import type { TrendsInsightResponse } from "@shared/api";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === "aiInsight.sampleSize") return `based on ${opts?.count} postings`;
      if (key === "aiInsight.pctOfPostings") return `${opts?.pct}% of postings`;
      return key;
    },
  }),
}));

vi.mock("@/hooks/use-diagnosis", () => ({
  useTrendsInsightQuery: vi.fn(),
}));

const mockedQuery = vi.mocked(useTrendsInsightQuery);

/** Response-shaped fixture mirroring BE trends-insight.types.ts exactly. */
function makeResponse(overrides: Partial<TrendsInsightResponse> = {}): TrendsInsightResponse {
  return {
    role_code: "frontend_developer",
    period: "2026-07",
    sample_size: 128,
    data_confidence: "high",
    personalized: true,
    summary: "React dẫn đầu nhu cầu tuyển frontend.",
    insights: [
      {
        skill: "react",
        display_name: "React",
        pct_of_postings: 62.5,
        trend_delta: 4.2,
        covered: true,
        comment: "Xuất hiện trong phần lớn tin frontend.",
      },
      {
        skill: "typescript",
        display_name: "TypeScript",
        pct_of_postings: 48.1,
        trend_delta: null,
        covered: false,
        comment: "CV của bạn chưa nhắc tới TypeScript.",
      },
    ],
    recommended_skills: [
      { skill: "nextjs", display_name: "Next.js", pct_of_postings: 30.2, salary_p50_vnd: 18_000_000 },
    ],
    skill_pairs: [
      {
        a: "react",
        a_display: "React",
        b: "typescript",
        b_display: "TypeScript",
        pair_count: 41,
        pct_of_postings: 32.0,
        comment: "Hai kỹ năng này thường được tuyển cùng nhau.",
      },
    ],
    cached: false,
    ...overrides,
  };
}

function mockData(data: TrendsInsightResponse | undefined) {
  mockedQuery.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isRefetching: false,
  } as unknown as ReturnType<typeof useTrendsInsightQuery>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AiTrendsInsight (BE contract shape)", () => {
  it("renders every BE-shaped insight item (display_name + comment + numbers)", () => {
    mockData(makeResponse());
    render(<AiTrendsInsight cvId="cv-1" role="frontend_developer" />);

    // The old .title/.detail mapping rendered ZERO of these.
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Xuất hiện trong phần lớn tin frontend.")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("CV của bạn chưa nhắc tới TypeScript.")).toBeInTheDocument();
    // Numbers re-attached from FACTS.
    expect(screen.getByText("62.5% of postings")).toBeInTheDocument();
    // Honest signals.
    expect(screen.getByText("based on 128 postings")).toBeInTheDocument();
    expect(screen.getByText("aiInsight.confidence.high")).toBeInTheDocument();
    // Recommended skills keyed by BE `skill`, labeled by display_name.
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    // Skill pair row.
    expect(screen.getByText(/React \+ TypeScript/)).toBeInTheDocument();
    expect(screen.getByText("Hai kỹ năng này thường được tuyển cùng nhau.")).toBeInTheDocument();
  });

  it("shows the stale-data disclosure line when stale=true and hides it otherwise", () => {
    mockData(makeResponse({ stale: true }));
    const { unmount } = render(<AiTrendsInsight cvId="cv-1" />);
    expect(screen.getByText("aiInsight.stale")).toBeInTheDocument();
    unmount();

    mockData(makeResponse());
    render(<AiTrendsInsight cvId="cv-1" />);
    expect(screen.queryByText("aiInsight.stale")).not.toBeInTheDocument();
  });

  it("omits the skill-pairs block when the BE sends an empty list", () => {
    mockData(makeResponse({ skill_pairs: [] }));
    render(<AiTrendsInsight cvId="cv-1" />);
    expect(screen.queryByText("aiInsight.pairsTitle")).not.toBeInTheDocument();
  });
});
