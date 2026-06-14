import type { InterviewDetailResponseDto, InterviewFeedback } from "@/api/interview-api";
import type { InterviewMode } from "./types";

export interface InterviewResultQuestionViewModel {
  question: string;
  answer: string;
  score: number | null;
  strengths: string[];
  improvements: string[];
  durationSeconds: number | null;
}

export interface InterviewResultViewModel {
  sessionId: string;
  targetRole: string;
  overallScore: number | null;
  semanticScore: number | null;
  llmScore: number | null;
  communicationScore: number | null;
  summary: string;
  recommendations: string[];
  modules: string[];
  technicalDelivery: Record<string, number>;
  communicationFlow: Record<string, number>;
  bodyLanguage: Record<string, number> | null;
  durationSeconds: number | null;
  questions: InterviewResultQuestionViewModel[];
}

export function secondsRemainingFromExpiry(expiresAt: string | null, now = new Date()): number {
  if (!expiresAt) return 0;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return 0;
  return Math.max(0, Math.ceil((expiresMs - now.getTime()) / 1000));
}

export function formatDuration(seconds: number | null | undefined): string {
  const safe = Math.max(0, seconds ?? 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface InterviewModeLabelOptions {
  interviewMode: InterviewMode;
  isLiveConnected: boolean;
  isVoiceFallback: boolean;
  questionAudioError: string | null;
}

export function getInterviewModeLabel({
  interviewMode,
  isLiveConnected,
  isVoiceFallback,
  questionAudioError,
}: InterviewModeLabelOptions): string {
  if (isVoiceFallback || (interviewMode === "guided" && questionAudioError)) {
    return "Text fallback";
  }

  if (interviewMode === "realtime") {
    return isLiveConnected ? "Live Realtime" : "Text fallback";
  }

  return "Guided Voice";
}

interface RealtimeTokenFallbackOptions {
  interviewMode: InterviewMode;
  realtimeEnabled: boolean;
  clientSecret: string | null;
  reason?: string;
}

export function getRealtimeTokenFallbackReason({
  interviewMode,
  realtimeEnabled,
  clientSecret,
  reason,
}: RealtimeTokenFallbackOptions): string | null {
  if (realtimeEnabled && clientSecret) return null;
  if (interviewMode === "guided") return null;
  return reason || "Realtime token is unavailable. Continue in text mode.";
}

export function coerceStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  }
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  return [];
}

function score(value: number | null | undefined): number | null {
  return value == null || Number.isNaN(value) ? null : Math.round(value);
}

function feedbackRecord(
  feedback: InterviewFeedback | null,
  key: "technical_delivery" | "communication_flow" | "body_language",
): Record<string, number> | null {
  const value = feedback?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
      .map(([k, v]) => [k, Math.round(v as number)]),
  );
}

export function toInterviewResultViewModel(
  detail: InterviewDetailResponseDto,
): InterviewResultViewModel {
  const feedback = detail.aiFeedback;
  return {
    sessionId: detail.id,
    targetRole: detail.targetRole,
    overallScore: score(detail.overallScore),
    semanticScore: score(detail.semanticScore),
    llmScore: score(detail.llmScore),
    communicationScore: score(detail.communicationScore),
    summary: typeof feedback?.summary === "string" ? feedback.summary : "No summary is available yet.",
    recommendations: coerceStringList(feedback?.recommendations),
    modules: coerceStringList(feedback?.suggested_modules),
    technicalDelivery: feedbackRecord(feedback, "technical_delivery") ?? {},
    communicationFlow: feedbackRecord(feedback, "communication_flow") ?? {},
    bodyLanguage: feedbackRecord(feedback, "body_language"),
    durationSeconds: detail.durationSeconds,
    questions: detail.turns
      .filter((turn) => turn.userAnswerText || turn.userAnswerTranscript)
      .map((turn) => ({
        question: turn.interviewerQuestion,
        answer: turn.userAnswerText ?? turn.userAnswerTranscript ?? "",
        score: score(turn.perQuestionScore),
        strengths: coerceStringList(turn.strengths),
        improvements: coerceStringList(turn.improvements),
        durationSeconds: turn.durationSeconds,
      })),
  };
}
