import { describe, expect, it } from "vitest";
import { getActiveSessionResource } from "./session-content";
import type { LearningSession } from "./types";

const baseSession: LearningSession = {
  id: "session-1",
  moduleId: "testing",
  sessionNumber: 1,
  title: "Manual Testing - Deep build",
  skill: "Manual Testing",
  dayOfWeek: 1,
  estimatedMinutes: 120,
  status: "in-progress",
  stars: 0,
  maxStars: 5,
  sections: [
    {
      id: "section-intro",
      title: "Introduction to Software Testing (University of Minnesota)",
      completed: false,
      exercises: 1,
      completedExercises: 0,
      type: "practice",
    },
    {
      id: "section-automation",
      title: "Software Testing and Automation Specialization (University of Minnesota)",
      completed: false,
      exercises: 1,
      completedExercises: 0,
      type: "practice",
    },
  ],
  resources: [
    {
      id: "resource-intro",
      title: "Introduction to Software Testing (University of Minnesota)",
      url: "https://example.test/intro",
      type: "course",
    },
    {
      id: "resource-automation",
      title: "Software Testing and Automation Specialization (University of Minnesota)",
      url: "https://example.test/automation",
      type: "course",
    },
  ],
  recommendedCourses: [],
};

describe("session content selection", () => {
  it("uses the active section title when ids do not match resource ids", () => {
    expect(getActiveSessionResource(baseSession, "section-automation")).toMatchObject({
      id: "resource-automation",
      title: "Software Testing and Automation Specialization (University of Minnesota)",
    });
  });
});
