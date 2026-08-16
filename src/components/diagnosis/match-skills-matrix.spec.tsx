// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MatchSkillsMatrix } from "./MatchSkillsMatrix";
import type { PerSkillContribution } from "@shared/api";

afterEach(() => {
  cleanup();
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === "results.matched") return "Đã khớp";
      if (key === "results.partial") return "Một phần";
      if (key === "results.missing") return "Còn thiếu";
      if (key === "results.filterAll") return "Tất cả";
      if (key === "jdIntel.importance.REQUIRED") return "Bắt buộc";
      if (key === "jdIntel.importance.PREFERRED") return "Ưu tiên";
      if (key === "jdIntel.importance.NICE_TO_HAVE") return "Điểm cộng";
      if (opts?.defaultValue) return opts.defaultValue;
      return key;
    },
  }),
}));

const mockSkills: PerSkillContribution[] = [
  {
    canonical_name: "react",
    display_name: "React",
    importance: "REQUIRED",
    weight: 1,
    effective_weight: 1,
    strength: 1,
    points_earned: 3.8,
    points_possible: 3.8,
    status: "matched",
    evidence_status: "found_in_cv",
    cv_evidence_text: "Built frontend using React and TypeScript for 2 years",
  },
  {
    canonical_name: "dotnet",
    display_name: ".NET Core",
    importance: "REQUIRED",
    weight: 1,
    effective_weight: 1,
    strength: 0,
    points_earned: 0,
    points_possible: 3.8,
    status: "missing",
    evidence_status: "not_verified_from_cv",
  },
  {
    canonical_name: "sql",
    display_name: "SQL Server",
    importance: "PREFERRED",
    weight: 0.8,
    effective_weight: 0.8,
    strength: 0.5,
    points_earned: 1.5,
    points_possible: 3.0,
    status: "partial",
  },
];

describe("MatchSkillsMatrix", () => {
  it("renders all skills with counts correctly", () => {
    render(<MatchSkillsMatrix skills={mockSkills} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText(".NET Core")).toBeInTheDocument();
    expect(screen.getByText("SQL Server")).toBeInTheDocument();
  });

  it("filters by matched status when clicking matched tab", () => {
    render(<MatchSkillsMatrix skills={mockSkills} />);

    const matchedTab = screen.getByRole("button", { name: /Đã khớp/i });
    fireEvent.click(matchedTab);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.queryByText(".NET Core")).not.toBeInTheDocument();
    expect(screen.queryByText("SQL Server")).not.toBeInTheDocument();
  });

  it("filters by search query", () => {
    render(<MatchSkillsMatrix skills={mockSkills} />);

    const searchInput = screen.getByPlaceholderText(/Tìm nhanh kỹ năng/i);
    fireEvent.change(searchInput, { target: { value: "dotnet" } });

    expect(screen.getByText(".NET Core")).toBeInTheDocument();
    expect(screen.queryByText("React")).not.toBeInTheDocument();
    expect(screen.queryByText("SQL Server")).not.toBeInTheDocument();
  });

  it("displays CV quote evidence when found in CV", () => {
    render(<MatchSkillsMatrix skills={mockSkills} />);

    expect(
      screen.getByText(/"Built frontend using React and TypeScript for 2 years"/i)
    ).toBeInTheDocument();
  });
});
