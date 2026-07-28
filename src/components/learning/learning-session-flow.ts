export type LearningMode = "learn" | "practice" | "check";

export function isLearningSessionCompleted({
  status,
  hasServerRoadmap,
  hasLocalCompletionMarker,
}: {
  status: "completed" | "in-progress" | "locked";
  hasServerRoadmap: boolean;
  hasLocalCompletionMarker: boolean;
}): boolean {
  return status === "completed" || (!hasServerRoadmap && hasLocalCompletionMarker);
}

export type LearningContinueAction =
  | { type: "section"; sectionId: string }
  | { type: "mode"; mode: "practice" | "check" }
  | { type: "incomplete"; sectionId?: string }
  | { type: "complete" };

interface LearningContinueContext {
  mode: LearningMode;
  nextSectionId?: string;
  hasPracticeRequirements: boolean;
  hasIncompletePractice: boolean;
  firstIncompleteSectionId?: string;
  hasQuiz: boolean;
}

export function getLearningContinueAction({
  mode,
  nextSectionId,
  hasPracticeRequirements,
  hasIncompletePractice,
  firstIncompleteSectionId,
  hasQuiz,
}: LearningContinueContext): LearningContinueAction {
  if (mode === "learn" && nextSectionId) {
    return { type: "section", sectionId: nextSectionId };
  }

  if (mode === "learn" && hasPracticeRequirements) {
    return { type: "mode", mode: "practice" };
  }

  if (mode === "practice" && hasIncompletePractice) {
    return { type: "incomplete", sectionId: firstIncompleteSectionId };
  }

  if (mode !== "check" && hasQuiz) {
    return { type: "mode", mode: "check" };
  }

  return { type: "complete" };
}
