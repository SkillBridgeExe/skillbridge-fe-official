import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  answerLearningQuizQuestion,
  getLearningNextQuestions,
  getLearningSessionProgress,
  patchLearningChecklistItem,
  roadmapToLearningRoadmap,
  roadmapToWeekPlans,
  saveLearningSessionProgress,
  type ComposedRoadmap,
} from "./learning-roadmap.service";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));
vi.mock("@/services/auth-session.service", () => ({ hasApiAuthSession: () => true }));

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

const composedRoadmap: ComposedRoadmap = {
  budget_hours: 32,
  ai_summary: "Hoc React truoc, sau do lam mini project.",
  steps: [
    {
      skill_canonical: "react",
      display_name: "React",
      strategy: "deep_build",
      estimated_hours: 12,
      priority: 1,
      resources: [
        {
          id: "react-docs",
          source_type: "official_doc",
          title: "React Quick Start",
          url: "https://react.dev/learn",
          is_internal: false,
          duration_minutes: 90,
          outcome_type: "foundation",
          proof_of_completion: "Build a component",
          match_score: 0.92,
          quality_score: 0.95,
          freshness_score: 0.9,
          low_confidence: false,
          video_chapters: [
            {
              id: "react-props",
              title: "Props",
              start_seconds: 900,
              objective_id: "react-props",
            },
          ],
        },
        {
          id: "sb-react-project",
          source_type: "mini_project",
          title: "SkillBridge React level 4 project",
          is_internal: true,
          content_template_id: "skillbridge.react.l4.project",
          description: "Build a SkillBridge-owned React portfolio project.",
          duration_minutes: 240,
          outcome_type: "project",
          match_score: 0.88,
          quality_score: 0.9,
          freshness_score: 0.86,
          low_confidence: true,
        },
      ],
      recommended_courses: [
        {
          id: "react-course",
          title: "React with Projects",
          url: "https://example.com/react-course",
          provider: "Coursera",
          duration_minutes: 360,
          is_free: false,
          language: "en",
          difficulty: "INTERMEDIATE",
          rating: 4.6,
          skills: [{ skill_canonical_name: "react", teaches_level: 4 }],
          match_score: 92,
        },
      ],
      lesson_content: {
        skill_canonical: "react",
        title: "React component fundamentals",
        summary: "SkillBridge-owned React lesson.",
        license_type: "skillbridge_original",
        reuse_policy: "full_reuse_allowed",
        source_resource_ids: ["react-docs", "sb-react-project"],
        learning_objectives: [
          {
            id: "react-props",
            title: "Pass data with props",
            description: "Use one-way parent-to-child data flow.",
          },
        ],
        sections: [
          {
            id: "react-components",
            title: "Components and props",
            body: "A React component is a small function that returns UI.",
            objective_id: "react-props",
            checklist: [
              { id: "create-parent", label: "Create a parent component", objective_id: "react-props" },
              { id: "pass-props", label: "Pass props to a child component", objective_id: "react-props" },
            ],
          },
        ],
        quiz_bank: [
          {
            id: "react-q1",
            question: "What are props used for?",
            options: ["Parent-to-child data", "Database writes"],
            correct_option_index: 0,
            explanation: "Props keep data flow explicit.",
            kind: "scenario",
            objective_id: "react-props",
            section_id: "react-components",
            remediation: {
              section_id: "react-components",
              video_resource_id: "react-docs",
              video_chapter_id: "react-props",
              start_seconds: 900,
            },
          },
        ],
        pass_policy: {
          min_correct_per_objective: 2,
          min_accuracy: 0.7,
        },
        quiz: [
          {
            id: "react-q1",
            question: "What are props used for?",
            options: ["Parent-to-child data", "Database writes"],
            correct_option_index: 0,
            explanation: "Props keep data flow explicit.",
            objective_id: "react-props",
            section_id: "react-components",
          },
        ],
        exercises: [
          {
            id: "react-ex1",
            title: "Build a filtered card list",
            prompt: "Render cards and filter them from an input.",
            acceptance_criteria: ["Cards come from an array", "Filtering updates without reload"],
            proof_of_completion: "Save a screenshot and short note.",
          },
        ],
      },
    },
  ],
  not_feasible_items: [
    {
      skill_canonical: "docker",
      display_name: "Docker",
      reason: "ran_out_of_budget",
      fallback: "crash_prep",
    },
  ],
};

describe("learning-roadmap.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads saved session progress from the BE learning endpoint", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(ok({
      session_id: "roadmap-react",
      checked_checklist_items: { "react-components": ["Create a parent component"] },
      exercise_proofs: { "react-ex1": "Saved screenshot" },
      updated_at: "2026-06-23T10:00:00.000Z",
    }) as never);

    const progress = await getLearningSessionProgress("roadmap-react");

    expect(httpClient.get).toHaveBeenCalledWith(API_ROUTES.LEARNING.SESSION_PROGRESS("roadmap-react"));
    expect(progress).toEqual({
      checkedChecklistItems: { "react-components": ["Create a parent component"] },
      exerciseProofs: { "react-ex1": "Saved screenshot" },
      quizAttempts: {},
    });
  });

  it("saves session progress to the BE learning endpoint", async () => {
    vi.mocked(httpClient.put).mockReturnValueOnce(ok({
      session_id: "roadmap-react",
      checked_checklist_items: { "react-components": ["Create a parent component"] },
      exercise_proofs: { "react-ex1": "Saved screenshot" },
      updated_at: "2026-06-23T10:00:00.000Z",
    }) as never);

    await saveLearningSessionProgress("roadmap-react", {
      checkedChecklistItems: { "react-components": ["Create a parent component"] },
      exerciseProofs: { "react-ex1": "Saved screenshot" },
    });

    expect(httpClient.put).toHaveBeenCalledWith(API_ROUTES.LEARNING.SESSION_PROGRESS("roadmap-react"), {
      checked_checklist_items: { "react-components": ["Create a parent component"] },
      exercise_proofs: { "react-ex1": "Saved screenshot" },
    });
  });

  it("posts quiz answers to the BE scoring endpoint", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(ok({
      question_id: "state-purpose",
      selected_option_index: 0,
      is_correct: true,
      scored: true,
      attempt_count: 1,
      correct_option_index: 0,
      explanation: "Local state belongs to interaction-owned UI data.",
      objective_mastery: {
        objective_id: "state-events",
        correct: 1,
        total_answered: 1,
        accuracy: 1,
        mastered: false,
      },
      lesson_status: "in_progress",
      next_recommended_questions: [],
      remediation: { section_id: "state-events" },
    }) as never);

    const result = await answerLearningQuizQuestion("roadmap-react", {
      skill_canonical: "react",
      question_id: "state-purpose",
      selected_option_index: 0,
    });

    expect(httpClient.post).toHaveBeenCalledWith(
      API_ROUTES.LEARNING.QUIZ_ANSWER("roadmap-react"),
      {
        skill_canonical: "react",
        question_id: "state-purpose",
        selected_option_index: 0,
      },
    );
    expect(result).toMatchObject({
      question_id: "state-purpose",
      is_correct: true,
      attempt_count: 1,
    });
  });

  it("loads adaptive next questions from the BE learning endpoint", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(ok({
      weak_objectives: [
        {
          objective_id: "react-props",
          correct: 0,
          total_answered: 1,
          accuracy: 0,
          mastered: false,
        },
      ],
      next_recommended_questions: [
        {
          id: "props-callback",
          question: "How should a child notify its parent?",
          options: ["Callback prop", "Global variable"],
          explanation: "Callbacks keep ownership clear.",
          objective_id: "react-props",
          section_id: "react-components",
        },
      ],
    }) as never);

    const result = await getLearningNextQuestions("roadmap-react", "react");

    expect(httpClient.get).toHaveBeenCalledWith(
      API_ROUTES.LEARNING.NEXT_QUESTIONS("roadmap-react", "react"),
    );
    expect(result.next_recommended_questions[0].id).toBe("props-callback");
  });

  it("patches a single checklist item without sending the full progress blob", async () => {
    vi.mocked(httpClient.put).mockReturnValueOnce(ok({
      session_id: "roadmap-react",
      checked_checklist_items: { "react-components": ["pass-props"] },
      exercise_proofs: {},
      quiz_attempts: {},
      updated_at: "2026-06-23T10:00:00.000Z",
    }) as never);

    const progress = await patchLearningChecklistItem("roadmap-react", "pass-props", {
      section_id: "react-components",
      checked: true,
    });

    expect(httpClient.put).toHaveBeenCalledWith(
      API_ROUTES.LEARNING.CHECKLIST_ITEM("roadmap-react", "pass-props"),
      {
        section_id: "react-components",
        checked: true,
      },
    );
    expect(progress.checkedChecklistItems).toEqual({ "react-components": ["pass-props"] });
  });

  it("maps composed steps to the Learning roadmap module shape", () => {
    const roadmap = roadmapToLearningRoadmap(composedRoadmap);

    expect(roadmap.totalHours).toBe(32);
    expect(roadmap.estimatedCompletionWeeks).toBe(4);
    expect(roadmap.modules[0]).toMatchObject({
      id: "react",
      title: "React",
      description: "Deep build - 12h",
      status: "in-progress",
      weekNumber: 1,
      estimatedHours: 12,
    });
    expect(roadmap.modules[0].resources).toEqual([
      {
        title: "React Quick Start",
        url: "https://react.dev/learn",
        type: "article",
        duration: "1h 30m",
        platform: "Official doc",
        id: "react-docs",
        isInternal: false,
        lowConfidence: false,
        sourceType: "official_doc",
        outcomeType: "foundation",
        proofOfCompletion: "Build a component",
        matchScore: 0.92,
        qualityScore: 0.95,
        freshnessScore: 0.9,
        videoChapters: [
          {
            id: "react-props",
            title: "Props",
            startSeconds: 900,
            objectiveId: "react-props",
          },
        ],
      },
      {
        title: "SkillBridge React level 4 project",
        url: "",
        type: "course",
        duration: "4h",
        platform: "Internal",
        id: "sb-react-project",
        isInternal: true,
        lowConfidence: true,
        sourceType: "mini_project",
        outcomeType: "project",
        contentTemplateId: "skillbridge.react.l4.project",
        description: "Build a SkillBridge-owned React portfolio project.",
        proofOfCompletion: undefined,
        matchScore: 0.88,
        qualityScore: 0.9,
        freshnessScore: 0.86,
      },
    ]);
  });

  it("places the highest-priority skill first in every roadmap view", () => {
    const lowerPriority = composedRoadmap.steps[0];
    const higherPriority = {
      ...lowerPriority,
      skill_canonical: "typescript",
      display_name: "TypeScript",
      priority: lowerPriority.priority + 10,
    };
    const roadmap = {
      ...composedRoadmap,
      steps: [lowerPriority, higherPriority],
    };

    expect(roadmapToLearningRoadmap(roadmap).modules.map((module) => module.id)).toEqual([
      "typescript",
      "react",
    ]);
    expect(roadmapToWeekPlans(roadmap).map((week) => week.moduleId)).toEqual([
      "typescript",
      "react",
    ]);
  });

  it("maps each composed step to one actionable session with resource metadata", () => {
    const weeks = roadmapToWeekPlans(composedRoadmap);

    expect(weeks).toHaveLength(1);
    expect(weeks[0].moduleTitle).toBe("React");
    expect(weeks[0].sessions[0]).toMatchObject({
      id: "roadmap-react",
      skill: "React",
      title: "React - Deep build",
      estimatedMinutes: 720,
      status: "in-progress",
    });
    expect(weeks[0].sessions[0].resources).toEqual([
      {
        title: "React Quick Start",
        url: "https://react.dev/learn",
        type: "article",
        duration: "1h 30m",
        platform: "Official doc",
        id: "react-docs",
        isInternal: false,
        lowConfidence: false,
        sourceType: "official_doc",
        outcomeType: "foundation",
        proofOfCompletion: "Build a component",
        matchScore: 0.92,
        qualityScore: 0.95,
        freshnessScore: 0.9,
        videoChapters: [
          {
            id: "react-props",
            title: "Props",
            startSeconds: 900,
            objectiveId: "react-props",
          },
        ],
      },
      {
        title: "SkillBridge React level 4 project",
        url: "",
        type: "course",
        duration: "4h",
        platform: "Internal",
        id: "sb-react-project",
        isInternal: true,
        lowConfidence: true,
        sourceType: "mini_project",
        outcomeType: "project",
        contentTemplateId: "skillbridge.react.l4.project",
        description: "Build a SkillBridge-owned React portfolio project.",
        proofOfCompletion: undefined,
        matchScore: 0.88,
        qualityScore: 0.9,
        freshnessScore: 0.86,
      },
    ]);
    expect(weeks[0].sessions[0].recommendedCourses).toEqual([
      {
        id: "react-course",
        title: "React with Projects",
        url: "https://example.com/react-course",
        provider: "Coursera",
        duration: "6h",
        isFree: false,
        language: "en",
        difficulty: "INTERMEDIATE",
        rating: 4.6,
        skills: [{ skill_canonical_name: "react", teaches_level: 4 }],
        matchScore: 92,
      },
    ]);
    expect(weeks[0].sessions[0].lessonContent).toEqual({
      title: "React component fundamentals",
      summary: "SkillBridge-owned React lesson.",
      licenseType: "skillbridge_original",
      reusePolicy: "full_reuse_allowed",
      sourceResourceIds: ["react-docs", "sb-react-project"],
      learningObjectives: [
        {
          id: "react-props",
          title: "Pass data with props",
          description: "Use one-way parent-to-child data flow.",
        },
      ],
      sections: [
        {
          id: "react-components",
          title: "Components and props",
          body: "A React component is a small function that returns UI.",
          objectiveId: "react-props",
          checklist: [
            { id: "create-parent", label: "Create a parent component", objectiveId: "react-props" },
            { id: "pass-props", label: "Pass props to a child component", objectiveId: "react-props" },
          ],
        },
      ],
      quiz: [
        {
          id: "react-q1",
          question: "What are props used for?",
          options: ["Parent-to-child data", "Database writes"],
          correctOptionIndex: 0,
          explanation: "Props keep data flow explicit.",
          kind: "scenario",
          objectiveId: "react-props",
          sectionId: "react-components",
          remediation: {
            sectionId: "react-components",
            videoResourceId: "react-docs",
            videoChapterId: "react-props",
            startSeconds: 900,
          },
        },
      ],
      exercises: [
        {
          id: "react-ex1",
          title: "Build a filtered card list",
          prompt: "Render cards and filter them from an input.",
          acceptanceCriteria: ["Cards come from an array", "Filtering updates without reload"],
          proofOfCompletion: "Save a screenshot and short note.",
        },
      ],
    });
    expect(weeks[0].sessions[0].sections).toEqual([
      {
        id: "react-components",
        title: "Components and props",
        completed: false,
        exercises: 1,
        completedExercises: 0,
        type: "reading",
        body: "A React component is a small function that returns UI.",
        objectiveId: "react-props",
        checklist: [
          { id: "create-parent", label: "Create a parent component", objectiveId: "react-props" },
          { id: "pass-props", label: "Pass props to a child component", objectiveId: "react-props" },
        ],
      },
    ]);
  });

  it("does not create a learning session when BE returns no renderable content for a step", () => {
    const roadmapWithoutResources: ComposedRoadmap = {
      ...composedRoadmap,
      steps: [
        {
          ...composedRoadmap.steps[0],
          resources: [],
          recommended_courses: [],
          lesson_content: undefined,
        },
      ],
    };

    const weeks = roadmapToWeekPlans(roadmapWithoutResources);

    expect(weeks).toEqual([]);
  });
});
