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
});
