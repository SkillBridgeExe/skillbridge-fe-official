// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DiagnosisFindingsPanel, DiagnosisFindingsBanner } from "./DiagnosisFindingsPanel";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import type { CvReviewData } from "@shared/api";

// Mock translation hook to echo keys
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (options && options.count !== undefined) {
        return `${key}_count_${options.count}`;
      }
      return key;
    },
  }),
}));

const review = {
  overallScore: 60,
  bullet_feedback: [
    {
      text: "Làm việc với team phát triển web",
      section: "experience",
      tips: ["Mở đầu bằng động từ hành động"],
    },
  ],
  top_summary: { headline: "x", prioritized_actions: ["Thêm số liệu"] },
} as unknown as CvReviewData;

afterEach(() => {
  cleanup();
  // Reset stores to their initial states to avoid test leakage
  useCvBuilderStore.setState({
    experience: [],
    projects: [],
    summary: "",
    seededFromDiagnosis: false,
    activeSection: 0,
    sectionFixFeedback: {},
  });
  useDiagnosisStore.setState({
    reviewData: null,
  });
  vi.clearAllMocks();
});

describe("DiagnosisFindingsPanel", () => {
  it("renders nothing without reviewData", () => {
    const { container } = render(<DiagnosisFindingsPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders verbatim BE tips and jumps on Sửa", () => {
    useDiagnosisStore.setState({ reviewData: review });
    useCvBuilderStore.setState({
      experience: [
        {
          id: "exp-1",
          company: "A Company",
          position: "Developer",
          startDate: "",
          endDate: "",
          description: "Làm việc với team phát triển web",
          responsibilities: "",
          achievements: "",
          aiRewrite: "",
        },
      ],
    });

    render(<DiagnosisFindingsPanel />);

    // Renders verbatim BE tips
    expect(screen.getByText(/Mở đầu bằng động từ hành động/)).toBeInTheDocument();

    // Renders excerpt
    expect(screen.getByText(/Làm việc với team phát triển web/)).toBeInTheDocument();

    // Click Sửa/Fix button
    fireEvent.click(screen.getByRole("button", { name: /builder.diagnosisFindings.fixButton/i }));

    // Verify side effects
    expect(useCvBuilderStore.getState().activeSection).toBe(4); // experience section index
    expect(useCvBuilderStore.getState().sectionFixFeedback.experience?.source).toBe("diagnosis_fix");
  });
});

describe("DiagnosisFindingsBanner", () => {
  it("banner shows count when seeded from diagnosis and jumps to review section", () => {
    useDiagnosisStore.setState({ reviewData: review });
    useCvBuilderStore.setState({ seededFromDiagnosis: true, activeSection: 0 });

    render(<DiagnosisFindingsBanner />);

    // Verify count key is rendered properly with mock translator
    expect(screen.getByText("builder.diagnosisFindings.bannerText_count_2")).toBeInTheDocument();

    // Click CTA button
    fireEvent.click(screen.getByRole("button", { name: /builder.diagnosisFindings.bannerCta/i }));

    // Verify navigation
    expect(useCvBuilderStore.getState().activeSection).toBe(8); // review section index
  });

  it("banner hidden khi không seed từ diagnosis hoặc đang ở review", () => {
    useDiagnosisStore.setState({ reviewData: review });
    useCvBuilderStore.setState({ seededFromDiagnosis: false });

    const { container } = render(<DiagnosisFindingsBanner />);
    expect(container.firstChild).toBeNull();
  });
});
