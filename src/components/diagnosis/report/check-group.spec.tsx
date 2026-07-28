// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
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
});
