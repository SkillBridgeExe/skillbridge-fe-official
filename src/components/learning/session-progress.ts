import type { LearningSession, WeekPlan } from "./types";

export interface SessionProgressState {
  checkedChecklistItems: Record<string, string[]>;
  exerciseProofs: Record<string, string>;
  savedCourseIds?: string[];
}

const SESSION_PROGRESS_STORAGE_PREFIX = "skillbridge:learning-session-progress:";

export function readStoredSessionProgress(sessionId: string): Partial<SessionProgressState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${SESSION_PROGRESS_STORAGE_PREFIX}${sessionId}`);
    return raw ? (JSON.parse(raw) as Partial<SessionProgressState>) : null;
  } catch {
    return null;
  }
}

export function writeStoredSessionProgress(sessionId: string, progress: SessionProgressState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `${SESSION_PROGRESS_STORAGE_PREFIX}${sessionId}`,
    JSON.stringify(progress),
  );
}

export function createInitialSessionProgress(
  session: LearningSession,
  saved?: Partial<SessionProgressState> | null,
): SessionProgressState {
  const checkedChecklistItems: Record<string, string[]> = {};
  for (const section of session.sections) {
    checkedChecklistItems[section.id] = saved?.checkedChecklistItems?.[section.id] ?? [];
  }

  if (saved?.checkedChecklistItems?.["__session"]) {
    checkedChecklistItems["__session"] = saved.checkedChecklistItems["__session"];
  }

  const savedCourseIds = saved?.savedCourseIds ?? saved?.checkedChecklistItems?.["__saved_courses"] ?? [];
  if (savedCourseIds.length > 0 || saved?.checkedChecklistItems?.["__saved_courses"]) {
    checkedChecklistItems["__saved_courses"] = savedCourseIds;
  }

  return {
    checkedChecklistItems,
    exerciseProofs: saved?.exerciseProofs ?? {},
    savedCourseIds,
  };
}

export function toggleChecklistItem(
  progress: SessionProgressState,
  sectionId: string,
  item: string,
): SessionProgressState {
  const current = progress.checkedChecklistItems[sectionId] ?? [];
  const nextItems = current.includes(item)
    ? current.filter((value) => value !== item)
    : [...current, item];

  return {
    ...progress,
    checkedChecklistItems: {
      ...progress.checkedChecklistItems,
      [sectionId]: nextItems,
    },
  };
}

export function setExerciseProof(
  progress: SessionProgressState,
  exerciseId: string,
  proof: string,
): SessionProgressState {
  return {
    ...progress,
    exerciseProofs: {
      ...progress.exerciseProofs,
      [exerciseId]: proof,
    },
  };
}

export function isSectionComplete(
  session: LearningSession,
  progress: SessionProgressState,
  sectionId: string,
): boolean {
  const section = session.sections.find((item) => item.id === sectionId);
  if (!section) return false;
  if (!section.checklist?.length) {
    return (
      section.completed ||
      (progress.checkedChecklistItems[sectionId]?.includes("__completed") ?? false)
    );
  }

  const checked = new Set(progress.checkedChecklistItems[sectionId] ?? []);
  return section.checklist.every((item) => checked.has(item));
}

export function applyProgressToSession(
  session: LearningSession,
  progress: SessionProgressState,
): LearningSession {
  const sections = session.sections.map((section) => {
    const completed = isSectionComplete(session, progress, section.id);
    return {
      ...section,
      completed,
      completedExercises: completed ? section.exercises : 0,
    };
  });

  const completedCount = sections.filter((s) => s.completed).length;
  let stars = sections.length > 0
    ? Math.round((completedCount / sections.length) * session.maxStars)
    : 0;

  if (isSessionCompleted(session, progress)) {
    stars = session.maxStars;
  }

  return {
    ...session,
    sections,
    stars,
  };
}

export function isSessionReadyToComplete(
  session: LearningSession,
  progress: SessionProgressState,
): boolean {
  const allSectionsComplete = session.sections.every((section) =>
    isSectionComplete(session, progress, section.id),
  );
  const exercises = session.lessonContent?.exercises ?? [];
  const allProofsProvided = exercises.every((exercise) =>
    Boolean(progress.exerciseProofs[exercise.id]?.trim()),
  );

  return allSectionsComplete && allProofsProvided;
}

export function isSessionCompleted(
  session: LearningSession,
  progress: SessionProgressState,
): boolean {
  if (progress.checkedChecklistItems["__session"]?.includes("completed")) {
    return true;
  }
  return isSessionReadyToComplete(session, progress);
}

export function deriveSessionStatuses(weeks: WeekPlan[]): WeekPlan[] {
  const allSessions = weeks.flatMap((w) => w.sessions);
  const completedMap: Record<string, boolean> = {};
  const progressMap: Record<string, SessionProgressState> = {};

  for (const session of allSessions) {
    const localProgress = createInitialSessionProgress(
      session,
      readStoredSessionProgress(session.id),
    );
    completedMap[session.id] = isSessionCompleted(session, localProgress);
    progressMap[session.id] = localProgress;
  }

  let foundInProgress = false;

  return weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => {
      const isDone = completedMap[session.id];
      let status: "completed" | "in-progress" | "locked";
      if (isDone) {
        status = "completed";
      } else if (!foundInProgress) {
        status = "in-progress";
        foundInProgress = true;
      } else {
        status = "locked";
      }

      const localProgress = progressMap[session.id];
      const withProgress = applyProgressToSession(session, localProgress);
      return { ...withProgress, status };
    }),
  }));
}

export function toggleSavedCourse(
  progress: SessionProgressState,
  courseId: string,
): SessionProgressState {
  const current = progress.savedCourseIds ?? [];
  const next = current.includes(courseId)
    ? current.filter((id) => id !== courseId)
    : [...current, courseId];

  return {
    ...progress,
    checkedChecklistItems: {
      ...progress.checkedChecklistItems,
      "__saved_courses": next,
    },
    savedCourseIds: next,
  };
}

