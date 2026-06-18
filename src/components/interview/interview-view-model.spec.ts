import { describe, expect, it } from "vitest";
import type { InterviewDetailResponseDto } from "@/api/interview-api";
import {
  canOpenInterviewHistory,
  canSwitchInterviewWorkspace,
  buildInterviewStartRequest,
  getInterviewHistoryDetailState,
  getInterviewHistoryState,
  getInterviewModeLabel,
  getInterviewModeLabelKey,
  getQuestionAudioErrorMessage,
  getRealtimeTokenFallbackReason,
  getInterviewSessionStatusKey,
  getInterviewSessionStatusLabel,
  readInterviewVoicePreference,
  secondsRemainingFromExpiry,
  toInterviewResultViewModel,
  writeInterviewVoicePreference,
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
  voice: "marin",
  speechSpeed: 1.15,
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
  it.each([
    ["setup", true],
    ["results", true],
    ["history-detail", true],
    ["interviewing", false],
  ] as const)("allows opening interview history only outside active interviews", (phase, expected) => {
    expect(canOpenInterviewHistory(phase)).toBe(expected);
  });

  it.each([
    ["setup", true],
    ["results", true],
    ["history-detail", true],
    ["interviewing", false],
  ] as const)("allows switching Practice/History only outside active interviews", (phase, expected) => {
    expect(canSwitchInterviewWorkspace(phase)).toBe(expected);
  });

  it.each([
    [{ canUseApi: false, isLoading: false, isError: false, itemCount: 0 }, "signed-out"],
    [{ canUseApi: true, isLoading: true, isError: false, itemCount: 0 }, "loading"],
    [{ canUseApi: true, isLoading: false, isError: true, itemCount: 0 }, "error"],
    [{ canUseApi: true, isLoading: false, isError: false, itemCount: 0 }, "empty"],
    [{ canUseApi: true, isLoading: false, isError: false, itemCount: 2 }, "ready"],
  ] as const)("derives the interview history panel state", (input, expected) => {
    expect(getInterviewHistoryState(input)).toBe(expected);
  });

  it.each([
    ["COMPLETED", "completed"],
    ["IN_PROGRESS", "inProgress"],
    ["CANCELLED", "cancelled"],
    ["UNKNOWN", "unknown"],
  ] as const)("normalizes interview session status keys", (status, expected) => {
    expect(getInterviewSessionStatusKey(status)).toBe(expected);
  });

  it.each([
    ["COMPLETED", "Completed"],
    ["IN_PROGRESS", "In progress"],
    ["CANCELLED", "Cancelled"],
    ["UNKNOWN", "Unknown"],
  ] as const)("formats interview session status labels", (status, expected) => {
    expect(getInterviewSessionStatusLabel(status)).toBe(expected);
  });

  it.each([
    [{ selectedSessionId: null, isLoading: false, isError: false, result: null }, "idle"],
    [{ selectedSessionId: "session-1", isLoading: true, isError: false, result: null }, "loading"],
    [{ selectedSessionId: "session-1", isLoading: false, isError: true, result: null }, "error"],
    [
      {
        selectedSessionId: "session-1",
        isLoading: false,
        isError: false,
        result: { status: "IN_PROGRESS", overallScore: null },
      },
      "not-scored",
    ],
    [
      {
        selectedSessionId: "session-1",
        isLoading: false,
        isError: false,
        result: { status: "COMPLETED", overallScore: null },
      },
      "not-scored",
    ],
    [
      {
        selectedSessionId: "session-1",
        isLoading: false,
        isError: false,
        result: { status: "COMPLETED", overallScore: 82 },
      },
      "ready",
    ],
  ] as const)("derives the selected interview history detail state", (input, expected) => {
    expect(getInterviewHistoryDetailState(input)).toBe(expected);
  });

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
      getInterviewModeLabelKey({
        interviewMode: "guided",
        isLiveConnected: false,
        isVoiceFallback: false,
        questionAudioError: null,
      }),
    ).toBe("guidedVoice");
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
      getInterviewModeLabelKey({
        interviewMode: "guided",
        isLiveConnected: false,
        isVoiceFallback: false,
        questionAudioError: "Could not play audio.",
      }),
    ).toBe("textFallback");
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

  it("builds the start interview request with voice and speed settings", () => {
    expect(
      buildInterviewStartRequest({
        selectedCvId: null,
        selectedMatchId: "match-1",
        targetRole: "frontend_developer",
        selectedLanguage: "vi",
        interviewMode: "realtime",
        interviewType: "mixed",
        voice: "coral",
        speechSpeed: 1.3,
      }),
    ).toMatchObject({
      cvId: undefined,
      cvMatchId: "match-1",
      targetRole: "frontend_developer",
      language: "vi",
      mode: "VOICE",
      interviewType: "MIXED",
      voice: "coral",
      speechSpeed: 1.3,
    });
  });

  it("reads and writes interview voice preferences safely", () => {
    const storage = new MemoryStorage();

    expect(readInterviewVoicePreference(storage)).toEqual({
      voice: "marin",
      speechSpeed: 1.15,
    });

    writeInterviewVoicePreference(storage, { voice: "sage", speechSpeed: 1.3 });

    expect(readInterviewVoicePreference(storage)).toEqual({
      voice: "sage",
      speechSpeed: 1.3,
    });
  });
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
