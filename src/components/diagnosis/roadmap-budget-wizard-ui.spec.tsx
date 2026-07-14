// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MascotRoadmapWizard } from "./roadmap-budget-wizard";
import type { RoadmapSkillOptionDto } from "@shared/api";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        "roadmapWizard.title": "Roadmap buddy",
        "roadmapWizard.languageQuestion": "Choose language",
        "roadmapWizard.confirmQuestion": `Ready in ${opts?.language}?`,
        "roadmapWizard.selectLanguage": "Select language",
        "roadmapWizard.languageEn": "English",
        "roadmapWizard.language.en": "English",
        "roadmapWizard.language.vi": "Vietnamese",
        "roadmapWizard.language.both": "Both",
        "roadmapWizard.studyHoursPerDay": "Study hours/day",
        "roadmapWizard.studyDaysPerWeek": "Study days/week",
        "roadmapWizard.studyHoursHint": "Each subject is planned as a 2-hour module per day.",
        "roadmapWizard.submit": "Create roadmap",
        "roadmapWizard.edit": "Change answers",
        "roadmapWizard.step": "Step",
        "roadmapWizard.close": "Close",
        "roadmapWizard.dragSkill": `Drag ${opts?.skill}`,
      };
      return messages[key] ?? String(opts?.defaultValue ?? key);
    },
  }),
}));

vi.mock("@/components/mascot/MascotSticker", () => ({
  MascotSticker: () => <div data-testid="mascot" />,
}));

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

const options: RoadmapSkillOptionDto[] = [
  {
    skill_canonical: "typescript",
    display_name: "TypeScript",
    selected_by_default: true,
    estimated_hours: 16,
    priority: 1,
    source: {
      type: "role_baseline",
      id: "frontend_developer",
      reason: "Missing required frontend skill",
    },
    resources: [
      {
        id: "ts-course-unit-1",
        title: "Test-Driven Development for JavaScript: Unit 1",
        source_type: "course",
        duration_minutes: 1056,
        is_internal: false,
        outcome_type: "course",
      },
    ],
  },
];

describe("MascotRoadmapWizard", () => {
  it("lets users choose skills without showing individual course sections", async () => {
    const { container } = render(
      <MascotRoadmapWizard
        options={options}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "English" }));

    expect(await screen.findByText("TypeScript")).toBeInTheDocument();
    expect(
      screen.queryByText("Test-Driven Development for JavaScript: Unit 1"),
    ).not.toBeInTheDocument();
    expect(container.querySelector('input[type="checkbox"]')).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drag TypeScript" })).toBeInTheDocument();
    expect(screen.getByTestId("roadmap-skill-typescript")).toHaveAttribute(
      "data-selected",
      "true",
    );
  });
});
