import { describe, expect, it } from "vitest";
import {
  answerQuestion,
  applyServerQuizAnswer,
  getQuizStats,
  type QuizQuestionForProgress,
} from "./quiz-progress";

const question: QuizQuestionForProgress = {
  id: "state-purpose",
  correctOptionIndex: 0,
};

describe("quiz-progress", () => {
  it("scores retries as new practice attempts", () => {
    const first = answerQuestion({}, question, 2, "2026-07-03T00:00:00.000Z");
    expect(first.quizAttempts?.["state-purpose"]).toMatchObject({
      selectedOptionIndex: 2,
      isCorrect: false,
      attemptCount: 1,
      scored: true,
    });

    const retry = answerQuestion(first, question, 0, "2026-07-03T00:01:00.000Z");
    expect(retry.quizAttempts?.["state-purpose"]).toMatchObject({
      selectedOptionIndex: 0,
      isCorrect: true,
      attemptCount: 2,
      scored: true,
    });
  });

  it("computes quiz stats from first-attempt outcomes", () => {
    const progress = {
      quizAttempts: {
        "state-purpose": {
          selectedOptionIndex: 1,
          isCorrect: false,
          attemptCount: 1,
          answeredAt: "2026-07-03T00:00:00.000Z",
          scored: true,
        },
      },
    };

    expect(getQuizStats(progress, [question])).toEqual({
      answered: 1,
      correct: 0,
      accuracy: 0,
    });
  });

  it("maps a server answer response into local progress state", () => {
    const progress = applyServerQuizAnswer(
      {},
      {
        question_id: "state-purpose",
        selected_option_index: 0,
        is_correct: true,
        scored: true,
        attempt_count: 1,
        correct_option_index: 0,
        explanation: "State changes after interaction.",
        objective_mastery: {
          objective_id: "state-events",
          correct: 1,
          total_answered: 1,
          accuracy: 1,
          mastered: false,
        },
        lesson_status: "in_progress",
        next_recommended_questions: [],
        remediation: { section_id: "state-events" },
      },
      "2026-07-03T00:00:00.000Z",
    );

    expect(progress.quizAttempts?.["state-purpose"]).toMatchObject({
      selectedOptionIndex: 0,
      isCorrect: true,
      attemptCount: 1,
      scored: true,
      explanation: "State changes after interaction.",
      correctOptionIndex: 0,
      objectiveMastery: {
        objectiveId: "state-events",
        mastered: false,
      },
      remediationSectionId: "state-events",
    });
  });
});
