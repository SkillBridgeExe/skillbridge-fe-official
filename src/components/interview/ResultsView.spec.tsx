// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { InterviewDetailResponseDto } from "@/api/interview-api";
import i18n from "@/i18n";
import { ResultsView } from "./ResultsView";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

const longSummary =
  "Bạn có nền tảng kỹ thuật phù hợp và đã mô tả được phần việc trực tiếp. Câu trả lời sẽ thuyết phục hơn nếu bổ sung quyết định kỹ thuật, trade-off và kết quả đo lường cụ thể cho từng ví dụ trong dự án.";

function buildResult(
  overrides: Partial<InterviewDetailResponseDto> = {},
): InterviewDetailResponseDto {
  return {
    id: "session-results",
    targetRole: "frontend_developer",
    overallScore: 59,
    semanticScore: 61,
    llmScore: 58,
    communicationScore: 57,
    durationSeconds: 472,
    aiFeedback: {
      summary: longSummary,
      recommendations: [],
      suggested_modules: [],
    },
    coaching: {
      summary: "Bạn đã thể hiện khả năng làm việc với API.",
      strengths: ["Chủ động mô tả phần API trực tiếp phụ trách"],
      priorities: [
        {
          track: "interview_practice",
          title: "Bổ sung kết quả đo lường",
          why: "Câu trả lời chưa cho thấy tác động sau khi triển khai.",
        },
      ],
    },
    finalScore: {
      overall: 59,
      overall_band: "borderline",
      score_basis: "criterion_rubric",
      score_explanations: [],
    },
    turns: [
      {
        id: "turn-results",
        sessionId: "session-results",
        turnOrder: 1,
        phase: "SCREENING",
        modality: "AUDIO",
        aiRequestId: null,
        interviewerQuestion: "Bạn trực tiếp phụ trách phần nào?",
        userAnswerText: null,
        userAnswerTranscript: "Tôi phụ trách tích hợp API auth.",
        perQuestionScore: 59,
        strengths: [],
        improvements: ["Giải thích rõ trade-off của cách quản lý session"],
        askedAt: "2026-08-16T10:00:00.000Z",
        answeredAt: "2026-08-16T10:01:00.000Z",
        durationSeconds: 60,
      },
    ],
    ...overrides,
  } as InterviewDetailResponseDto;
}

beforeEach(async () => {
  await i18n.changeLanguage("vi");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ResultsView overview", () => {
  it("explains the score and shows strengths and improvements together", () => {
    render(<ResultsView result={buildResult()} onRetry={vi.fn()} />);

    expect(screen.getByText("59/100")).toBeInTheDocument();
    expect(screen.getByText("Tổng điểm phỏng vấn")).toBeInTheDocument();
    expect(screen.getByText("Cần củng cố")).toBeInTheDocument();
    expect(screen.getByText("Bạn đang làm tốt")).toBeInTheDocument();
    expect(screen.getByText("Ưu tiên cải thiện")).toBeInTheDocument();
    expect(
      screen.getByText("Chủ động mô tả phần API trực tiếp phụ trách"),
    ).toBeInTheDocument();
    expect(screen.getByText("Bổ sung kết quả đo lường")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("uses the score overview space for the session facts", () => {
    render(<ResultsView result={buildResult()} onRetry={vi.fn()} />);

    const overview = screen.getByRole("region", {
      name: "Tổng quan điểm phỏng vấn",
    });

    expect(within(overview).getByText("Thời lượng")).toBeInTheDocument();
    expect(within(overview).getByText("07:52")).toBeInTheDocument();
    expect(within(overview).getByText("Câu đã trả lời")).toBeInTheDocument();
    expect(within(overview).getByText("1")).toBeInTheDocument();
    expect(within(overview).getByText("Cách chấm điểm")).toBeInTheDocument();
    expect(within(overview).getByText("Chấm theo rubric")).toBeInTheDocument();
  });

  it("uses an honest compact state when no supported strength exists", () => {
    render(
      <ResultsView
        result={buildResult({
          coaching: { summary: "Chưa đủ bằng chứng.", strengths: [], priorities: [] },
          turns: [
            {
              ...buildResult().turns[0],
              strengths: [],
              improvements: [],
            },
          ],
        })}
        onRetry={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Chưa đủ bằng chứng để kết luận điểm mạnh."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/vai trò, quyết định kỹ thuật và kết quả/),
    ).toBeInTheDocument();
  });

  it("expands and collapses a long AI summary", () => {
    render(<ResultsView result={buildResult()} onRetry={vi.fn()} />);

    const expand = screen.getByRole("button", { name: "Xem thêm" });
    expect(expand).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(expand);

    expect(screen.getByRole("button", { name: "Thu gọn" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
