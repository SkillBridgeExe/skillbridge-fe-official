// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SkillsRelevanceCard } from "./DiagnosisInsights";
import type { SkillsRelevanceBreakdown } from "@shared/api";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        "insights.relevanceTitle": "Skill relevance",
        "insights.relevanceHint": "Your skills vs. the target role's requirements.",
        "insights.matched": "MATCHED",
        "insights.partial": "PARTIAL",
        "insights.missing": "MISSING",
        "insights.addFirst": "add these first",
      };
      return messages[key] ?? key;
    },
  }),
}));

vi.mock("./RoadmapFromMatchSection", () => ({
  RoleRoadmapAction: () => <button type="button">Generate CV roadmap</button>,
}));

const breakdown: SkillsRelevanceBreakdown = {
  matched: [
    {
      name: "HTML",
      importance: "REQUIRED",
      required_level: 2,
      cv_level: 2,
    },
  ],
  partial: [],
  missing: [
    {
      name: "TypeScript",
      importance: "REQUIRED",
      required_level: 3,
      cv_level: 0,
    },
  ],
};

describe("SkillsRelevanceCard", () => {
  it("places the CV roadmap action inside the missing-skill section", () => {
    render(
      <SkillsRelevanceCard
        breakdown={breakdown}
        cvId="cv-1"
        role="frontend_developer"
      />,
    );

    expect(screen.getByText("MISSING")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate CV roadmap" })).toBeInTheDocument();
  });
});
