import { describe, expect, it } from "vitest";
import {
  applyProgressToSession,
  createInitialSessionProgress,
  getChecklistTaskProofId,
  isSessionReadyToComplete,
  mergeChecklistPatch,
  setExerciseProof,
  toggleChecklistItem,
  toggleSavedCourse,
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
      checklist: [
        { id: "write-one-answer", label: "Write one answer." },
        { id: "under-two-minutes", label: "Keep the answer under two minutes." },
      ],
    },
    {
      id: "speak",
      title: "Speak clearly",
      completed: false,
      exercises: 1,
      completedExercises: 0,
      type: "reading",
      checklist: [{ id: "practice-aloud", label: "Practice aloud." }],
    },
  ],
  lessonContent: {
    title: "English interview communication",
    summary: "Practice clear interview answers.",
    licenseType: "skillbridge_original",
    reusePolicy: "full_reuse_allowed",
    sourceResourceIds: [],
    learningObjectives: [],
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
    const firstTick = toggleChecklistItem(initial, "star", "write-one-answer");
    let completed = toggleChecklistItem(firstTick, "star", "under-two-minutes");
    completed = setExerciseProof(completed, getChecklistTaskProofId("star", "write-one-answer"), "Wrote a STAR answer.");
    completed = setExerciseProof(completed, getChecklistTaskProofId("star", "under-two-minutes"), "Timed it under two minutes.");

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
    progress = toggleChecklistItem(progress, "star", "write-one-answer");
    progress = toggleChecklistItem(progress, "star", "under-two-minutes");
    progress = toggleChecklistItem(progress, "speak", "practice-aloud");
    progress = setExerciseProof(progress, getChecklistTaskProofId("star", "write-one-answer"), "Wrote a STAR answer.");
    progress = setExerciseProof(progress, getChecklistTaskProofId("star", "under-two-minutes"), "Timed it under two minutes.");
    progress = setExerciseProof(progress, getChecklistTaskProofId("speak", "practice-aloud"), "Practiced aloud and recorded a short take.");

    expect(isSessionReadyToComplete(session, progress)).toBe(false);

    progress = setExerciseProof(progress, "record-answer", "Transcript saved in portfolio notes.");

    expect(isSessionReadyToComplete(session, progress)).toBe(true);
  });

  it("requires checklist task proof before a checked section is complete", () => {
    let progress = createInitialSessionProgress(session);
    progress = toggleChecklistItem(progress, "star", "write-one-answer");
    progress = toggleChecklistItem(progress, "star", "under-two-minutes");

    let nextSession = applyProgressToSession(session, progress);
    expect(nextSession.sections[0].completed).toBe(false);

    progress = setExerciseProof(progress, "task:star:write-one-answer", "Wrote a STAR answer for a project conflict.");
    progress = setExerciseProof(progress, "task:star:under-two-minutes", "Timed the answer at 1 minute 45 seconds.");

    nextSession = applyProgressToSession(session, progress);
    expect(nextSession.sections[0].completed).toBe(true);
  });

  it("preserves locally typed proof when a checklist patch response arrives", () => {
    const local = setExerciseProof(
      createInitialSessionProgress(session),
      "task:star:write-one-answer",
      "A proof typed while the checklist request was in flight.",
    );
    const remote = {
      ...createInitialSessionProgress(session),
      checkedChecklistItems: { star: ["write-one-answer"] },
    };

    const merged = mergeChecklistPatch(local, remote, "star");

    expect(merged.checkedChecklistItems.star).toEqual(["write-one-answer"]);
    expect(merged.exerciseProofs["task:star:write-one-answer"]).toBe(
      "A proof typed while the checklist request was in flight.",
    );
  });

  it("marks a checklist-free section complete when '__completed' is checked", () => {
    const checklistFreeSession: LearningSession = {
      ...session,
      sections: [
        {
          id: "checklist-free-sec",
          title: "Checklist Free Section",
          completed: false,
          exercises: 0,
          completedExercises: 0,
          type: "practice",
          checklist: [],
        },
      ],
      lessonContent: undefined,
    };

    let progress = createInitialSessionProgress(checklistFreeSession);
    progress = toggleChecklistItem(progress, "checklist-free-sec", "__completed");
    const nextSession = applyProgressToSession(checklistFreeSession, progress);
    expect(nextSession.sections[0].completed).toBe(true);
  });

  describe("toggleSavedCourse", () => {
    it("initializes empty saved courses by default", () => {
      const progress = createInitialSessionProgress(session);
      expect(progress.savedCourseIds).toEqual([]);
    });

    it("restores saved courses if passed", () => {
      const progress = createInitialSessionProgress(session, {
        savedCourseIds: ["course-1"],
      });
      expect(progress.savedCourseIds).toEqual(["course-1"]);
      expect(progress.checkedChecklistItems["__saved_courses"]).toEqual(["course-1"]);
    });

    it("restores saved courses from checkedChecklistItems if savedCourseIds is missing", () => {
      const progress = createInitialSessionProgress(session, {
        checkedChecklistItems: {
          "__saved_courses": ["course-99"],
        },
      });
      expect(progress.savedCourseIds).toEqual(["course-99"]);
      expect(progress.checkedChecklistItems["__saved_courses"]).toEqual(["course-99"]);
    });

    it("adds a course ID when it is not already saved and updates checkedChecklistItems", () => {
      const initial = createInitialSessionProgress(session);
      const next = toggleSavedCourse(initial, "course-1");
      expect(next.savedCourseIds).toEqual(["course-1"]);
      expect(next.checkedChecklistItems["__saved_courses"]).toEqual(["course-1"]);
    });

    it("removes a course ID when it is already saved and updates checkedChecklistItems", () => {
      const initial = createInitialSessionProgress(session, {
        savedCourseIds: ["course-1", "course-2"],
      });
      const next = toggleSavedCourse(initial, "course-1");
      expect(next.savedCourseIds).toEqual(["course-2"]);
      expect(next.checkedChecklistItems["__saved_courses"]).toEqual(["course-2"]);
    });
  });
});
