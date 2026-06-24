// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDiagnosisChatCompanion } from "./useDiagnosisChatCompanion";
import { useCompanionStore } from "@/store/useCompanionStore";
import type { CvReviewData } from "@shared/api";
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

function Harness({ focus }: { focus: DiagnosisChatFocus }) {
  useDiagnosisChatCompanion(reviewData, focus, undefined, "cv-1");
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
