import { describe, expect, it } from "vitest";
import type { InterviewDetailResponseDto } from "@/api/interview-api";
import {
  getInterviewModeLabel,
  getQuestionAudioErrorMessage,
  getRealtimeTokenFallbackReason,
  secondsRemainingFromExpiry,
  toInterviewResultViewModel,
} from "./interview-view-model";

const detail: InterviewDetailResponseDto = {
  id: "session-1",
  cvId: null,
  cvMatchId: null,
  jobDescriptionId: null,
  targetRole: "frontend_developer",
  language: "vi",
  mode: "TEXT",
  interviewType: "TECHNICAL",
  status: "COMPLETED",
  totalQuestionsPlanned: 7,
  maxDurationSeconds: 600,
  expiresAt: "2026-06-12T10:10:00.000Z",
  overallScore: 76.5,
  semanticScore: 80,
  llmScore: 75,
  communicationScore: 78,
  aiFeedback: {
    summary: "Strong technical foundation.",
    technical_delivery: {
      concept_accuracy: 82,
      problem_solving: 75,
      system_thinking: 70,
      code_quality: 78,
    },
    communication_flow: {
      articulation: 80,
      listening_response: 76,
      filler_words: 65,
      structured_answers: 82,
    },
    body_language: null,
    recommendations: "Practice system design.",
    suggested_modules: ["React Query"],
  },
  durationSeconds: 540,
  startedAt: "2026-06-12T10:00:00.000Z",
  endedAt: "2026-06-12T10:09:00.000Z",
  createdAt: "2026-06-12T10:00:00.000Z",
  updatedAt: null,
  turns: [
    {
      id: "turn-1",
      sessionId: "session-1",
      turnOrder: 1,
      phase: "INTRODUCTION",
      modality: "TEXT",
      aiRequestId: null,
      interviewerMessage: "Hello",
      interviewerQuestion: "Tell me about your React project.",
      userAnswerText: "I built a dashboard.",
      userAnswerTranscript: null,
      perQuestionScore: 75,
      strengths: ["Clear example"],
      improvements: ["Add metrics"],
      askedAt: "2026-06-12T10:00:00.000Z",
      answeredAt: "2026-06-12T10:01:00.000Z",
      durationSeconds: 60,
    },
  ],
};

describe("interview view model", () => {
  it("calculates countdown from backend expiresAt", () => {
    const now = new Date("2026-06-12T10:09:10.000Z");

    expect(secondsRemainingFromExpiry("2026-06-12T10:10:00.000Z", now)).toBe(50);
    expect(secondsRemainingFromExpiry("2026-06-12T10:09:00.000Z", now)).toBe(0);
  });

  it("maps backend result without inventing body-language metrics", () => {
    const result = toInterviewResultViewModel(detail);

    expect(result.overallScore).toBe(77);
    expect(result.summary).toBe("Strong technical foundation.");
    expect(result.bodyLanguage).toBeNull();
    expect(result.recommendations).toEqual(["Practice system design."]);
    expect(result.modules).toEqual(["React Query"]);
    expect(result.questions[0]).toMatchObject({
      question: "Tell me about your React project.",
      answer: "I built a dashboard.",
      score: 75,
      strengths: ["Clear example"],
      improvements: ["Add metrics"],
    });
  });

  it("keeps guided mode labeled as voice when realtime transcription is not connected", () => {
    expect(
      getInterviewModeLabel({
        interviewMode: "guided",
        isLiveConnected: false,
        isVoiceFallback: false,
        questionAudioError: null,
      }),
    ).toBe("Guided Voice");
  });

  it("shows text fallback when guided question audio fails", () => {
    expect(
      getInterviewModeLabel({
        interviewMode: "guided",
        isLiveConnected: false,
        isVoiceFallback: false,
        questionAudioError: "Could not play audio.",
      }),
    ).toBe("Text fallback");
  });

  it("does not treat missing realtime token as guided voice fallback", () => {
    expect(
      getRealtimeTokenFallbackReason({
        interviewMode: "guided",
        realtimeEnabled: false,
        clientSecret: null,
        reason: "OPENAI_API_KEY is not set",
      }),
    ).toBeNull();
  });

  it("treats missing realtime token as live realtime fallback", () => {
    expect(
      getRealtimeTokenFallbackReason({
        interviewMode: "realtime",
        realtimeEnabled: false,
        clientSecret: null,
        reason: "OPENAI_API_KEY is not set",
      }),
    ).toBe("OPENAI_API_KEY is not set");
  });

  it("replaces raw audio request timeout errors with a user-facing fallback message", () => {
    expect(
      getQuestionAudioErrorMessage(
        { code: "ECONNABORTED", message: "timeout of 15000ms exceeded" },
        "Could not play the interviewer voice.",
      ),
    ).toBe("The interviewer voice took too long to load. Continue with the visible question.");
  });
});
