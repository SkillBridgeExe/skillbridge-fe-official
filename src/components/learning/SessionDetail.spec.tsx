// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionDetail } from "./SessionDetail";
import type { LearningSession } from "./types";
import { ApiError } from "@/lib/api-error";

const authMocks = vi.hoisted(() => ({
  hasApiAuthSession: vi.fn(() => false),
}));

const navigationMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const roadmapStoreMocks = vi.hoisted(() => ({
  applySessionCompletion: vi.fn(),
  setActiveRoadmap: vi.fn(),
  setWeekPlans: vi.fn(),
}));

const learningV2Mocks = vi.hoisted(() => ({
  getCurrentActiveLearningRoadmap: vi.fn(),
  translateLearningDisplay: vi.fn(),
}));

const learningServiceMocks = vi.hoisted(() => ({
  answerLearningQuizQuestion: vi.fn(),
  completeLearningSession: vi.fn(),
  getLearningNextQuestions: vi.fn(),
  getLearningSessionProgress: vi.fn(),
  patchLearningChecklistItem: vi.fn(),
  saveLearningSessionProgress: vi.fn(),
  // useLearningChatCompanion (Task M3) imports these from the same service module.
  sendLearningChatMessage: vi.fn(),
  getLearningChatHistory: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const labels: Record<string, string> = {
        "learning.common.pageOf": `Page ${options?.current} / ${options?.total}`,
        "learning.session.recommendedCourses": "Recommended courses",
        "learning.session.recommendedResources": "Recommended learning resources",
        "learning.session.savedCourses": "Saved courses",
        "learning.session.documentation": "Documentation",
        "learning.session.minRead": `${options?.count} min read`,
        "learning.common.sections": `${options?.count} sections`,
        "learning.session.onThisPage": "On this page",
        "learning.session.sectionIntro": "Section intro",
        "learning.session.type": "Type",
        "learning.common.exercises": `${options?.count} exercises`,
        "learning.session.markComplete": "Mark complete",
        "learning.session.done": "Done",
        "learning.session.nextSection": "Next section",
        "learning.session.continue": "Continue",
        "learning.session.completeRequiredWork": "Complete required work",
        "learning.session.backToRoadmap": "Back to roadmap",
        "learning.common.session": `Session ${options?.number}`,
        "learning.session.previous": "Previous",
        "learning.session.next": "Next",
        "learning.session.lessons": "Lessons",
        "learning.session.hideLessons": "Hide lessons",
        "learning.session.askAiTutor": "Ask AI tutor",
        "learning.session.completedProgress": "Completed",
        "learning.common.free": "Free",
        "learning.common.paid": "Paid",
        "learning.common.openCourse": "Open course",
        "learning.common.save": "Save",
        "learning.session.lessonContent": "Lesson Content",
        "learning.session.knowledgeCheck": "Knowledge check",
        "learning.session.correctCount": `${options?.correct} / ${options?.total} correct`,
        "learning.session.checkAnswers": "Check answer",
        "learning.session.questionCount": `${options?.count} questions`,
        "learning.session.translateToVietnamese": "Translate to Vietnamese",
        "learning.session.viewOriginal": "View original",
        "learning.session.progressSaveFailed":
          "Không thể lưu tiến độ. Vui lòng thử lại.",
        "learning.session.close": "Đóng",
      };
      // useLearningChatCompanion (Task M3) requests the static suggestion chips
      // with { returnObjects: true } — this fake `t` otherwise only ever returns
      // strings, so give it back a real array like the diagnosis chat spec does.
      if (key === "companion.learningChat.suggestions") return ["q1", "q2", "q3"];
      return labels[key] ?? String(options?.defaultValue ?? key);
    },
    // useLearningChatCompanion (Task M3) reads i18n.language for the chat's
    // answer-language field — a real mock needs this shape, not just `t`.
    i18n: { language: "en" },
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigationMocks.navigate,
}));

vi.mock("@posthog/react", () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

vi.mock("@/components/learning/roadmap-store", () => ({
  useActiveWeekPlans: () => [],
  useRoadmapStore: () => ({
    applySessionCompletion: roadmapStoreMocks.applySessionCompletion,
    setActiveRoadmap: roadmapStoreMocks.setActiveRoadmap,
    weekPlans: [],
    setWeekPlans: roadmapStoreMocks.setWeekPlans,
  }),
}));

vi.mock("@/services/auth-session.service", () => ({
  hasApiAuthSession: authMocks.hasApiAuthSession,
}));

vi.mock("@/services/learning-roadmap.service", () => learningServiceMocks);
vi.mock("@/services/learning-roadmaps-v2.service", () => learningV2Mocks);

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.hasApiAuthSession.mockReturnValue(false);
  learningServiceMocks.getLearningSessionProgress.mockResolvedValue({
    checkedChecklistItems: {},
    exerciseProofs: {},
    quizAttempts: {},
  });
  learningServiceMocks.getLearningNextQuestions.mockResolvedValue({
    weak_objectives: [],
    next_recommended_questions: [],
  });
  learningServiceMocks.patchLearningChecklistItem.mockResolvedValue({
    checkedChecklistItems: { "section-one": ["check-one"] },
    exerciseProofs: {},
    quizAttempts: {},
  });
  learningServiceMocks.saveLearningSessionProgress.mockResolvedValue({
    checkedChecklistItems: {},
    exerciseProofs: {},
    quizAttempts: {},
  });
  learningServiceMocks.completeLearningSession.mockResolvedValue({
    session_id: "session-ready",
    status: "COMPLETED",
    module_completed: true,
    next_session_id: "session-next",
    unlocked_session_ids: ["session-next"],
  });
  learningV2Mocks.getCurrentActiveLearningRoadmap.mockResolvedValue({
    id: "roadmap-refreshed",
    status: "ACTIVE",
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const makeResource = (index: number) => ({
  id: `resource-${index}`,
  title: `Resource ${index}`,
  url: `https://example.test/resource-${index}`,
  type: "course" as const,
  platform: "SkillBridge",
  duration: "1h",
});

const session: LearningSession = {
  id: "session-pagination",
  moduleId: "module-pagination",
  sessionNumber: 1,
  title: "Pagination Session",
  skill: "React",
  dayOfWeek: 1,
  estimatedMinutes: 60,
  status: "in-progress",
  stars: 0,
  maxStars: 5,
  sections: [
    {
      id: "section-one",
      title: "Section One",
      completed: false,
      exercises: 1,
      completedExercises: 0,
      type: "reading",
    },
    {
      id: "section-two",
      title: "Section Two",
      completed: false,
      exercises: 1,
      completedExercises: 0,
      type: "reading",
    },
  ],
  resources: Array.from({ length: 9 }, (_, index) => makeResource(index + 1)),
  recommendedCourses: [],
};

const sqlDocVideoSession: LearningSession = {
  ...session,
  id: "session-sql-doc-video",
  title: "SQL - Deep build",
  estimatedMinutes: 30,
  sections: [
    {
      id: "select-filter",
      title: "Select and filter",
      completed: false,
      exercises: 1,
      completedExercises: 0,
      type: "reading",
      body: "Start every query by being clear about the table.",
      checklist: [{ id: "select-columns", label: "Select only needed columns." }],
    },
    {
      id: "join-related",
      title: "Join related tables",
      completed: false,
      exercises: 1,
      completedExercises: 0,
      type: "reading",
      body: "A join combines rows from related tables.",
      checklist: [{ id: "explicit-join", label: "Use an explicit JOIN clause." }],
    },
    {
      id: "youtube-sql",
      title: "SQL Course for Beginners [Full Course]",
      completed: false,
      exercises: 0,
      completedExercises: 0,
      type: "video",
    },
  ],
  lessonContent: {
    title: "SQL query basics for application data",
    summary: "Practice selecting, filtering, joining, and explaining relational data.",
    licenseType: "skillbridge_original",
    reusePolicy: "full_reuse_allowed",
    sourceResourceIds: ["youtube-sql"],
    learningObjectives: [],
    sections: [],
    quiz: [
      {
        id: "where-clause",
        question: "What does a WHERE clause do?",
        options: ["Filters rows by a condition", "Creates a table"],
        correctOptionIndex: 0,
        explanation: "WHERE narrows rows.",
        sectionId: "select-filter",
      },
    ],
    exercises: [],
  },
  resources: [
    {
      id: "youtube-sql",
      title: "SQL Course for Beginners [Full Course]",
      url: "https://www.youtube.com/watch?v=7S_tz1z_5bA",
      type: "youtube",
      platform: "Video",
      duration: "3h 11m",
      videoChapters: [
        { id: "select-filter", title: "Select and filter", startSeconds: 0 },
        { id: "join-related", title: "Join related tables", startSeconds: 576 },
      ],
    },
  ],
  recommendedCourses: [],
};

describe("SessionDetail", () => {
  it("resets resource pagination when the active section changes", () => {
    render(<SessionDetail session={session} />);
    const resourcePanel = screen.getByRole("complementary", {
      name: "Recommended learning resources",
    });

    expect(within(resourcePanel).getByText("Resource 1")).toBeInTheDocument();
    expect(within(resourcePanel).queryByText("Resource 9")).not.toBeInTheDocument();

    const pagination = within(resourcePanel).getByText("Page 1 / 2").parentElement;
    expect(pagination).not.toBeNull();
    const [, nextPageButton] = within(pagination as HTMLElement).getAllByRole("button");
    fireEvent.click(nextPageButton);

    expect(within(resourcePanel).getByText("Page 2 / 2")).toBeInTheDocument();
    expect(within(resourcePanel).getByText("Resource 9")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Section Two/ })[0]);

    expect(within(resourcePanel).getByText("Page 1 / 2")).toBeInTheDocument();
    expect(within(resourcePanel).getByText("Resource 1")).toBeInTheDocument();
    expect(within(resourcePanel).queryByText("Resource 9")).not.toBeInTheDocument();
  });

  it("shows the complete button after switching from a completed session to an in-progress session", () => {
    const completedSession: LearningSession = {
      ...session,
      id: "session-completed",
      status: "completed",
    };
    const inProgressSession: LearningSession = {
      ...session,
      id: "session-in-progress",
      status: "in-progress",
    };

    const { rerender } = render(<SessionDetail session={completedSession} />);

    expect(screen.getByText("Done")).toBeInTheDocument();

    rerender(<SessionDetail session={inProgressSession} />);

    expect(screen.queryByText("Done")).not.toBeInTheDocument();
  });

  it("uses checklist PATCH without scheduling the legacy full progress PUT", async () => {
    authMocks.hasApiAuthSession.mockReturnValue(true);
    const checklistSession: LearningSession = {
      ...session,
      id: "session-checklist-patch",
      sections: [
        {
          id: "section-one",
          title: "Section One",
          completed: false,
          exercises: 1,
          completedExercises: 0,
          type: "reading",
          checklist: [{ id: "check-one", label: "Check one" }],
        },
      ],
    };

    render(<SessionDetail session={checklistSession} />);

    await waitFor(() => {
      expect(learningServiceMocks.getLearningNextQuestions).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole("tab", { name: "Practice" }));
    fireEvent.click(screen.getByRole("button", { name: /Lab 01 Check one/ }));
    fireEvent.change(screen.getByLabelText("Proof for Check one"), {
      target: { value: "Completed check one with proof." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check task" }));

    await waitFor(() => {
      expect(learningServiceMocks.patchLearningChecklistItem).toHaveBeenCalledWith(
        "session-checklist-patch",
        "check-one",
        { section_id: "section-one", checked: true },
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(learningServiceMocks.saveLearningSessionProgress).not.toHaveBeenCalled();
  });

  it("announces translation failures instead of exposing them only as a tooltip", async () => {
    learningV2Mocks.translateLearningDisplay.mockRejectedValueOnce(
      new Error("Translation unavailable"),
    );

    render(<SessionDetail session={session} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Translate to Vietnamese" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Translation unavailable",
    );
  });
  it("rolls back an optimistic checklist update and exposes a retryable save error", async () => {
    authMocks.hasApiAuthSession.mockReturnValue(true);
    learningServiceMocks.patchLearningChecklistItem.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );
    const checklistSession: LearningSession = {
      ...session,
      id: "session-checklist-error",
      sections: [
        {
          id: "section-one",
          title: "Section One",
          completed: false,
          exercises: 1,
          completedExercises: 0,
          type: "reading",
          checklist: [{ id: "check-one", label: "Check one" }],
        },
      ],
    };

    render(<SessionDetail session={checklistSession} />);
    await waitFor(() => {
      expect(learningServiceMocks.getLearningNextQuestions).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole("tab", { name: "Practice" }));
    fireEvent.click(screen.getByRole("button", { name: /Lab 01 Check one/ }));
    fireEvent.change(screen.getByLabelText("Proof for Check one"), {
      target: { value: "Completed check one with proof." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check task" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể lưu tiến độ",
    );
    expect(screen.queryByText("Done")).not.toBeInTheDocument();
  });

  it("seeks the YouTube lesson when a lesson content chapter is clicked", () => {
    const videoSession: LearningSession = {
      ...session,
      id: "session-video-seek",
      title: "SQL Course for Beginners [Full Course]",
      sections: [
        {
          id: "section-video",
          title: "SQL Course for Beginners [Full Course]",
          completed: false,
          exercises: 0,
          completedExercises: 0,
          type: "video",
        },
      ],
      lessonContent: {
        title: "SQL query basics for application data",
        summary: "Practice selecting, filtering, joining, and explaining relational data.",
        licenseType: "skillbridge_original",
        reusePolicy: "full_reuse_allowed",
        sourceResourceIds: ["youtube-sql"],
        learningObjectives: [],
        sections: [],
        quiz: [
          {
            id: "where-clause",
            question: "What does a WHERE clause do?",
            options: ["Filters rows by a condition", "Creates a table"],
            correctOptionIndex: 0,
            explanation: "WHERE narrows rows.",
            sectionId: "select-filter",
          },
        ],
        exercises: [],
      },
      resources: [
        {
          id: "youtube-sql",
          title: "SQL Course for Beginners [Full Course]",
          url: "https://www.youtube.com/watch?v=HXV3zeQKqGY",
          type: "youtube",
          platform: "Video",
          duration: "3h 11m",
          videoChapters: [
            { id: "select-filter", title: "Select and filter", startSeconds: 0 },
            { id: "join-related-tables", title: "Join related tables", startSeconds: 576 },
          ],
        },
      ],
      recommendedCourses: [],
    };

    render(<SessionDetail session={videoSession} />);

    fireEvent.click(screen.getByText("Join related tables"));

    expect(screen.getByTitle("SQL Course for Beginners [Full Course]")).toHaveAttribute(
      "src",
      expect.stringContaining("start=576&autoplay=1"),
    );
  });

  it("keeps video learning in Learn and moves the quiz into Check", () => {
    const videoSession: LearningSession = {
      ...sqlDocVideoSession,
      id: "session-video-quiz-last",
      sections: [
        {
          id: "youtube-sql",
          title: "SQL Course for Beginners [Full Course]",
          completed: false,
          exercises: 0,
          completedExercises: 0,
          type: "video",
        },
      ],
    };

    render(<SessionDetail session={videoSession} />);

    const videoFrame = screen.getByTitle("SQL Course for Beginners [Full Course]");
    const lessonContentHeading = screen.getByText("Lesson Content");

    expect(
      Boolean(videoFrame.compareDocumentPosition(lessonContentHeading) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
    expect(screen.queryByRole("button", { name: /Knowledge check/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Check" }));

    expect(screen.getByRole("button", { name: /Knowledge check/ })).toBeInTheDocument();
  });

  it("filters the lesson sidebar with content-type tabs", () => {
    render(<SessionDetail session={sqlDocVideoSession} />);

    const lessonList = screen.getByLabelText("Session lesson list");
    expect(within(lessonList).getByText("Select and filter")).toBeInTheDocument();
    expect(within(lessonList).getByText("SQL Course for Beginners [Full Course]")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Video" }));

    expect(within(lessonList).queryByText("Select and filter")).not.toBeInTheDocument();
    expect(within(lessonList).getByText("SQL Course for Beginners [Full Course]")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Quiz" }));

    expect(within(lessonList).queryByText("SQL Course for Beginners [Full Course]")).not.toBeInTheDocument();
    expect(within(lessonList).getByText("Knowledge check")).toBeInTheDocument();
  });

  it("opens the video as the first lesson", () => {
    render(<SessionDetail session={sqlDocVideoSession} />);

    const lessonList = screen.getByLabelText("Session lesson list");
    const lessonItems = within(lessonList).getAllByRole("button");

    expect(lessonItems[0]).toHaveAccessibleName(
      /SQL Course for Beginners \[Full Course\] video - 0 exercises/,
    );
    expect(screen.getByTitle("SQL Course for Beginners [Full Course]")).toBeInTheDocument();
  });

  it("shows document content in Learn and the quiz in Check", () => {
    render(<SessionDetail session={sqlDocVideoSession} />);

    const lessonList = screen.getByLabelText("Session lesson list");
    fireEvent.click(within(lessonList).getByRole("button", { name: /Select and filter/ }));

    const firstLessonHeading = screen.getByRole("heading", { name: "1. Select and filter" });

    expect(firstLessonHeading).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Knowledge check/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Check" }));

    expect(screen.getByRole("button", { name: /Knowledge check/ })).toBeInTheDocument();
  });

  it("requires proof before a practice lab task can be completed", () => {
    render(<SessionDetail session={sqlDocVideoSession} />);

    const lessonList = screen.getByLabelText("Session lesson list");
    fireEvent.click(within(lessonList).getByRole("button", { name: /Select and filter/ }));

    expect(screen.getByText("You will be able to")).toBeInTheDocument();
    expect(screen.getAllByText("Select only needed columns.").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/Proof for Select only needed columns/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Practice" }));

    expect(screen.getAllByText("Lab 01").length).toBeGreaterThan(0);
    expect(screen.getByText("Evidence summary")).toBeInTheDocument();
    expect(screen.getAllByText("Practice needed").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Lab 01 Select only needed columns/ }));

    expect(screen.getByText("Practice rubric")).toBeInTheDocument();
    expect(screen.getByText("Specific result or output")).toBeInTheDocument();
    expect(screen.getByText("Example proof")).toBeInTheDocument();
    expect(screen.getByLabelText(/Proof for Select only needed columns/)).toHaveAttribute(
      "placeholder",
      "Example: I practiced this and the result was...",
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Check task" })[0]);

    expect(screen.getByText("Add proof before checking this task.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Proof for Select only needed columns/), {
      target: { value: "I selected customer_id and email only in my SQL query." },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Check task" })[0]);

    expect(screen.getAllByText("Done").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "Check" }));
    fireEvent.click(screen.getByRole("button", { name: /Knowledge check/ }));

    expect(screen.getByText("Concept")).toBeInTheDocument();
    expect(screen.getByText("Portfolio evidence")).toBeInTheDocument();
  });

  it("waits for Check answer before revealing quiz feedback", async () => {
    render(<SessionDetail session={sqlDocVideoSession} />);

    fireEvent.click(screen.getByRole("tab", { name: "Check" }));
    fireEvent.click(screen.getByRole("button", { name: /Knowledge check/ }));
    fireEvent.click(screen.getByRole("button", { name: /Filters rows by a condition/ }));

    expect(screen.queryByText("WHERE narrows rows.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() => {
      expect(screen.getByText("WHERE narrows rows.")).toBeInTheDocument();
    });
  });

  it("does not always show the original correct answer as option A", () => {
    render(<SessionDetail session={sqlDocVideoSession} />);

    fireEvent.click(screen.getByRole("tab", { name: "Check" }));
    fireEvent.click(screen.getByRole("button", { name: /Knowledge check/ }));

    expect(screen.getByRole("button", { name: /A Creates a table/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /B Filters rows by a condition/ })).toBeInTheDocument();
  });

  it("uses one shared Check answers button for the whole quiz", async () => {
    const twoQuestionSession: LearningSession = {
      ...sqlDocVideoSession,
      id: "session-two-question-quiz",
      lessonContent: {
        ...sqlDocVideoSession.lessonContent!,
        quiz: [
          ...sqlDocVideoSession.lessonContent!.quiz,
          {
            id: "join-purpose",
            question: "Why use a JOIN?",
            options: ["Combines related rows", "Deletes every row"],
            correctOptionIndex: 0,
            explanation: "JOIN combines related data.",
            sectionId: "join-related",
          },
        ],
      },
    };

    render(<SessionDetail session={twoQuestionSession} />);

    fireEvent.click(screen.getByRole("tab", { name: "Check" }));
    fireEvent.click(screen.getByRole("button", { name: /Knowledge check/ }));

    expect(screen.getAllByRole("button", { name: "Check answer" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /B Filters rows by a condition/ }));
    fireEvent.click(screen.getByRole("button", { name: /B Combines related rows/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() => {
      expect(screen.getByText("WHERE narrows rows.")).toBeInTheDocument();
      expect(screen.getByText("JOIN combines related data.")).toBeInTheDocument();
    });
  });

  it("lets the learner retry the quiz after checking answers", async () => {
    render(<SessionDetail session={sqlDocVideoSession} />);

    fireEvent.click(screen.getByRole("tab", { name: "Check" }));
    fireEvent.click(screen.getByRole("button", { name: /Knowledge check/ }));
    fireEvent.click(screen.getByRole("button", { name: /B Filters rows by a condition/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() => {
      expect(screen.getByText("WHERE narrows rows.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Retry quiz" }));

    expect(screen.queryByText("WHERE narrows rows.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /B Filters rows by a condition/ })).not.toBeDisabled();
  });

  it("does not require a quiz score to complete required learning work", () => {
    const readyButQuizIncompleteSession: LearningSession = {
      ...sqlDocVideoSession,
      id: "session-quiz-required",
      sections: sqlDocVideoSession.sections.map((section) => ({
        ...section,
        completed: true,
        checklist: undefined,
      })),
    };

    render(<SessionDetail session={readyButQuizIncompleteSession} />);

    fireEvent.click(screen.getByRole("tab", { name: "Practice" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Mark complete" })[0]);

    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("completes through BE once, patches server statuses, and follows next_session_id", async () => {
    authMocks.hasApiAuthSession.mockReturnValue(true);
    const readySession: LearningSession = {
      ...session,
      id: "session-ready",
      sections: session.sections.map((section) => ({
        ...section,
        completed: true,
      })),
    };

    render(<SessionDetail session={readySession} />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Mark complete" })[0],
    );

    await waitFor(() => {
      expect(learningServiceMocks.completeLearningSession).toHaveBeenCalledTimes(1);
      expect(learningServiceMocks.completeLearningSession).toHaveBeenCalledWith(
        "session-ready",
      );
    });
    expect(learningV2Mocks.getCurrentActiveLearningRoadmap).toHaveBeenCalledOnce();
    expect(roadmapStoreMocks.setActiveRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({ id: "roadmap-refreshed" }),
    );
    expect(roadmapStoreMocks.applySessionCompletion).not.toHaveBeenCalled();
    expect(navigationMocks.navigate).toHaveBeenCalledWith(
      "/learning/session/session-next",
    );
  });

  it("uses BE missing-work details to return to Practice after rejection", async () => {
    authMocks.hasApiAuthSession.mockReturnValue(true);
    learningServiceMocks.getLearningSessionProgress.mockResolvedValue({
      checkedChecklistItems: {
        "select-filter": ["select-columns"],
        "join-related": ["explicit-join"],
      },
      exerciseProofs: {
        "task:select-filter:select-columns": "Selected only the needed columns.",
        "task:join-related:explicit-join": "Used an explicit join with matching keys.",
      },
      quizAttempts: {},
    });
    learningServiceMocks.completeLearningSession.mockRejectedValue(
      new ApiError("Complete required work", null, {
        missing_section_ids: [],
        missing_checklist_item_ids: ["select-filter:select-columns"],
        missing_exercise_ids: [],
      }),
    );

    render(<SessionDetail session={sqlDocVideoSession} />);
    await waitFor(() => {
      expect(
        learningServiceMocks.getLearningSessionProgress,
      ).toHaveBeenCalledWith(sqlDocVideoSession.id);
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Mark complete" })[0],
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Complete required work",
      );
      expect(screen.getByRole("tab", { name: "Practice" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
    expect(learningServiceMocks.completeLearningSession).toHaveBeenCalledTimes(1);
    expect(roadmapStoreMocks.applySessionCompletion).not.toHaveBeenCalled();
  });

  it("continues from the final learning section into Practice instead of disabling", () => {
    render(<SessionDetail session={{ ...session, recommendedCourses: [] }} />);

    const continueButton = screen.getByRole("button", { name: /Continue/ });
    fireEvent.click(continueButton);
    expect(screen.getAllByRole("button", { name: /Section Two/ })[0]).toHaveClass(
      "bg-primary",
    );

    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);

    expect(screen.getByRole("tab", { name: "Practice" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("keeps Continue actionable and focuses the first missing proof", async () => {
    render(<SessionDetail session={sqlDocVideoSession} />);
    const lessonList = screen.getByLabelText("Session lesson list");
    fireEvent.click(
      within(lessonList).getByRole("button", { name: /Select and filter/ }),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Practice" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Complete required work",
    );
    await waitFor(() => {
      expect(
        screen.getByLabelText(/Proof for Select only needed columns/),
      ).toHaveFocus();
    });
  });

  it("renders session resources in the responsive recommendation panel", () => {
    render(
      <SessionDetail
        session={{
          ...session,
          recommendedCourses: [],
          resources: [
            {
              id: "html-course",
              title: "Accessible HTML course",
              url: "https://example.test/html",
              type: "course",
              platform: "SkillBridge",
            },
          ],
        }}
      />,
    );

    const panel = screen.getByRole("complementary", {
      name: "Recommended learning resources",
    });
    expect(within(panel).getByText("Accessible HTML course")).toBeInTheDocument();
  });

  it("omits the recommendation panel when a session has no resources", () => {
    render(
      <SessionDetail
        session={{ ...session, recommendedCourses: [], resources: [] }}
      />,
    );

    expect(
      screen.queryByRole("complementary", {
        name: "Recommended learning resources",
      }),
    ).not.toBeInTheDocument();
  });

  it("uses video duration and hides the full-video row when timeline chapters are missing", () => {
    const noChapterVideoSession: LearningSession = {
      ...sqlDocVideoSession,
      id: "session-video-no-chapters",
      title: "Computer Vision - Deep build",
      estimatedMinutes: 417,
      sections: [
        {
          id: "core-concepts",
          title: "Core concepts of Computer Vision",
          completed: false,
          exercises: 1,
          completedExercises: 0,
          type: "reading",
        },
        {
          id: "practical-application",
          title: "Practical application of Computer Vision",
          completed: false,
          exercises: 1,
          completedExercises: 0,
          type: "reading",
        },
        {
          id: "opencv-video",
          title: "OpenCV Course - Full Tutorial with Python",
          completed: false,
          exercises: 0,
          completedExercises: 0,
          type: "video",
        },
      ],
      resources: [
        {
          id: "opencv-video",
          title: "OpenCV Course - Full Tutorial with Python",
          url: "https://www.youtube.com/watch?v=oXlwWbU8l2o",
          type: "youtube",
          platform: "Video",
          duration: "3h 42m",
        },
      ],
    };

    render(<SessionDetail session={noChapterVideoSession} />);

    expect(screen.getByText("01:51:00")).toBeInTheDocument();
    expect(screen.queryByText("06:56:00")).not.toBeInTheDocument();
  });
});
