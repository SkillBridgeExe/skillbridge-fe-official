import type { LearningSession, WeekPlan } from "./types";

export interface SessionProgressState {
  checkedChecklistItems: Record<string, string[]>;
  exerciseProofs: Record<string, string>;
  savedCourseIds?: string[];
  quizAttempts?: Record<string, QuizAttemptProgress>;
}

export interface QuizAttemptProgress {
  selectedOptionIndex: number;
  isCorrect: boolean;
  attemptCount: number;
  answeredAt: string;
  lastAnsweredAt?: string;
  scored?: boolean;
  explanation?: string;
  correctOptionIndex?: number;
  objectiveMastery?: {
    objectiveId: string;
    correct: number;
    totalAnswered: number;
    accuracy: number;
    mastered: boolean;
  };
  remediationSectionId?: string;
  remediationVideoResourceId?: string;
  remediationVideoChapterId?: string;
  remediationStartSeconds?: number;
}

const SESSION_PROGRESS_STORAGE_PREFIX = "skillbridge:learning-session-progress:";
const MIN_CHECKLIST_TASK_PROOF_LENGTH = 12;

export function getChecklistTaskProofId(sectionId: string, itemId: string): string {
  return `task:${sectionId}:${itemId}`;
}

export function hasChecklistTaskProof(
  progress: SessionProgressState,
  sectionId: string,
  itemId: string,
): boolean {
  const proof = progress.exerciseProofs[getChecklistTaskProofId(sectionId, itemId)]?.trim() ?? "";
  return proof.length >= MIN_CHECKLIST_TASK_PROOF_LENGTH;
}

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

export function clearStoredLearningProgress() {
  if (typeof window === "undefined") return;
  const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
    window.localStorage.key(index),
  ).filter((key): key is string => Boolean(key?.startsWith(SESSION_PROGRESS_STORAGE_PREFIX)));

  keys.forEach((key) => window.localStorage.removeItem(key));
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
    quizAttempts: saved?.quizAttempts ?? {},
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
  return section.checklist.every((item) =>
    checked.has(item.id) && hasChecklistTaskProof(progress, sectionId, item.id),
  );
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

export function deriveSessionStatuses(
  weeks: WeekPlan[],
  roadmapStartedAt?: string | null,
): WeekPlan[] {
  const sessionEntries = weeks.flatMap((week) =>
    week.sessions.map((session, sessionOrder) => ({
      session,
      weekNumber: week.weekNumber,
      sessionOrder,
    })),
  );
  const allSessions = sessionEntries.map((entry) => entry.session);
  const entryBySessionId = new Map(sessionEntries.map((entry) => [entry.session.id, entry]));
  const completedMap: Record<string, boolean> = {};
  const progressMap: Record<string, SessionProgressState> = {};
  const todayStudyDayOrder = dayOrder(new Date().getDay());
  const dueByStartedAt = createStartedAtDueChecker(sessionEntries, roadmapStartedAt);
  for (const session of allSessions) {
    const localProgress = createInitialSessionProgress(
      session,
      readStoredSessionProgress(session.id),
    );
    completedMap[session.id] = isSessionCompleted(session, localProgress);
    progressMap[session.id] = localProgress;
  }

  const openWeekNumber = sessionEntries
    .slice()
    .sort(compareSessionEntries)
    .find((entry) => !completedMap[entry.session.id])?.weekNumber;

  return weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => {
      const isDone = completedMap[session.id];
      const entry = entryBySessionId.get(session.id);
      const isDueInOpenWeek =
        entry &&
        entry.weekNumber === openWeekNumber &&
        (dueByStartedAt
          ? dueByStartedAt(entry)
          : dayOrder(entry.session.dayOfWeek) <= todayStudyDayOrder);
      let status: "completed" | "in-progress" | "locked";
      if (isDone) {
        status = "completed";
      } else if (isDueInOpenWeek) {
        status = "in-progress";
      } else {
        status = "locked";
      }

      const localProgress = progressMap[session.id];
      const withProgress = applyProgressToSession(session, localProgress);
      return { ...withProgress, status };
    }),
  }));
}

function createStartedAtDueChecker(
  entries: Array<{ session: LearningSession; weekNumber: number; sessionOrder: number }>,
  roadmapStartedAt?: string | null,
) {
  const start = parseLocalDate(roadmapStartedAt);
  if (!start) return null;

  const today = startOfLocalDay(new Date());
  const elapsedDays = Math.max(
    0,
    Math.floor((today.getTime() - start.getTime()) / 86_400_000),
  );
  const activeDayOrders = [...new Set(entries.map((entry) => dayOrder(entry.session.dayOfWeek)))]
    .sort((a, b) => a - b);
  const firstActiveDayOrder = activeDayOrders[0] ?? 1;

  return (entry: { session: LearningSession; weekNumber: number }) => {
    const scheduledOffset =
      (entry.weekNumber - 1) * 7 +
      Math.max(0, dayOrder(entry.session.dayOfWeek) - firstActiveDayOrder);
    return scheduledOffset <= elapsedDays;
  };
}

function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function compareSessionEntries(
  a: { session: LearningSession; weekNumber: number; sessionOrder: number },
  b: { session: LearningSession; weekNumber: number; sessionOrder: number },
): number {
  return (
    a.weekNumber - b.weekNumber ||
    dayOrder(a.session.dayOfWeek) - dayOrder(b.session.dayOfWeek) ||
    a.session.sessionNumber - b.session.sessionNumber ||
    a.sessionOrder - b.sessionOrder
  );
}

function dayOrder(dayOfWeek: number): number {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
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
