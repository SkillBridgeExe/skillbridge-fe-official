import type { SessionProgressState } from "./session-progress";

export interface QuizQuestionForProgress {
  id: string;
  correctOptionIndex: number;
  objectiveId?: string;
  sectionId?: string;
  remediation?: {
    sectionId?: string;
    videoResourceId?: string;
    videoChapterId?: string;
    startSeconds?: number;
  };
}

export interface LearningQuizAnswerResponse {
  question_id: string;
  selected_option_index: number;
  is_correct: boolean;
  scored: boolean;
  attempt_count: number;
  correct_option_index: number;
  explanation: string;
  objective_mastery: {
    objective_id: string;
    correct: number;
    total_answered: number;
    accuracy: number;
    mastered: boolean;
  };
  lesson_status: "not_started" | "in_progress" | "mastered";
  next_recommended_questions: Array<{
    id: string;
    question: string;
    options: string[];
    explanation: string;
    objective_id?: string;
    section_id?: string;
  }>;
  remediation?: {
    section_id?: string;
    video_resource_id?: string;
    video_chapter_id?: string;
    start_seconds?: number;
  };
}

export function answerQuestion(
  progress: Pick<SessionProgressState, "quizAttempts">,
  question: QuizQuestionForProgress,
  selectedOptionIndex: number,
  answeredAt: string = new Date().toISOString(),
): Pick<SessionProgressState, "quizAttempts"> {
  const existing = progress.quizAttempts?.[question.id];
  if (existing) {
    return {
      quizAttempts: {
        ...(progress.quizAttempts ?? {}),
        [question.id]: {
          ...existing,
          selectedOptionIndex,
          isCorrect: selectedOptionIndex === question.correctOptionIndex,
          attemptCount: existing.attemptCount + 1,
          lastAnsweredAt: answeredAt,
          scored: true,
          correctOptionIndex: question.correctOptionIndex,
        },
      },
    };
  }

  return {
    quizAttempts: {
      ...(progress.quizAttempts ?? {}),
      [question.id]: {
        selectedOptionIndex,
        isCorrect: selectedOptionIndex === question.correctOptionIndex,
        attemptCount: 1,
        answeredAt,
        lastAnsweredAt: answeredAt,
        scored: true,
        correctOptionIndex: question.correctOptionIndex,
      },
    },
  };
}

export function applyServerQuizAnswer(
  progress: Pick<SessionProgressState, "quizAttempts">,
  response: LearningQuizAnswerResponse,
  answeredAt: string = new Date().toISOString(),
): Pick<SessionProgressState, "quizAttempts"> {
  return {
    quizAttempts: {
      ...(progress.quizAttempts ?? {}),
      [response.question_id]: {
        selectedOptionIndex: response.selected_option_index,
        isCorrect: response.is_correct,
        attemptCount: response.attempt_count,
        answeredAt: progress.quizAttempts?.[response.question_id]?.answeredAt ?? answeredAt,
        lastAnsweredAt: answeredAt,
        scored: response.scored,
        explanation: response.explanation,
        correctOptionIndex: response.correct_option_index,
        objectiveMastery: {
          objectiveId: response.objective_mastery.objective_id,
          correct: response.objective_mastery.correct,
          totalAnswered: response.objective_mastery.total_answered,
          accuracy: response.objective_mastery.accuracy,
          mastered: response.objective_mastery.mastered,
        },
        remediationSectionId: response.remediation?.section_id,
        remediationVideoResourceId: response.remediation?.video_resource_id,
        remediationVideoChapterId: response.remediation?.video_chapter_id,
        remediationStartSeconds: response.remediation?.start_seconds,
      },
    },
  };
}

export function getQuizStats(
  progress: Pick<SessionProgressState, "quizAttempts">,
  questions: QuizQuestionForProgress[],
) {
  const attempts = progress.quizAttempts ?? {};
  const answered = questions.filter((question) => attempts[question.id]).length;
  const correct = questions.filter((question) => attempts[question.id]?.isCorrect).length;
  return {
    answered,
    correct,
    accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100) / 100,
  };
}
