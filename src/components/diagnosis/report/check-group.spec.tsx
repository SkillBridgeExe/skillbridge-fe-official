// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { CheckGroup } from "./CheckGroup";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "report.rail.resolved": "Đạt chuẩn",
        "report.rail.needsImprovement": "Cần cải thiện",
        "report.rail.notMet": "Chưa đạt",
      })[key] ?? key,
  }),
}));

afterEach(cleanup);

describe("CheckGroup score status", () => {
  it("does not label a 10/100 score as passed when detailed issues are unavailable", () => {
    render(
      <CheckGroup
        group={{
          id: "content",
          label: "Tối ưu nội dung",
          score: 10,
          issueCount: 0,
          items: [],
        }}
      />,
    );

    expect(screen.getByText("Chưa đạt")).toBeInTheDocument();
    expect(screen.queryByText("Đạt chuẩn")).not.toBeInTheDocument();
  });

  it("labels a score in the improvement band honestly", () => {
    render(
      <CheckGroup
        group={{
          id: "content",
          label: "Tối ưu nội dung",
          score: 60,
          issueCount: 0,
          items: [],
        }}
      />,
    );

    expect(screen.getByText("Cần cải thiện")).toBeInTheDocument();
  });

  it("only labels a score-only group passed at 70 or above", () => {
    render(
      <CheckGroup
        group={{
          id: "content",
          label: "Tối ưu nội dung",
          score: 70,
          issueCount: 0,
          items: [],
        }}
      />,
    );

    expect(screen.getByText("Đạt chuẩn")).toBeInTheDocument();
  });

  it("does not leave locked AI issue details readable in the DOM", () => {
    render(
      <MemoryRouter>
        <CheckGroup
          lockIssueDetails
          group={{
            id: "ai_eval",
            label: "AI đánh giá sâu",
            score: 55,
            issueCount: 1,
            items: [
              {
                id: "experience",
                label: "Kinh nghiệm",
                status: "warn",
                evidence: "Tóm tắt đánh giá vẫn được xem.",
                subItems: [
                  {
                    title: "Secret issue",
                    detail: "PREMIUM_ONLY_EXACT_DETAIL",
                    severity: "high",
                    suggestion: "PREMIUM_ONLY_EXACT_FIX",
                  },
                ],
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Tóm tắt đánh giá vẫn được xem.")).toBeInTheDocument();
    expect(screen.queryByText("PREMIUM_ONLY_EXACT_DETAIL")).not.toBeInTheDocument();
    expect(screen.queryByText("PREMIUM_ONLY_EXACT_FIX")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /premiumGate\.cta/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });
});
