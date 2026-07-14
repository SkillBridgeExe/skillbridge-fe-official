import type {
  InterviewDetailResponseDto,
  InterviewFeedback,
  PlatformInterviewType,
  StartInterviewRequest,
  SubmitInterviewTurnRequest,
  CommunicationSignalsDto,
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
  id: string;
  question: string;
  answer: string;
  score: number | null;
  phase: string | null;
  topicPhase: string | null;
  depthSignal: string | null;
  currentThread: string | null;
  skillCanonical: string | null;
  questionBankKey: string | null;
  isCuratedQuestion: boolean;
  confidenceEvidence: InterviewEvidenceMetricViewModel[];
  strengths: string[];
  improvements: string[];
  durationSeconds: number | null;
  signals: CommunicationSignalsDto | null;
}

export interface InterviewEvidenceMetricViewModel {
  label: string;
  value: string;
}

export interface InterviewRubricDimensionViewModel {
  dimension: string;
  score: number;
  band: string;
  weight: number;
}

export interface InterviewCoachingPriorityViewModel {
  track: string;
  title: string;
  why: string;
}

export interface InterviewDevPlanItemViewModel {
  track: string;
  title: string;
  priority: number | null;
  rationale: string;
}

export interface InterviewScoreExplanationViewModel {
  dimension: 'technical_depth' | 'problem_solving' | 'communication' | 'evidence_credibility' | 'role_fit';
  score: number;
  band: 'poor' | 'borderline' | 'solid' | 'outstanding';
  weight: number;
  rubric_anchor: string;
  evidence_quote: string | null;
  linked_question_id: string | null;
  uncertainty: 'low' | 'medium' | 'high';
  improvement_hint: string | null;
}

export interface InterviewGapItemViewModel {
  skillCanonical: string;
  displayName: string;
  severity: number;
  recommendedAction: string;
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
  confidenceEvidence: InterviewEvidenceMetricViewModel[];
  rubricDimensions: InterviewRubricDimensionViewModel[];
  coachingSummary: string | null;
  coachingStrengths: string[];
  coachingPriorities: InterviewCoachingPriorityViewModel[];
  devPlanItems: InterviewDevPlanItemViewModel[];
  durationSeconds: number | null;
  questions: InterviewResultQuestionViewModel[];
  scoreExplanations: InterviewScoreExplanationViewModel[];
  gapItems: InterviewGapItemViewModel[];
}

export type InterviewQuestionBankSourceKind = "curated" | "fallback";

export interface InterviewQuestionMetadataInput {
  topicPhase?: string | null;
  skillCanonical?: string | null;
  currentThread?: string | null;
  questionBankKey?: string | null;
}

const CURATED_QUESTION_BANK_ROLE_KEYS = new Set([
  "backend_developer",
  "frontend_developer",
  "fullstack_developer",
  "mobile_developer",
  "devops_engineer",
  "data_analyst",
  "qa_engineer",
  "qa_tester",
  "ai_ml_engineer",
]);

const CURATED_QUESTION_BANK_ROLE_TOKENS = new Set([
  "backend",
  "frontend",
  "fullstack",
  "mobile",
  "ios",
  "android",
  "flutter",
  "devops",
  "sre",
  "data",
  "analyst",
  "analytics",
  "bi",
  "qa",
  "tester",
  "sdet",
  "ai",
  "ml",
  "llm",
]);

export type InterviewHistoryState =
  | "signed-out"
  | "loading"
  | "error"
  | "empty"
  | "ready";
export type InterviewHistoryDetailState =
  | "idle"
  | "loading"
  | "error"
  | "not-scored"
  | "ready";
export type InterviewSessionStatusKey =
  | "completed"
  | "inProgress"
  | "cancelled"
  | "unknown";
export type InterviewModeLabelKey =
  | "textFallback"
  | "liveRealtime"
  | "guidedVoice";

export type RealtimeMicStatusKey =
  | "manual"
  | "interviewerSpeaking"
  | "submitting"
  | "listening"
  | "paused";
export type RealtimeTranscriptIntent =
  | "answer"
  | "repeat_question"
  | "clarify_question"
  | "skip_question"
  | "pause"
  | "end_interview"
  | "off_topic";

interface RealtimeMicStatusOptions {
  isLiveRealtime: boolean;
  isLoading: boolean;
  isInterviewerSpeaking: boolean;
  isMicActive: boolean;
}
export type InterviewEndIntent = "cancel" | "score";
export type InterviewEndOutcome = "cancelled" | "scored";
export type LiveTranscriptWarning = "cjk" | "promptLeak";

export interface InterviewVoicePreference {
  voice: InterviewVoice;
  speechSpeed: InterviewSpeechSpeed;
}

export interface RealtimeOfficialQuestionSpeaker {
  speakOfficialQuestion(question: string, language: "vi" | "en"): void;
}

export interface ServerOwnedRealtimeTurnInput {
  sessionId: string;
  transcript: string;
  durationSeconds?: number;
}

export interface ValidatedRealtimeTurnInput extends ServerOwnedRealtimeTurnInput {
  currentQuestion?: string | null;
}

export interface BufferedRealtimeTurnInput {
  sessionId: string;
  currentQuestion?: string | null;
  transcripts: string[];
  durationSeconds?: number;
}

export interface QuestionAudioRequestGuard {
  next(): number;
  invalidate(): void;
  isCurrent(requestId: number): boolean;
}

export function getInterviewEndIntent(
  answeredCount: number,
): InterviewEndIntent {
  return answeredCount > 0 ? "score" : "cancel";
}

export function getInterviewEndOutcome(status: string): InterviewEndOutcome {
  return status.toUpperCase() === "CANCELLED" ? "cancelled" : "scored";
}

export function getInterviewQuestionBankSourceKind(
  targetRole: string,
): InterviewQuestionBankSourceKind {
  const normalized = targetRole
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (CURATED_QUESTION_BANK_ROLE_KEYS.has(normalized)) {
    return "curated";
  }

  const roleTokens = new Set(normalized.split("_").filter(Boolean));
  if (roleTokens.has("back") && roleTokens.has("end")) {
    return "curated";
  }
  if (roleTokens.has("front") && roleTokens.has("end")) {
    return "curated";
  }
  if (roleTokens.has("full") && roleTokens.has("stack")) {
    return "curated";
  }
  if (
    [...CURATED_QUESTION_BANK_ROLE_TOKENS].some((token) =>
      roleTokens.has(token),
    )
  ) {
    return "curated";
  }

  return "fallback";
}

export function hasVisibleInterviewQuestionMetadata(
  metadata: InterviewQuestionMetadataInput | null | undefined,
): boolean {
  return Boolean(
    metadata &&
    [
      metadata.topicPhase,
      metadata.skillCanonical,
      metadata.currentThread,
      metadata.questionBankKey,
    ].some((value) => typeof value === "string" && value.trim().length > 0),
  );
}

export function takeRecentInterviewSessions<T>(
  sessions: readonly T[],
  limit = 3,
): T[] {
  return sessions.slice(0, limit);
}

export function buildInterviewInitialMessages(
  firstMessage: string | null | undefined,
  firstQuestion: string | null | undefined,
): string[] {
  const content = uniqueNonEmptyStrings([firstMessage, firstQuestion]).join(
    "\n\n",
  );
  return content ? [content] : [];
}

export function buildInterviewNextMessages(
  aiMessage: string | null | undefined,
  nextQuestion: string | null | undefined,
): string[] {
  const content = interviewerTurnText(aiMessage, nextQuestion);
  return content ? [content] : [];
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

export function speakOfficialRealtimeQuestion(
  session: RealtimeOfficialQuestionSpeaker | null | undefined,
  question: string | null | undefined,
  language: "vi" | "en",
  aiMessage?: string | null,
): boolean {
  const trimmed = interviewerTurnText(aiMessage, question);
  if (!session || !trimmed) return false;
  session.speakOfficialQuestion(trimmed, language);
  return true;
}

export function buildServerOwnedRealtimeTurnRequest({
  sessionId,
  transcript,
  durationSeconds,
}: ServerOwnedRealtimeTurnInput): SubmitInterviewTurnRequest | null {
  const normalized = transcript.trim().normalize("NFC");
  if (!normalized) return null;
  return {
    sessionId,
    userAnswer: normalized,
    userTranscript: normalized,
    modality: "AUDIO",
    durationSeconds,
  };
}

export function buildValidatedRealtimeTurnRequest({
  currentQuestion,
  ...input
}: ValidatedRealtimeTurnInput): SubmitInterviewTurnRequest | null {
  const normalized = input.transcript.trim().normalize("NFC");
  if (!normalized) return null;
  if (getLiveTranscriptWarnings(normalized).length > 0) return null;
  if (!isMeaningfulRealtimeTranscript(normalized, currentQuestion)) return null;
  return buildServerOwnedRealtimeTurnRequest({
    ...input,
    transcript: normalized,
  });
}

export function buildBufferedRealtimeTurnRequest({
  sessionId,
  currentQuestion,
  transcripts,
  durationSeconds,
}: BufferedRealtimeTurnInput): SubmitInterviewTurnRequest | null {
  const transcript = transcripts
    .map((item) => item.trim().normalize("NFC"))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return buildValidatedRealtimeTurnRequest({
    sessionId,
    currentQuestion,
    transcript,
    durationSeconds,
  });
}

export function classifyRealtimeTranscriptIntent(
  transcript: string,
): RealtimeTranscriptIntent {
  const normalized = normalizeCommandText(transcript);
  if (!normalized) return "off_topic";
  if (getLiveTranscriptWarnings(transcript).length > 0) return "off_topic";
  if (
    /\b(repeat|say again|read again|ask again|nhac lai|doc lai|noi lai)\b/.test(
      normalized,
    ) ||
    /nhac lai cau hoi/.test(normalized)
  ) {
    return "repeat_question";
  }
  if (
    /\b(clarify|explain|what do you mean|i don't understand|i do not understand)\b/.test(
      normalized,
    ) ||
    /(y cau nay|giai thich|em chua hieu|khong hieu)/.test(normalized)
  ) {
    return "clarify_question";
  }
  if (/\b(skip|next question|bo qua|cau khac)\b/.test(normalized)) {
    return "skip_question";
  }
  if (/\b(pause|wait|tam dung|dung mot chut|cho em)\b/.test(normalized)) {
    return "pause";
  }
  if (
    /\b(end interview|finish interview|stop interview|ket thuc|dung phong van)\b/.test(
      normalized,
    )
  ) {
    return "end_interview";
  }
  if (tokenizeTranscript(transcript).length < 2) return "off_topic";
  return "answer";
}

export function createQuestionAudioRequestGuard(): QuestionAudioRequestGuard {
  let currentRequestId = 0;
  return {
    next: () => {
      currentRequestId += 1;
      return currentRequestId;
    },
    invalidate: () => {
      currentRequestId += 1;
    },
    isCurrent: (requestId: number) => requestId === currentRequestId,
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

export function normalizeInterviewSpeechSpeed(
  value: unknown,
): InterviewSpeechSpeed {
  const numeric = Number(value);
  const match = INTERVIEW_SPEECH_SPEED_OPTIONS.find(
    (option) => option.value === numeric,
  );
  return match?.value ?? DEFAULT_INTERVIEW_SPEECH_SPEED;
}

export function toBackendInterviewType(
  type: InterviewType,
): PlatformInterviewType {
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

export function getInterviewSessionStatusKey(
  status: string,
): InterviewSessionStatusKey {
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
  if (!result || result.status !== "COMPLETED" || result.overallScore == null)
    return "not-scored";
  return "ready";
}

export function secondsRemainingFromExpiry(
  expiresAt: string | null,
  now = new Date(),
): number {
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

export function getRealtimeMicStatusKey({
  isLiveRealtime,
  isLoading,
  isInterviewerSpeaking,
  isMicActive,
}: RealtimeMicStatusOptions): RealtimeMicStatusKey {
  if (!isLiveRealtime) return "manual";
  if (isInterviewerSpeaking) return "interviewerSpeaking";
  if (isLoading) return "submitting";
  return isMicActive ? "listening" : "paused";
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
  return (
    reason ||
    fallbackMessage ||
    "Realtime token is unavailable. Continue in text mode."
  );
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

export function shouldRequestQuestionAudio(
  interviewMode: InterviewMode,
): boolean {
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

export function getLiveTranscriptWarnings(
  text: string,
): LiveTranscriptWarning[] {
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

function isMeaningfulRealtimeTranscript(
  transcript: string,
  currentQuestion: string | null | undefined,
): boolean {
  const compactLength = transcript.replace(/\s+/g, "").length;
  if (compactLength < 4) return false;
  if (
    currentQuestion &&
    normalizeForTranscriptComparison(transcript) ===
      normalizeForTranscriptComparison(currentQuestion)
  ) {
    return false;
  }
  return tokenizeTranscript(transcript).length >= 2;
}

function tokenizeTranscript(value: string): string[] {
  return value.match(/[\p{L}\p{N}+#.]+/gu) ?? [];
}

function normalizeForTranscriptComparison(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
    .trim();
}

function normalizeCommandText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  if (value.code === "ECONNABORTED" || value.code === "ETIMEDOUT") return true;
  return (
    typeof value.message === "string" && /\btimeout\b/i.test(value.message)
  );
}

export function coerceStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
  }
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  return [];
}

function uniqueNonEmptyStrings(
  messages: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(messages.map((message) => message?.trim()).filter(Boolean)),
  ) as string[];
}

function interviewerTurnText(
  aiMessage: string | null | undefined,
  question: string | null | undefined,
): string {
  return uniqueNonEmptyStrings([aiMessage, question]).join("\n\n").normalize("NFC");
}

function score(value: number | null | undefined): number | null {
  return value == null || Number.isNaN(value) ? null : Math.round(value);
}

function feedbackRecord(
  feedback: InterviewFeedback | null,
  key: "technical_delivery" | "communication_flow",
): Record<string, number> | null {
  const value = feedback?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
      .map(([k, v]) => [k, Math.round(v as number)]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function readBooleanLabel(value: unknown): string | null {
  if (typeof value !== "boolean") return null;
  return value ? "Yes" : "No";
}

function readFinalScoreOverall(value: unknown): number | null {
  if (!isRecord(value)) return null;
  return score(readNumber(value.overall));
}

function readRubricDimensions(
  value: unknown,
): InterviewRubricDimensionViewModel[] {
  if (!isRecord(value) || !Array.isArray(value.dimensions)) return [];

  return value.dimensions
    .map((dimension): InterviewRubricDimensionViewModel | null => {
      if (!isRecord(dimension)) return null;
      const name = readString(dimension.dimension);
      const dimensionScore = score(readNumber(dimension.score));
      const band = readString(dimension.band);
      const weight = readNumber(dimension.weight);
      if (!name || dimensionScore == null || !band || weight == null)
        return null;
      return {
        dimension: name,
        score: dimensionScore,
        band,
        weight,
      };
    })
    .filter(
      (dimension): dimension is InterviewRubricDimensionViewModel =>
        dimension !== null,
    );
}

function readCoachingSummary(value: unknown): string | null {
  return isRecord(value) ? readString(value.summary) : null;
}

function readCoachingStrengths(value: unknown): string[] {
  return isRecord(value) ? coerceStringList(value.strengths) : [];
}

function readCoachingPriorities(
  value: unknown,
): InterviewCoachingPriorityViewModel[] {
  if (!isRecord(value) || !Array.isArray(value.priorities)) return [];

  return value.priorities
    .map((priority): InterviewCoachingPriorityViewModel | null => {
      if (!isRecord(priority)) return null;
      const track = readString(priority.track);
      const title = readString(priority.title);
      const why = readString(priority.why);
      if (!track || !title || !why) return null;
      return { track, title, why };
    })
    .filter(
      (priority): priority is InterviewCoachingPriorityViewModel =>
        priority !== null,
    );
}

function readDevPlanItems(value: unknown): InterviewDevPlanItemViewModel[] {
  if (!isRecord(value)) return [];
  return ["learn_items", "cv_fix_items", "interview_practice_items"].flatMap(
    (key) => {
      const bucket = value[key];
      if (!Array.isArray(bucket)) return [];
      return bucket
        .map((item): InterviewDevPlanItemViewModel | null => {
          if (!isRecord(item)) return null;
          const track = readString(item.track);
          const title = readString(item.display_name);
          if (!track || !title) return null;
          return {
            track,
            title,
            priority: readNumber(item.priority),
            rationale: readString(item.rationale) ?? "",
          };
        })
        .filter((item): item is InterviewDevPlanItemViewModel => item !== null);
    },
  );
}

function readConfidenceEvidence(
  value: unknown,
): InterviewEvidenceMetricViewModel[] {
  if (!isRecord(value)) return [];

  const starPresent = isRecord(value.star_present) ? value.star_present : null;
  const starCoverage = starPresent
    ? [
        ["situation", "Situation"],
        ["task", "Task"],
        ["action", "Action"],
        ["result", "Result"],
      ]
        .filter(([key]) => starPresent[key] === true)
        .map(([, label]) => label)
        .join(", ")
    : "";

  return [
    metric("Confidence tone", readString(value.confidence_tone)),
    metric("Evidence quality", readString(value.evidence_quality)),
    metric("Clarity", readString(value.clarity)),
    metric("Off topic", readBooleanLabel(value.off_topic)),
    metric("Specific example", readBooleanLabel(value.has_specific_example)),
    metric("STAR coverage", starCoverage || null),
  ].filter((item): item is InterviewEvidenceMetricViewModel => item !== null);
}

function metric(
  label: string,
  value: string | null,
): InterviewEvidenceMetricViewModel | null {
  return value ? { label, value } : null;
}

function readScoreExplanations(value: unknown): InterviewScoreExplanationViewModel[] {
  if (!isRecord(value) || !Array.isArray(value.score_explanations)) return [];
  return value.score_explanations.map((item): InterviewScoreExplanationViewModel | null => {
    if (!isRecord(item)) return null;
    const rub = readString(item.rubric_anchor);
    if (!rub) return null;
    return {
      dimension: (item.dimension || '') as InterviewScoreExplanationViewModel['dimension'],
      score: readNumber(item.score) ?? 0,
      band: (item.band || 'poor') as InterviewScoreExplanationViewModel['band'],
      weight: readNumber(item.weight) ?? 0,
      rubric_anchor: rub,
      evidence_quote: readString(item.evidence_quote),
      linked_question_id: readString(item.linked_question_id),
      uncertainty: (item.uncertainty || 'medium') as InterviewScoreExplanationViewModel['uncertainty'],
      improvement_hint: readString(item.improvement_hint),
    };
  }).filter((item): item is InterviewScoreExplanationViewModel => item !== null);
}

function readGapItems(value: unknown): InterviewGapItemViewModel[] {
  if (!Array.isArray(value)) return [];
  return value.map((item): InterviewGapItemViewModel | null => {
    if (!isRecord(item)) return null;
    const skill = readString(item.skill_canonical);
    const display = readString(item.display_name);
    const severity = readNumber(item.severity) ?? 0;
    const action = readString(item.recommended_action) || readString(item.recommended_next_action) || "";
    if (!skill || !display) return null;
    return {
      skillCanonical: skill,
      displayName: display,
      severity,
      recommendedAction: action,
    };
  }).filter((item): item is InterviewGapItemViewModel => item !== null);
}

export function toInterviewResultViewModel(
  detail: InterviewDetailResponseDto,
  fallbacks: { summary?: string } = {},
): InterviewResultViewModel {
  const feedback = detail.aiFeedback;
  const finalScoreOverall = readFinalScoreOverall(detail.finalScore);
  const questions = detail.turns
    .filter((turn) => turn.userAnswerText || turn.userAnswerTranscript)
    .map((turn) => {
      const questionBankKey = readString(turn.questionBankKey);
      return {
        id: turn.id,
        question: turn.interviewerQuestion,
        answer: turn.userAnswerText ?? turn.userAnswerTranscript ?? "",
        score: score(turn.perQuestionScore),
        phase: turn.phase ?? null,
        topicPhase: turn.topicPhase ?? null,
        depthSignal: turn.depthSignal ?? null,
        currentThread: turn.currentThread ?? null,
        skillCanonical: turn.skillCanonical ?? null,
        questionBankKey,
        isCuratedQuestion: Boolean(questionBankKey),
        confidenceEvidence: readConfidenceEvidence(turn.insight),
        strengths: coerceStringList(turn.strengths),
        improvements: coerceStringList(turn.improvements),
        durationSeconds: turn.durationSeconds,
        signals: turn.signals ?? null,
      };
    });

  return {
    sessionId: detail.id,
    targetRole: detail.targetRole,
    overallScore: finalScoreOverall ?? score(detail.overallScore),
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
    confidenceEvidence:
      questions.find((question) => question.confidenceEvidence.length > 0)
        ?.confidenceEvidence ?? [],
    rubricDimensions: readRubricDimensions(detail.finalScore),
    coachingSummary: readCoachingSummary(detail.coaching),
    coachingStrengths: readCoachingStrengths(detail.coaching),
    coachingPriorities: readCoachingPriorities(detail.coaching),
    devPlanItems: readDevPlanItems(detail.devPlan),
    durationSeconds: detail.durationSeconds,
    questions,
    scoreExplanations: readScoreExplanations(detail.finalScore),
    gapItems: readGapItems(detail.gapItems),
  };
}
