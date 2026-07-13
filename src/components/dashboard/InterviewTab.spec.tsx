// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { useInterviewHistory } from "@/hooks/use-interview";
import InterviewTab from "./InterviewTab";

vi.mock("@/hooks/use-interview", () => ({
  useInterviewHistory: vi.fn(),
}));

function interview(index: number, overallScore: number | null = 80) {
  return {
    id: `session-${index}`,
    targetRole: `role_${index}`,
    interviewType: "TECHNICAL",
    status: "COMPLETED",
    overallScore,
    semanticScore: 70,
    communicationScore: 60,
    startedAt: `2026-07-${String(index).padStart(2, "0")}T00:00:00.000Z`,
  };
}

function renderTab() {
  return render(
    <MemoryRouter>
      <InterviewTab />
    </MemoryRouter>,
  );
}

describe("InterviewTab", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows five recent scored sessions with clear score dimensions", () => {
    vi.mocked(useInterviewHistory).mockReturnValue({
      data: {
        items: Array.from({ length: 6 }, (_, index) => interview(index + 1)),
        total: 12,
        page: 1,
        limit: 10,
      },
      isLoading: false,
      isError: false,
    } as never);

    renderTab();

    expect(screen.getAllByTestId("interview-session-row")).toHaveLength(5);
    expect(screen.queryByText("role 6")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Overall score 80")).toHaveLength(5);
    expect(screen.getAllByLabelText("Technical score 70")).toHaveLength(5);
    expect(screen.getAllByLabelText("Communication score 60")).toHaveLength(5);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("shows the scored-results empty state when defensive filtering removes all items", () => {
    vi.mocked(useInterviewHistory).mockReturnValue({
      data: {
        items: [interview(1, null)],
        total: 0,
        page: 1,
        limit: 10,
      },
      isLoading: false,
      isError: false,
    } as never);

    renderTab();

    expect(screen.getByText("No scored interviews yet")).toBeInTheDocument();
  });
});
