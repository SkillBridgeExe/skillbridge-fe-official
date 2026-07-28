// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LearningRoadmapWizard } from "./LearningRoadmapWizard";

const mocks = vi.hoisted(() => ({
  getCvList: vi.fn(),
  createDraft: vi.fn(),
  updateDraft: vi.fn(),
  previewRoadmap: vi.fn(),
  generateRoadmap: vi.fn(),
  getActiveRoadmap: vi.fn(),
}));

vi.mock("react-i18next", () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({
      t,
      i18n: { language: "en" },
    }),
  };
});
vi.mock("@/api/cv/list", () => ({ getCvListApi: mocks.getCvList }));
vi.mock("@/services/learning-roadmaps-v2.service", () => ({
  createLearningRoadmapDraft: mocks.createDraft,
  updateLearningRoadmapDraft: mocks.updateDraft,
  previewLearningRoadmap: mocks.previewRoadmap,
  generateLearningRoadmap: mocks.generateRoadmap,
  getActiveLearningRoadmap: mocks.getActiveRoadmap,
}));

describe("LearningRoadmapWizard accessibility", () => {
  afterEach(cleanup);

  it("exposes a modal dialog with a labeled close button and supports Escape", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <LearningRoadmapWizard onClose={onClose} onGenerated={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(
      screen.getByRole("button", { name: "learning.wizard.close" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("runs the career draft, cadence, primary-resource, preview, and generation flow", async () => {
    const draft = {
      id: "roadmap-1",
      revision: 1,
      candidate_skills: [
        {
          skill_canonical: "typescript",
          display_name: "TypeScript",
          system_priority: 0.9,
          rationale: "Required for the target role",
          prerequisites: [],
        },
      ],
    };
    const cadenceDraft = { ...draft, revision: 2 };
    const resourceDraft = { ...draft, revision: 3 };
    const preview = {
      revision: 2,
      learning_track: "FAST_TRACK",
      cadence: {
        start_date: "2026-07-28",
        study_days_per_week: 3,
        session_minutes: 60,
        timezone: "Asia/Ho_Chi_Minh",
      },
      estimated_completion_date: "2026-08-10",
      sessions: [{ id: "session-1" }],
      modules: [
        {
          skill_canonical: "typescript",
          display_name: "TypeScript",
          rank: 1,
          quick_win_score: 90,
          scope_status: "CORE_ONLY",
          feasibility: "FEASIBLE",
          lessons: [],
          resources: [
            {
              id: "primary-resource",
              title: "TypeScript quick start",
              resource_role: "PRIMARY",
              duration_kind: "EXACT",
              recommended_minutes: 60,
            },
          ],
        },
      ],
      summary: "Focused roadmap",
    };
    mocks.getCvList.mockResolvedValue({
      items: [{ id: "cv-1", title: "Frontend CV" }],
    });
    mocks.createDraft.mockResolvedValue(draft);
    mocks.updateDraft
      .mockResolvedValueOnce(cadenceDraft)
      .mockResolvedValueOnce(resourceDraft);
    mocks.previewRoadmap
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({ ...preview, revision: 3 });
    mocks.generateRoadmap.mockResolvedValue({ status: "ACTIVE" });
    mocks.getActiveRoadmap.mockResolvedValue({
      id: "roadmap-1",
      status: "ACTIVE",
    });
    const onGenerated = vi.fn();

    render(
      <MemoryRouter>
        <LearningRoadmapWizard onClose={vi.fn()} onGenerated={onGenerated} />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /learning\.wizard\.goal\.careerTitle/,
      }),
    );
    await screen.findByRole("option", { name: "Frontend CV" });
    fireEvent.click(
      screen.getByRole("button", { name: "learning.wizard.next" }),
    );
    await screen.findByText("TypeScript");
    fireEvent.click(
      screen.getByRole("button", { name: "learning.wizard.next" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "learning.wizard.previewAction",
      }),
    );
    await screen.findByText("TypeScript quick start");
    fireEvent.click(
      screen.getByRole("button", {
        name: "learning.wizard.generateAction",
      }),
    );

    await waitFor(() => expect(onGenerated).toHaveBeenCalledOnce());
    expect(mocks.updateDraft).toHaveBeenNthCalledWith(
      2,
      "roadmap-1",
      expect.objectContaining({
        selected_resources: { typescript: ["primary-resource"] },
      }),
    );
    expect(mocks.generateRoadmap).toHaveBeenCalledWith("roadmap-1", 3);
  });
});
