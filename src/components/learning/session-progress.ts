import type { LearningSession } from "./types";

export interface SessionProgressState {
  checkedChecklistItems: Record<string, string[]>;
  exerciseProofs: Record<string, string>;
}

export function createInitialSessionProgress(
  session: LearningSession,
  saved?: Partial<SessionProgressState> | null,
): SessionProgressState {
  const checkedChecklistItems: Record<string, string[]> = {};
  for (const section of session.sections) {
    checkedChecklistItems[section.id] = saved?.checkedChecklistItems?.[section.id] ?? [];
  }

  return {
    checkedChecklistItems,
    exerciseProofs: saved?.exerciseProofs ?? {},
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
  if (!section.checklist?.length) return section.completed;

  const checked = new Set(progress.checkedChecklistItems[sectionId] ?? []);
  return section.checklist.every((item) => checked.has(item));
}

export function applyProgressToSession(
  session: LearningSession,
  progress: SessionProgressState,
): LearningSession {
  return {
    ...session,
    sections: session.sections.map((section) => {
      const completed = isSectionComplete(session, progress, section.id);
      return {
        ...section,
        completed,
        completedExercises: completed ? section.exercises : 0,
      };
    }),
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
