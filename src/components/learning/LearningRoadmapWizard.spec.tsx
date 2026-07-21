// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LearningRoadmapWizard } from "./LearningRoadmapWizard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/api/cv/list", () => ({
  getCvListApi: vi
    .fn()
    .mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 }),
}));
vi.mock("@/services/learning-roadmaps-v2.service", () => ({
  createLearningRoadmapDraft: vi.fn(),
  generateLearningRoadmap: vi.fn(),
  getActiveLearningRoadmap: vi.fn(),
  previewLearningRoadmap: vi.fn(),
  updateLearningRoadmapDraft: vi.fn(),
}));

afterEach(cleanup);

describe("LearningRoadmapWizard", () => {
  it("asks the learning goal first and reveals career CV context after selection", () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LearningRoadmapWizard onClose={vi.fn()} onGenerated={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("learning.wizard.steps.goal")).toBeTruthy();
    fireEvent.click(screen.getByText("learning.wizard.goal.careerTitle"));
    expect(screen.getByText("learning.wizard.steps.context")).toBeTruthy();
    expect(screen.getByText("learning.wizard.context.cv")).toBeTruthy();
    expect(screen.getByText("learning.wizard.context.role")).toBeTruthy();
  });

  it("enters the JD context directly when diagnosis supplies a match id", () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LearningRoadmapWizard
          initialMatchId="match-1"
          onClose={vi.fn()}
          onGenerated={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("learning.wizard.steps.context")).toBeTruthy();
    expect(screen.queryByText("learning.wizard.steps.goal")).toBeNull();
    expect(
      screen.queryByText("learning.wizard.goal.jdNeedsDiagnosis"),
    ).toBeNull();
  });
});
