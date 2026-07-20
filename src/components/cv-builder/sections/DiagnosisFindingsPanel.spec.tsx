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

/** Provenance hợp lệ: builder được seed từ đúng CV vừa chẩn đoán. */
const armProvenance = (cvId = "cv-123") => {
  useDiagnosisStore.setState({ reviewData: review, lastCvId: cvId });
  useCvBuilderStore.setState({ diagnosisSourceCvId: cvId });
};

afterEach(() => {
  cleanup();
  // Reset stores to their initial states to avoid test leakage
  useCvBuilderStore.setState({
    experience: [],
    projects: [],
    summary: "",
    diagnosisSourceCvId: null,
    activeSection: 0,
    sectionFixFeedback: {},
    collapsedSections: {},
    sectionOrder: ["summary", "experience", "education", "projects", "certifications", "skills"],
  });
  useDiagnosisStore.setState({
    reviewData: null,
    lastCvId: null,
  });
  vi.clearAllMocks();
});

describe("DiagnosisFindingsPanel", () => {
  it("renders nothing without reviewData", () => {
    const { container } = render(<DiagnosisFindingsPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the open draft was not seeded from the diagnosed CV (provenance guard)", () => {
    // Quét CV A nhưng draft đang mở là CV B (mở từ thư viện): không bind chéo.
    useDiagnosisStore.setState({ reviewData: review, lastCvId: "cv-A" });
    useCvBuilderStore.setState({ diagnosisSourceCvId: null });
    expect(render(<DiagnosisFindingsPanel />).container.firstChild).toBeNull();

    useCvBuilderStore.setState({ diagnosisSourceCvId: "cv-B" });
    expect(render(<DiagnosisFindingsPanel />).container.firstChild).toBeNull();
  });

  it("renders verbatim BE tips and jumps on Sửa", () => {
    armProvenance();
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
      collapsedSections: { experience: true },
    });

    render(<DiagnosisFindingsPanel />);

    // Renders verbatim BE tips
    expect(screen.getByText(/Mở đầu bằng động từ hành động/)).toBeInTheDocument();

    // Renders excerpt
    expect(screen.getByText(/Làm việc với team phát triển web/)).toBeInTheDocument();

    // Click Sửa/Fix button
    fireEvent.click(screen.getByRole("button", { name: /builder.diagnosisFindings.fixButton/i }));

    // activeSection đánh index vào orderedSections = [basic-info, career-target,
    // ...sectionOrder, review]; default sectionOrder → experience = 2 + 1 = 3.
    expect(useCvBuilderStore.getState().activeSection).toBe(3);
    expect(useCvBuilderStore.getState().sectionFixFeedback.experience?.source).toBe("diagnosis_fix");
    // Section đích được auto-expand như CvSectionNav.handleNavClick
    expect(useCvBuilderStore.getState().collapsedSections.experience).toBe(false);
  });

  it("computes the jump index from the LIVE sectionOrder (reorder-safe, not hardcoded)", () => {
    armProvenance();
    // User dragged experience to the top → its builder index is now 2 (not the default 3).
    useCvBuilderStore.setState({
      sectionOrder: ["experience", "summary", "education", "projects", "certifications", "skills"],
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
    fireEvent.click(screen.getByRole("button", { name: /builder.diagnosisFindings.fixButton/i }));
    // experience moved to sectionOrder index 0 → orderedSections index 0 + 2 = 2.
    expect(useCvBuilderStore.getState().activeSection).toBe(2);
  });
});

describe("DiagnosisFindingsBanner", () => {
  it("banner shows count when provenance matches and jumps to review section", () => {
    armProvenance();
    useCvBuilderStore.setState({ activeSection: 0 });

    render(<DiagnosisFindingsBanner />);

    // Verify count key is rendered properly with mock translator
    expect(screen.getByText("builder.diagnosisFindings.bannerText_count_2")).toBeInTheDocument();

    // Click CTA button
    fireEvent.click(screen.getByRole("button", { name: /builder.diagnosisFindings.bannerCta/i }));

    // reviewIndex = 2 + sectionOrder.length (default 6) = 8, và review được expand.
    expect(useCvBuilderStore.getState().activeSection).toBe(8);
    expect(useCvBuilderStore.getState().collapsedSections.review).toBe(false);
  });

  it("banner hidden khi provenance không khớp hoặc đang ở review", () => {
    // Không seed từ CV đã chẩn đoán → ẩn (dù reviewData tồn tại).
    useDiagnosisStore.setState({ reviewData: review, lastCvId: "cv-A" });
    useCvBuilderStore.setState({ diagnosisSourceCvId: null });
    expect(render(<DiagnosisFindingsBanner />).container.firstChild).toBeNull();

    // Đang đứng ở review section → ẩn.
    armProvenance();
    useCvBuilderStore.setState({ activeSection: 8 });
    expect(render(<DiagnosisFindingsBanner />).container.firstChild).toBeNull();
  });
});
