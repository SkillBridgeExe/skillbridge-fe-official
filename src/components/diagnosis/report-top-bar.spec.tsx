// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ReportTopBar } from "./report/ReportTopBar";

afterEach(() => {
  cleanup();
});

// ── Mocks ──
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, _opts?: Record<string, unknown>) => {
      if (key === "review.matchTitle") return "Kết quả khớp CV–JD";
      if (key === "review.title") return "Phân tích CV";
      if (key === "review.tabAudit") return "Đánh giá CV";
      if (key === "review.tabCv") return "CV của bạn";
      if (key === "review.tabMarket") return "Thị trường tuyển dụng";
      if (key === "review.tabFit") return "Mức độ phù hợp";
      if (key === "review.tabCvJd") return "CV & JD";
      if (key === "review.tabJobs") return "Việc làm liên quan";
      if (key === "review.startOver") return "Làm lại từ đầu";
      if (key === "review.matchAction") return "So khớp CV với JD";
      return key;
    },
  }),
}));

vi.mock("@/store/useDiagnosisStore", () => ({
  useDiagnosisStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      step: "cv-review",
      targetRole: "frontend-developer",
      goBack: vi.fn(),
      reset: vi.fn(),
      scanAgain: vi.fn(),
      setShowJdInput: vi.fn(),
      cvFile: { name: "my_resume.pdf" },
      builderCvName: null,
    }),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) => selector({ isAuthenticated: true }),
}));

vi.mock("@/store/useSidebarStore", () => ({
  useSidebarStore: (selector: (state: Record<string, unknown>) => unknown) => selector({ setMobileOpen: vi.fn() }),
}));

describe("ReportTopBar — Mode Identity & Tabs", () => {
  it("renders Review Mode tabs correctly when mode='review'", () => {
    const onTabChange = vi.fn();
    render(<ReportTopBar activeTab="audit" onTabChange={onTabChange} mode="review" />);

    expect(screen.getByText("Đánh giá CV")).toBeInTheDocument();
    expect(screen.getByText("CV của bạn")).toBeInTheDocument();
    expect(screen.getByText("Thị trường tuyển dụng")).toBeInTheDocument();
    expect(screen.queryByText("Mức độ phù hợp")).toBeNull();
  });

  it("renders Match Mode tabs and eyebrow chip when mode='match'", () => {
    const onTabChange = vi.fn();
    render(
      <ReportTopBar
        activeTab="fit"
        onTabChange={onTabChange}
        mode="match"
        jdTitle="Senior Frontend Engineer"
      />
    );

    expect(screen.getByText("Mức độ phù hợp")).toBeInTheDocument();
    expect(screen.getByText("CV & JD")).toBeInTheDocument();
    expect(screen.getByText("Việc làm liên quan")).toBeInTheDocument();
    expect(screen.getAllByText("Kết quả khớp CV–JD").length).toBeGreaterThan(0);
  });

  it("calls onTabChange when clicking a tab", () => {
    const onTabChange = vi.fn();
    render(<ReportTopBar activeTab="audit" onTabChange={onTabChange} mode="review" />);

    fireEvent.click(screen.getByText("CV của bạn"));
    expect(onTabChange).toHaveBeenCalledWith("cv");
  });

  it("triggers onBackToReview when back button is clicked in match mode", () => {
    const onBackToReview = vi.fn();
    render(
      <ReportTopBar
        activeTab="fit"
        onTabChange={vi.fn()}
        mode="match"
        onBackToReview={onBackToReview}
      />
    );

    fireEvent.click(screen.getByTestId("back-button"));
    expect(onBackToReview).toHaveBeenCalled();
  });

  it("renders accessible tablist and primary match CTA action button", () => {
    render(<ReportTopBar activeTab="audit" onTabChange={vi.fn()} mode="review" />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    const matchButton = screen.getByRole("button", { name: "So khớp CV với JD" });
    expect(matchButton).toBeInTheDocument();
    expect(matchButton).toHaveClass("min-h-[44px]");
    const startOverBtn = screen.getByRole("button", { name: "Làm lại từ đầu" });
    expect(startOverBtn).toBeInTheDocument();
    expect(startOverBtn).toHaveClass("min-h-[44px]");
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveClass(
      "min-h-[44px]",
      "min-w-[44px]",
    );
  });
});
