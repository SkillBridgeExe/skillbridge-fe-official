import { describe, expect, it } from "vitest";
import {
  applyProgressToSession,
  createInitialSessionProgress,
  isSessionReadyToComplete,
  setExerciseProof,
  toggleChecklistItem,
} from "./session-progress";
import type { LearningSession } from "./types";

const session: LearningSession = {
  id: "english-session",
  moduleId: "english",
  sessionNumber: 1,
  title: "English interview communication",
  skill: "English",
  dayOfWeek: 1,
  estimatedMinutes: 120,
  status: "in-progress",
  stars: 0,
  maxStars: 5,
  sections: [
    {
      id: "star",
      title: "Structure a STAR answer",
      completed: false,
      exercises: 1,
      completedExercises: 0,
      type: "reading",
      checklist: ["Write one answer.", "Keep the answer under two minutes."],
    },
    {
      id: "speak",
      title: "Speak clearly",
      completed: false,
      exercises: 1,
      completedExercises: 0,
      type: "reading",
      checklist: ["Practice aloud."],
    },
  ],
  lessonContent: {
    title: "English interview communication",
    summary: "Practice clear interview answers.",
    licenseType: "skillbridge_original",
    reusePolicy: "full_reuse_allowed",
    sourceResourceIds: [],
    sections: [],
    quiz: [],
    exercises: [
      {
        id: "record-answer",
        title: "Record a STAR answer",
        prompt: "Record an answer.",
        acceptanceCriteria: ["Use STAR."],
        proofOfCompletion: "Save a transcript.",
      },
    ],
  },
  resources: [],
  recommendedCourses: [],
};

describe("session-progress", () => {
  it("marks a section complete when all checklist items are ticked", () => {
    const initial = createInitialSessionProgress(session);
    const firstTick = toggleChecklistItem(initial, "star", "Write one answer.");
    const completed = toggleChecklistItem(firstTick, "star", "Keep the answer under two minutes.");

    const nextSession = applyProgressToSession(session, completed);

    expect(nextSession.sections[0]).toMatchObject({
      completed: true,
      completedExercises: 1,
    });
    expect(nextSession.sections[1]).toMatchObject({
      completed: false,
      completedExercises: 0,
    });
  });

  it("requires all sections and exercise proof before the session is ready to complete", () => {
    let progress = createInitialSessionProgress(session);
    progress = toggleChecklistItem(progress, "star", "Write one answer.");
    progress = toggleChecklistItem(progress, "star", "Keep the answer under two minutes.");
    progress = toggleChecklistItem(progress, "speak", "Practice aloud.");

    expect(isSessionReadyToComplete(session, progress)).toBe(false);

    progress = setExerciseProof(progress, "record-answer", "Transcript saved in portfolio notes.");

    expect(isSessionReadyToComplete(session, progress)).toBe(true);
  });
});
