// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDiagnosisChatCompanion } from "./useDiagnosisChatCompanion";
import { useCompanionStore } from "@/store/useCompanionStore";
import type { CvReviewData, ProgressReportDto, GapTransitionDto } from "@shared/api";
import type { DiagnosisChatFocus } from "@/types/companion";

// Echo the i18n key for openers (so we can assert which FOCUS opener was selected),
// and return a 3-item array for the focus-aware chip set.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => (key.includes("suggestionsByFocus") ? ["q1", "q2", "q3"] : key),
    i18n: { language: "en" },
  }),
}));

afterEach(() => {
  cleanup();
  useCompanionStore.getState().resetCompanion();
});

const reviewData = { overallScore: 80, dimensions: [] } as unknown as CvReviewData;

function mkTransition(kind: GapTransitionDto["kind"]): GapTransitionDto {
  return {
    canonical_name: "react",
    display_name: "React",
    prev_status: "missing",
    curr_status: "matched",
    kind,
    prev_severity: 3,
    curr_severity: 0,
  };
}

function mkProgress(overrides: Partial<ProgressReportDto>): ProgressReportDto {
  return {
    baseline: false,
    prev_count: 1,
    curr_count: 0,
    gaps_closed: [],
    gaps_worsened: [],
    avg_severity_delta: 0,
    prev_score: 60,
    curr_score: 80,
    transitions: [],
    dimension_changes: [],
    evidence_recognized: [],
    strengths_kept: [],
    required_coverage_delta: null,
    template_changed: false,
    ...overrides,
  };
}

function Harness({
  focus,
  progress,
}: {
  focus: DiagnosisChatFocus;
  progress?: ProgressReportDto | null;
}) {
  useDiagnosisChatCompanion(reviewData, focus, undefined, "cv-1", progress);
  return null;
}

describe("useDiagnosisChatCompanion — focus drives store-backed opener/chips", () => {
  it("pushes a cv_audit opener + 3 chips into the store on mount", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <Harness focus="cv_audit" />
      </QueryClientProvider>,
    );
    const s = useCompanionStore.getState();
    expect(s.chatOpener).toContain("cv_audit");
    expect(s.chatSuggestions).toHaveLength(3);
  });

  it("repaints opener + chips when focus changes (the tab-switch fix)", () => {
    const qc = new QueryClient();
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <Harness focus="cv_audit" />
      </QueryClientProvider>,
    );
    expect(useCompanionStore.getState().chatOpener).toContain("cv_audit");

    rerender(
      <QueryClientProvider client={qc}>
        <Harness focus="market_careers" />
      </QueryClientProvider>,
    );
    // Without the store push + shell subscription, this would still read "cv_audit".
    expect(useCompanionStore.getState().chatOpener).toContain("market_careers");
    expect(useCompanionStore.getState().chatSuggestions).toHaveLength(3);
  });

  it("clears the opener + chips on unmount (leaving the diagnosis tab)", () => {
    const qc = new QueryClient();
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" />
      </QueryClientProvider>,
    );
    expect(useCompanionStore.getState().chatOpener).toContain("gap_results");
    unmount();
    expect(useCompanionStore.getState().chatOpener).toBeNull();
    expect(useCompanionStore.getState().chatSuggestions).toHaveLength(0);
  });
});

describe("useDiagnosisChatCompanion — progress-aware chip", () => {
  it("prepends the progress chip when a closed/improved transition exists since baseline", () => {
    const qc = new QueryClient();
    const progress = mkProgress({ transitions: [mkTransition("closed")] });
    render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" progress={progress} />
      </QueryClientProvider>,
    );
    expect(useCompanionStore.getState().chatSuggestions).toContain("companion.chat.progressChip");
  });

  it("does NOT add the chip on a baseline report", () => {
    const qc = new QueryClient();
    const progress = mkProgress({ baseline: true, transitions: [mkTransition("closed")] });
    render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" progress={progress} />
      </QueryClientProvider>,
    );
    expect(useCompanionStore.getState().chatSuggestions).not.toContain("companion.chat.progressChip");
  });

  it("does NOT add the chip when progress is null (no closed/improved transitions to report)", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" progress={null} />
      </QueryClientProvider>,
    );
    expect(useCompanionStore.getState().chatSuggestions).not.toContain("companion.chat.progressChip");
  });

  it("exposes sendQuestion so callers can prefill + send a question", () => {
    const qc = new QueryClient();
    let api: { sendQuestion: (q: string) => void } | undefined;
    function CaptureHarness() {
      api = useDiagnosisChatCompanion(reviewData, "gap_results", undefined, "cv-1");
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <CaptureHarness />
      </QueryClientProvider>,
    );
    expect(typeof api?.sendQuestion).toBe("function");
  });
});
