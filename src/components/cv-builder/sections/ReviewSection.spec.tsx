// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ReviewSection } from "./ReviewSection";
import { useAuthStore } from "@/store/useAuthStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

const mutateAsync = vi.fn();
vi.mock("@/hooks/use-cv-builder", () => ({
  useEvaluateSectionMutation: () => ({ mutateAsync }),
}));

const USER = {
  id: "u1",
  name: "Student",
  email: "student@example.com",
  role: "user" as const,
};

function seedStaleSummary() {
  const store = useCvBuilderStore.getState();
  store.reset();
  store.setDraftId("draft-1");
  store.setSummary("Built REST APIs with Node.js.");
  store.markSectionNeedsRecheck("summary", {
    source: "assistant_patch",
    fieldPath: "/sections/summary/content",
    beforePreview: "old",
    afterPreview: "new",
  });
}

afterEach(() => {
  cleanup();
  mutateAsync.mockReset();
  useCvBuilderStore.getState().reset();
  useAuthStore.getState().setAnonymous();
});

describe("ReviewSection W55 re-check ledger", () => {
  it("renders the CV length and focus guard", () => {
    render(<ReviewSection />);

    expect(screen.getByText("builder.lengthGuard.headline.good")).toBeInTheDocument();
    expect(screen.getByText("builder.lengthGuard.statusPages")).toBeInTheDocument();
    expect(screen.getByText("builder.lengthGuard.targetPages")).toBeInTheDocument();
  });

  it("renders a per-section re-check CTA for stale assistant edits", () => {
    useAuthStore.getState().setAuthenticated(USER, "api");
    seedStaleSummary();

    render(<ReviewSection />);

    expect(screen.getByText("builder.review.recheckBannerTitle")).toBeInTheDocument();
    expect(screen.getByText("builder.review.feedbackAssistant")).toBeInTheDocument();
    expect(screen.getByText("builder.review.recheckSection")).toBeInTheDocument();
  });

  it("re-checks one section and clears stale feedback through setSectionEvaluation", async () => {
    useAuthStore.getState().setAuthenticated(USER, "api");
    seedStaleSummary();
    mutateAsync.mockResolvedValueOnce({
      score: 92,
      label: "Excellent",
      checklist: [],
      missing: [],
    });

    render(<ReviewSection />);
    fireEvent.click(screen.getByText("builder.review.recheckSection"));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({
      draftId: "draft-1",
      section: "summary",
    });

    await waitFor(() => {
      expect(useCvBuilderStore.getState().sectionFixFeedback.summary).toBeUndefined();
    });
    expect(useCvBuilderStore.getState().sectionEvaluations.summary?.score).toBe(92);
  });

  it("keeps stale feedback visible when re-check fails", async () => {
    useAuthStore.getState().setAuthenticated(USER, "api");
    seedStaleSummary();
    mutateAsync.mockRejectedValueOnce(new Error("network"));

    render(<ReviewSection />);
    fireEvent.click(screen.getByText("builder.review.recheckSection"));

    await waitFor(() => {
      expect(screen.getByText("builder.review.recheckFailed")).toBeInTheDocument();
    });
    expect(useCvBuilderStore.getState().sectionFixFeedback.summary).toBeDefined();
    expect(useCvBuilderStore.getState().sectionEvaluations.summary).toBeUndefined();
  });
});
