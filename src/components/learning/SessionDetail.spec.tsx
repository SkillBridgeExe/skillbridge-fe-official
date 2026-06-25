// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionDetail } from "./SessionDetail";
import type { LearningSession } from "./types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const labels: Record<string, string> = {
        "learning.common.pageOf": `Page ${options?.current} / ${options?.total}`,
        "learning.session.recommendedCourses": "Recommended courses",
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
      };
      return labels[key] ?? String(options?.defaultValue ?? key);
    },
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components/learning/roadmap-store", () => ({
  useActiveWeekPlans: () => [],
  useRoadmapStore: () => ({
    weekPlans: [],
    setWeekPlans: vi.fn(),
  }),
}));

vi.mock("@/services/auth-session.service", () => ({
  hasApiAuthSession: () => false,
}));

vi.mock("@/services/learning-roadmap.service", () => ({
  getLearningSessionProgress: vi.fn(),
  saveLearningSessionProgress: vi.fn(),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const makeCourse = (index: number) => ({
  id: `course-${index}`,
  title: `Course ${index}`,
  url: `https://example.test/course-${index}`,
  provider: "SkillBridge",
  duration: "1h",
  isFree: true,
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
  resources: [],
  recommendedCourses: Array.from({ length: 9 }, (_, index) => makeCourse(index + 1)),
};

describe("SessionDetail", () => {
  it("resets recommended-course pagination when the active section changes", () => {
    render(<SessionDetail session={session} />);

    expect(screen.getByText("Course 1")).toBeInTheDocument();
    expect(screen.queryByText("Course 9")).not.toBeInTheDocument();

    const pagination = screen.getByText("Page 1 / 2").parentElement;
    expect(pagination).not.toBeNull();
    const [, nextPageButton] = within(pagination as HTMLElement).getAllByRole("button");
    fireEvent.click(nextPageButton);

    expect(screen.getByText("Page 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("Course 9")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Section Two/ })[0]);

    expect(screen.getByText("Page 1 / 2")).toBeInTheDocument();
    expect(screen.getByText("Course 1")).toBeInTheDocument();
    expect(screen.queryByText("Course 9")).not.toBeInTheDocument();
  });
});
