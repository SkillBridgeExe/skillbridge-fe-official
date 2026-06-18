import type {
  InterviewDetailResponseDto,
  InterviewFeedback,
  PlatformInterviewType,
  StartInterviewRequest,
} from "@/api/interview-api";
import {
  DEFAULT_INTERVIEW_SPEECH_SPEED,
  DEFAULT_INTERVIEW_VOICE,
  INTERVIEW_SPEECH_SPEED_OPTIONS,
  INTERVIEW_VOICE_OPTIONS,
  INTERVIEW_VOICE_STORAGE_KEY,
  type InterviewMode,
  type InterviewPhase,
  type InterviewSpeechSpeed,
  type InterviewType,
  type InterviewVoice,
} from "./types";

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

export type InterviewHistoryState = "signed-out" | "loading" | "error" | "empty" | "ready";
export type InterviewHistoryDetailState = "idle" | "loading" | "error" | "not-scored" | "ready";
export type InterviewSessionStatusKey = "completed" | "inProgress" | "cancelled" | "unknown";
export type InterviewModeLabelKey = "textFallback" | "liveRealtime" | "guidedVoice";
export type InterviewEndIntent = "cancel" | "score";
export type InterviewEndOutcome = "cancelled" | "scored";
export type LiveTranscriptWarning = "cjk" | "promptLeak";

export interface InterviewVoicePreference {
  voice: InterviewVoice;
  speechSpeed: InterviewSpeechSpeed;
}

export function getInterviewEndIntent(answeredCount: number): InterviewEndIntent {
  return answeredCount > 0 ? "score" : "cancel";
}

export function getInterviewEndOutcome(status: string): InterviewEndOutcome {
  return status.toUpperCase() === "CANCELLED" ? "cancelled" : "scored";
}

export function takeRecentInterviewSessions<T>(sessions: readonly T[], limit = 3): T[] {
  return sessions.slice(0, limit);
}

export function buildInterviewInitialMessages(
  firstMessage: string | null | undefined,
  firstQuestion: string | null | undefined,
): string[] {
  const content = uniqueNonEmptyStrings([firstMessage, firstQuestion]).join("\n\n");
  return content ? [content] : [];
}

export function buildInterviewNextMessages(nextQuestion: string | null | undefined): string[] {
  return uniqueNonEmptyStrings([nextQuestion]);
}

interface BuildInterviewStartRequestInput extends InterviewVoicePreference {
  selectedCvId: string | null;
  selectedMatchId: string | null;
  targetRole: string;
  selectedLanguage: "vi" | "en";
  interviewMode: InterviewMode;
  interviewType: InterviewType;
}

export function buildInterviewStartRequest({
  selectedCvId,
  selectedMatchId,
  targetRole,
  selectedLanguage,
  interviewMode,
  interviewType,
  voice,
  speechSpeed,
}: BuildInterviewStartRequestInput): StartInterviewRequest {
  return {
    cvId: selectedCvId ?? undefined,
    cvMatchId: selectedMatchId ?? undefined,
    targetRole,
    language: selectedLanguage,
    mode: interviewMode === "realtime" ? "VOICE" : "HYBRID",
    interviewType: toBackendInterviewType(interviewType),
    voice,
    speechSpeed,
  };
}

export function readInterviewVoicePreference(
  storage: Pick<Storage, "getItem"> | null | undefined,
): InterviewVoicePreference {
  if (!storage) {
    return {
      voice: DEFAULT_INTERVIEW_VOICE,
      speechSpeed: DEFAULT_INTERVIEW_SPEECH_SPEED,
    };
  }

  try {
    const raw = storage.getItem(INTERVIEW_VOICE_STORAGE_KEY);
    if (!raw) {
      return {
        voice: DEFAULT_INTERVIEW_VOICE,
        speechSpeed: DEFAULT_INTERVIEW_SPEECH_SPEED,
      };
    }
    const parsed = JSON.parse(raw) as Partial<InterviewVoicePreference>;
    return {
      voice: normalizeInterviewVoice(parsed.voice),
      speechSpeed: normalizeInterviewSpeechSpeed(parsed.speechSpeed),
    };
  } catch {
    return {
      voice: DEFAULT_INTERVIEW_VOICE,
      speechSpeed: DEFAULT_INTERVIEW_SPEECH_SPEED,
    };
  }
}

export function writeInterviewVoicePreference(
  storage: Pick<Storage, "setItem"> | null | undefined,
  preference: InterviewVoicePreference,
): void {
  if (!storage) return;
  try {
    storage.setItem(INTERVIEW_VOICE_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Ignore storage quota/private-mode errors. The selected value still applies to the current session.
  }
}

export function normalizeInterviewVoice(value: unknown): InterviewVoice {
  return INTERVIEW_VOICE_OPTIONS.some((option) => option.value === value)
    ? (value as InterviewVoice)
    : DEFAULT_INTERVIEW_VOICE;
}

export function normalizeInterviewSpeechSpeed(value: unknown): InterviewSpeechSpeed {
  const numeric = Number(value);
  const match = INTERVIEW_SPEECH_SPEED_OPTIONS.find((option) => option.value === numeric);
  return match?.value ?? DEFAULT_INTERVIEW_SPEECH_SPEED;
}

export function toBackendInterviewType(type: InterviewType): PlatformInterviewType {
  if (type === "hr") return "HR";
  if (type === "mixed") return "MIXED";
  return "TECHNICAL";
}

interface InterviewHistoryStateOptions {
  canUseApi: boolean;
  isLoading: boolean;
  isError: boolean;
  itemCount: number;
}

export function getInterviewHistoryState({
  canUseApi,
  isLoading,
  isError,
  itemCount,
}: InterviewHistoryStateOptions): InterviewHistoryState {
  if (!canUseApi) return "signed-out";
  if (isLoading) return "loading";
  if (isError) return "error";
  return itemCount === 0 ? "empty" : "ready";
}

export function getInterviewSessionStatusKey(status: string): InterviewSessionStatusKey {
  if (status === "COMPLETED") return "completed";
  if (status === "IN_PROGRESS") return "inProgress";
  if (status === "CANCELLED") return "cancelled";
  return "unknown";
}

export function getInterviewSessionStatusLabel(status: string): string {
  const key = getInterviewSessionStatusKey(status);
  if (key === "completed") return "Completed";
  if (key === "inProgress") return "In progress";
  if (key === "cancelled") return "Cancelled";
  return "Unknown";
}

interface InterviewHistoryDetailStateOptions {
  selectedSessionId: string | null;
  isLoading: boolean;
  isError: boolean;
  result: Pick<InterviewDetailResponseDto, "status" | "overallScore"> | null;
}

export function canOpenInterviewHistory(phase: InterviewPhase): boolean {
  return phase !== "interviewing";
}

export function canSwitchInterviewWorkspace(phase: InterviewPhase): boolean {
  return phase !== "interviewing";
}

export function getInterviewHistoryDetailState({
  selectedSessionId,
  isLoading,
  isError,
  result,
}: InterviewHistoryDetailStateOptions): InterviewHistoryDetailState {
  if (!selectedSessionId) return "idle";
  if (isLoading) return "loading";
  if (isError) return "error";
  if (!result || result.status !== "COMPLETED" || result.overallScore == null) return "not-scored";
  return "ready";
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
  const key = getInterviewModeLabelKey({
    interviewMode,
    isLiveConnected,
    isVoiceFallback,
    questionAudioError,
  });

  if (key === "textFallback") return "Text fallback";
  if (key === "liveRealtime") return "Live Realtime";
  return "Guided Voice";
}

export function getInterviewModeLabelKey({
  interviewMode,
  isLiveConnected,
  isVoiceFallback,
  questionAudioError,
}: InterviewModeLabelOptions): InterviewModeLabelKey {
  if (isVoiceFallback || (interviewMode === "guided" && questionAudioError)) {
    return "textFallback";
  }

  if (interviewMode === "realtime") {
    return isLiveConnected ? "liveRealtime" : "textFallback";
  }

  return "guidedVoice";
}

interface RealtimeTokenFallbackOptions {
  interviewMode: InterviewMode;
  realtimeEnabled: boolean;
  clientSecret: string | null;
  reason?: string;
  fallbackMessage?: string;
}

export function getRealtimeTokenFallbackReason({
  interviewMode,
  realtimeEnabled,
  clientSecret,
  reason,
  fallbackMessage,
}: RealtimeTokenFallbackOptions): string | null {
  if (realtimeEnabled && clientSecret) return null;
  if (interviewMode === "guided") return null;
  return reason || fallbackMessage || "Realtime token is unavailable. Continue in text mode.";
}

export function getQuestionAudioErrorMessage(
  error: unknown,
  fallback: string,
  timeoutFallback = "The interviewer voice took too long to load. Continue with the visible question.",
): string {
  if (isTimeoutError(error)) {
    return timeoutFallback;
  }

  return fallback;
}

export function shouldRequestQuestionAudio(interviewMode: InterviewMode): boolean {
  return interviewMode === "guided";
}

interface LiveClosingSignalOptions {
  interviewMode: InterviewMode;
  isVoiceFallback: boolean;
  isLiveConnected: boolean;
  secondsRemaining: number;
  alreadyRequested: boolean;
}

export function shouldRequestLiveClosingSignal({
  interviewMode,
  isVoiceFallback,
  isLiveConnected,
  secondsRemaining,
  alreadyRequested,
}: LiveClosingSignalOptions): boolean {
  return (
    interviewMode === "realtime" &&
    !isVoiceFallback &&
    isLiveConnected &&
    !alreadyRequested &&
    secondsRemaining > 0 &&
    secondsRemaining <= 45
  );
}

export function getLiveTranscriptWarnings(text: string): LiveTranscriptWarning[] {
  const warnings: LiveTranscriptWarning[] = [];
  if (/[\u3400-\u9FFF\uF900-\uFAFF]/u.test(text)) warnings.push("cjk");
  if (
    /Cuộc phỏng vấn bằng tiếng Việt/i.test(text) ||
    /Giữ nguyên dấu tiếng Việt/i.test(text) ||
    /English interview\. Preserve technical terms/i.test(text)
  ) {
    warnings.push("promptLeak");
  }
  return warnings;
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  if (value.code === "ECONNABORTED" || value.code === "ETIMEDOUT") return true;
  return typeof value.message === "string" && /\btimeout\b/i.test(value.message);
}

export function coerceStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  }
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  return [];
}

function uniqueNonEmptyStrings(messages: Array<string | null | undefined>): string[] {
  return Array.from(new Set(messages.map((message) => message?.trim()).filter(Boolean))) as string[];
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
  fallbacks: { summary?: string } = {},
): InterviewResultViewModel {
  const feedback = detail.aiFeedback;
  return {
    sessionId: detail.id,
    targetRole: detail.targetRole,
    overallScore: score(detail.overallScore),
    semanticScore: score(detail.semanticScore),
    llmScore: score(detail.llmScore),
    communicationScore: score(detail.communicationScore),
    summary:
      typeof feedback?.summary === "string"
        ? feedback.summary
        : fallbacks.summary || "No summary is available yet.",
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
