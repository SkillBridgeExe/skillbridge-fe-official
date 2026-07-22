// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLearningRoadmapDraft,
  generateLearningRoadmap,
  getActiveLearningRoadmap,
  previewLearningRoadmap,
  updateLearningRoadmapDraft,
} from "@/services/learning-roadmaps-v2.service";
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
beforeEach(() => vi.clearAllMocks());

describe("LearningRoadmapWizard", () => {
  it("persists the learner resource selection and previews that revision before generating", async () => {
    const candidate = {
      skill_canonical: "typescript",
      display_name: "TypeScript",
      system_priority: 1,
      rationale: "Required by the target role",
      prerequisites: [],
    };
    const draft = {
      id: "roadmap-1",
      intent: "JD_APPLICATION" as const,
      status: "DRAFT" as const,
      revision: 0,
      cv_match_id: "match-1",
      cv_id: null,
      target_role: null,
      target_level: null,
      language_pref: "both" as const,
      candidate_skills: [candidate],
      selected_priorities: [],
      selected_resources: {},
      schedule: null,
    };
    const resources = [
      resource("resource-1", "Official docs"),
      resource("resource-2", "Video tutorial"),
    ];
    const preview = {
      roadmap_id: draft.id,
      revision: 1,
      target_role: "Frontend developer",
      summary: "A feasible plan",
      capacity_minutes: 180,
      scheduled_minutes: 120,
      modules: [
        {
          skill_canonical: "typescript",
          display_name: "TypeScript",
          rank: 1,
          estimated_minutes: 120,
          feasibility: "FEASIBLE" as const,
          resources,
          lesson_content: null,
        },
      ],
      sessions: [],
      deferred: [],
    };

    vi.mocked(createLearningRoadmapDraft).mockResolvedValue(draft);
    vi.mocked(updateLearningRoadmapDraft)
      .mockResolvedValueOnce({ ...draft, revision: 1 })
      .mockResolvedValueOnce({
        ...draft,
        revision: 2,
        selected_resources: { typescript: ["resource-1"] },
      });
    vi.mocked(previewLearningRoadmap)
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({
        ...preview,
        revision: 2,
        modules: [{ ...preview.modules[0], resources: [resources[0]] }],
      });
    vi.mocked(generateLearningRoadmap).mockResolvedValue({
      ...preview,
      revision: 3,
      version_id: "version-1",
      status: "ACTIVE",
    });
    vi.mocked(getActiveLearningRoadmap).mockResolvedValue({ id: draft.id } as never);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LearningRoadmapWizard
          initialMatchId="match-1"
          onClose={vi.fn()}
          onGenerated={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("learning.wizard.next"));
    await screen.findByText("learning.wizard.steps.priorities");
    fireEvent.click(screen.getByText("learning.wizard.next"));
    fireEvent.click(screen.getByText("learning.wizard.previewAction"));
    await screen.findByText("Video tutorial");

    fireEvent.click(screen.getByRole("checkbox", { name: /Video tutorial/ }));
    fireEvent.click(screen.getByText("learning.wizard.generateAction"));

    await waitFor(() =>
      expect(updateLearningRoadmapDraft).toHaveBeenLastCalledWith("roadmap-1", {
        expected_revision: 1,
        selected_resources: { typescript: ["resource-1"] },
      }),
    );
    expect(previewLearningRoadmap).toHaveBeenLastCalledWith("roadmap-1", 2);
    expect(generateLearningRoadmap).toHaveBeenCalledWith("roadmap-1", 2);
  });

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

function resource(id: string, title: string) {
  return {
    id,
    source_type: "official_doc" as const,
    title,
    is_internal: false,
    duration_minutes: 30,
    outcome_type: "knowledge",
    match_score: 1,
    quality_score: 1,
    freshness_score: 1,
    low_confidence: false,
  };
}
