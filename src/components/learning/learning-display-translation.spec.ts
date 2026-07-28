import { describe, expect, it } from "vitest";
import {
  applyLearningDisplayTranslations,
  buildLearningDisplayTranslationItems,
} from "./learning-display-translation";
import type { LearningSession } from "./types";

const session = {
  id: "session-1",
  moduleId: "module-1",
  sessionNumber: 1,
  title: "React Session",
  skill: "React",
  dayOfWeek: 1,
  estimatedMinutes: 60,
  status: "in-progress",
  stars: 0,
  maxStars: 5,
  sections: [
    {
      id: "section-1",
      title: "Components",
      body: "Learn component composition.",
      completed: false,
      exercises: 0,
      completedExercises: 0,
      type: "reading",
    },
  ],
  resources: [],
} satisfies LearningSession;

const lessonSession = {
  ...session,
  lessonContent: {
    title: "React lesson",
    summary: "Lesson summary",
    licenseType: "skillbridge_original",
    reusePolicy: "full_reuse_allowed",
    sourceResourceIds: [],
    learningObjectives: [],
    sections: [
      {
        id: "lesson-section-1",
        title: "Lesson components",
        body: "Lesson section body",
        checklist: [],
      },
    ],
    quiz: [],
    exercises: [],
  },
} satisfies LearningSession;

describe("learning display translation", () => {
  it("builds stable transient IDs and applies returned translations immutably", () => {
    expect(buildLearningDisplayTranslationItems(session)).toContainEqual({
      id: "section:section-1",
      title: "Components",
      summary: "Learn component composition.",
    });

    const translated = applyLearningDisplayTranslations(session, [
      {
        id: "section:section-1",
        locale: "vi",
        title: "Thành phần",
        summary: "Học cách kết hợp thành phần.",
      },
    ]);

    expect(translated.sections[0]).toEqual(
      expect.objectContaining({
        title: "Thành phần",
        body: "Học cách kết hợp thành phần.",
      }),
    );
    expect(session.sections[0].title).toBe("Components");
  });

  it("translates lesson sections independently from session sections", () => {
    expect(buildLearningDisplayTranslationItems(lessonSession)).toContainEqual({
      id: "lesson-section:lesson-section-1",
      title: "Lesson components",
      summary: "Lesson section body",
    });

    const translated = applyLearningDisplayTranslations(lessonSession, [
      {
        id: "lesson-section:lesson-section-1",
        locale: "vi",
        title: "Thành phần bài học",
        summary: "Nội dung phần bài học",
      },
    ]);

    expect(translated.lessonContent?.sections[0]).toEqual(
      expect.objectContaining({
        title: "Thành phần bài học",
        body: "Nội dung phần bài học",
      }),
    );
    expect(translated.sections[0].title).toBe("Components");
  });
});
