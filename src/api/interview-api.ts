import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { getAccessToken } from "@/services/auth-token.service";

const QUESTION_AUDIO_TIMEOUT_MS = 60_000;

export type PlatformInterviewMode = "TEXT" | "VOICE" | "HYBRID";
export type InterviewExperienceMode = "MOCK" | "PRACTICE";
export type InterviewEngineVersion = "V1" | "V2";
export type RealtimeCandidateIntent =
  | "ANSWER" | "NO_ANSWER" | "REPEAT" | "CLARIFY" | "EASIER"
  | "HINT" | "FEEDBACK" | "SKIP" | "END";
export type RealtimeAnswerSignal = "COMPLETE" | "PARTIAL" | "OFF_TOPIC" | "NO_ANSWER";
export type PlatformInterviewType = "HR" | "TECHNICAL" | "MIXED";
export type PlatformInterviewStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PlatformInterviewLanguage = "vi" | "en";
export type PlatformInterviewModality = "TEXT" | "AUDIO";
export type InterviewContextMode = "ROLE_ONLY" | "CV_ONLY" | "CV_JD_MATCH";
export type PlatformInterviewVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "sage"
  | "shimmer"
  | "verse"
  | "marin"
  | "cedar";

export interface RealtimeClientSecretDto {
  enabled: boolean;
  provider: "openai";
  model: string | null;
  clientSecret: string | null;
  expiresAt: string | null;
  reason?: string;
}

export interface FinalScoreDto {
  overall: number | null;
  overall_band: 'poor' | 'borderline' | 'solid' | 'outstanding' | 'legacy';
  dimensions: Array<{ dimension: string; score: number; band: string; weight: number }>;
  role_family: string;
  scored_answers: number;
  score_basis?: 'criterion_rubric' | 'legacy_fallback' | 'mixed' | 'unscored';
  scoring_note?: string;
  score_explanations?: Array<{
    dimension: 'technical_depth' | 'problem_solving' | 'communication' | 'evidence_credibility' | 'role_fit';
    score: number;
    band: 'poor' | 'borderline' | 'solid' | 'outstanding';
    weight: number;
    rubric_anchor: string;
    evidence_quote: string | null;
    linked_question_id: string | null;
    uncertainty: 'low' | 'medium' | 'high';
    improvement_hint: string | null;
  }>;
}

export interface InterviewGapItemDto {
  /** null for communication/behavioral gaps. */
  skill_canonical: string | null;
  display_name: string;
  weakness_type?: string;
  severity: number;
  recommended_action: string;
}

export interface CommunicationSignalsDto {
  word_count?: number;
  sentence_count?: number;
  conciseness?: 'too_short' | 'ideal' | 'verbose';
  is_quantified?: boolean | null;
  flags?: {
    rambling_risk?: boolean | null;
  } | null;
  filler?: {
    count: number;
    terms?: string[];
  };
  hedging?: {
    count: number;
    terms?: string[];
  };
  repeated_terms?: Array<{ term: string; count: number }>;
  jd_term_hits?: {
    hit: string[];
    missed: string[];
    coverage: number;
  };
  star?: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
    complete: boolean;
  };
}

export interface InterviewSessionDto {
  id: string;
  cvId: string | null;
  cvMatchId: string | null;
  jobDescriptionId: string | null;
  contextMode?: InterviewContextMode;
  targetRole: string;
  language: PlatformInterviewLanguage | string;
  mode: PlatformInterviewMode;
  experienceMode?: InterviewExperienceMode;
  engineVersion?: InterviewEngineVersion;
  interviewType: PlatformInterviewType;
  voice: PlatformInterviewVoice | string;
  speechSpeed: number;
  status: PlatformInterviewStatus | string;
  totalQuestionsPlanned: number | null;
  maxDurationSeconds: number;
  expiresAt: string | null;
  overallScore: number | null;
  semanticScore: number | null;
  llmScore: number | null;
  communicationScore: number | null;
  aiFeedback: InterviewFeedback | null;
  finalScore?: FinalScoreDto | null;
  gapItems?: InterviewGapItemDto[] | null;
  devPlan?: unknown;
  coaching?: unknown;
  durationSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface InterviewTurnTraceDto {
  action: 'ask' | 'drill' | 'move_on' | 'wrap';
  phase: string;
  topic_id?: string;
  reasons: string[];
  depth: number;
  remaining_turn_budget: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface InterviewTurnDto {
  id: string;
  sessionId: string;
  turnOrder: number;
  phase: string | null;
  topicPhase?: string | null;
  modality: PlatformInterviewModality;
  aiRequestId: string | null;
  interviewerMessage?: string | null;
  interviewerQuestion: string;
  userAnswerText: string | null;
  userAnswerTranscript: string | null;
  perQuestionScore: number | null;
  depthSignal?: string | null;
  signals?: CommunicationSignalsDto | null;
  insight?: unknown;
  /** persisted per-turn decision trace (BE I-CONSIST-2) — null/absent on legacy turns. */
  turnTrace?: InterviewTurnTraceDto | null;
  currentThread?: string | null;
  skillCanonical?: string | null;
  questionBankKey?: string | null;
  strengths: string[] | unknown;
  improvements: string[] | unknown;
  askedAt: string;
  answeredAt: string | null;
  durationSeconds: number | null;
  /** P3 speech timing (voice mode) — null/absent on text/legacy turns. */
  responseDelayMs?: number | null;
  transcriptSegments?: number | null;
  /** I-PACE: seconds the interviewer allocated for this turn's answer. null on legacy/review turns. */
  timeBudgetSeconds?: number | null;
  questionThreadId?: string | null;
  candidateIntent?: RealtimeCandidateIntent | null;
  assistanceLevel?: "NONE" | "EASIER" | "HINT" | "SKIPPED";
  scoreCap?: number | null;
  rawScore?: number | null;
  finalQuestionScore?: number | null;
  skipReason?: string | null;
}

export interface InterviewFeedback {
  summary?: string;
  technical_delivery?: Record<string, number>;
  communication_flow?: Record<string, number>;
  recommendations?: string | string[];
  suggested_modules?: string[];
  [key: string]: unknown;
}

export interface StartInterviewRequest {
  cvId?: string;
  cvMatchId?: string;
  jobDescriptionId?: string;
  targetRole: string;
  language?: PlatformInterviewLanguage;
  mode?: PlatformInterviewMode;
  experienceMode?: InterviewExperienceMode;
  interviewType?: PlatformInterviewType;
  voice?: PlatformInterviewVoice;
  speechSpeed?: number;
}

export interface StartInterviewResponseDto extends InterviewSessionDto {
  firstMessage: string;
  firstQuestion: string;
  phase: string | null;
  realtime: RealtimeClientSecretDto;
  /** I-PACE: answer budget for the first question (seconds). */
  answerBudgetSeconds?: number;
}

export interface SubmitInterviewTurnRequest {
  sessionId: string;
  userAnswer: string;
  userTranscript?: string;
  modality?: PlatformInterviewModality;
  durationSeconds?: number;
  /** P3 speech timing (voice mode) — only sent when client-measured. */
  responseDelayMs?: number;
  transcriptSegments?: number;
}

export interface RealtimeInterviewTurnRequest {
  clientTurnId: string;
  transcript: string;
  modality: PlatformInterviewModality;
  intent: RealtimeCandidateIntent;
  answerSignal: RealtimeAnswerSignal;
  speechEndedAt?: string;
  durationSeconds?: number;
  responseDelayMs?: number;
  transcriptSegments?: number;
}

export type RealtimeDirectiveAction =
  | "FOLLOW_UP" | "ADVANCE_TOPIC" | "LOWER_DIFFICULTY" | "GIVE_HINT"
  | "GIVE_FEEDBACK" | "DECLINE_COACHING" | "REPEAT" | "CLARIFY" | "WRAP_UP";

export interface RealtimeTurnDirectiveDto {
  directiveId: string;
  action: RealtimeDirectiveAction;
  topicId: string | null;
  questionThreadId: string;
  difficultyStep: number;
  assistanceLevel: "NONE" | "EASIER" | "HINT" | "SKIPPED";
  scoreCap: number | null;
  threadScore: number | null;
  consumesAttempt: boolean;
  questionGoal: string;
  finished: boolean;
}

export interface CommitRealtimeAssistantMessageRequest {
  responseId: string;
  interviewerMessage?: string;
  interviewerQuestion: string;
  firstAudioAt?: string;
  interrupted?: boolean;
}

export interface CommitRealtimeAssistantMessageResponse {
  directive: RealtimeTurnDirectiveDto;
  turnId: string | null;
}

export interface LiveInterviewTurnInput {
  turnOrder: number;
  interviewerQuestion: string;
  userAnswerText: string;
  userAnswerTranscript?: string;
  durationSeconds?: number;
}

export interface AnswerInterviewResponseDto {
  session: InterviewSessionDto;
  answeredTurn: InterviewTurnDto;
  nextTurn: InterviewTurnDto | null;
  aiMessage: string;
  nextQuestion: string | null;
  finished: boolean;
  turnDecision?: "continue_topic" | "advance_topic" | "adaptive_follow_up" | "closing_prompt" | "finish";
  finishReason?: "TIME_LIMIT" | "USER_REQUEST" | "SAFETY_CAP" | null;
  nextQuestionKind?: "opening" | "follow_up" | "transition" | "closing" | null;
  turnTrace?: InterviewTurnTraceDto | null;
}

export interface InterviewDetailResponseDto extends InterviewSessionDto {
  turns: InterviewTurnDto[];
}

export interface InterviewHistoryQuery {
  page?: number;
  limit?: number;
  scoredOnly?: boolean;
}

export interface InterviewHistoryResponse {
  items: InterviewSessionDto[];
  total: number;
  page: number;
  limit: number;
}

export async function startInterview(
  payload: StartInterviewRequest,
): Promise<StartInterviewResponseDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<StartInterviewResponseDto>>(
    httpClient.post(API_ROUTES.INTERVIEW.START, payload),
    "Failed to start interview.",
  );
  return envelope.data;
}

export async function submitInterviewTurn(
  payload: SubmitInterviewTurnRequest,
): Promise<AnswerInterviewResponseDto> {
  const envelope = await unwrapEnvelope<
    ApiEnvelope<AnswerInterviewResponseDto>
  >(
    httpClient.post(API_ROUTES.INTERVIEW.TURN, payload),
    "Failed to submit interview answer.",
  );
  return envelope.data;
}

export async function submitRealtimeInterviewTurn(
  sessionId: string,
  payload: RealtimeInterviewTurnRequest,
): Promise<RealtimeTurnDirectiveDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<RealtimeTurnDirectiveDto>>(
    httpClient.post(API_ROUTES.INTERVIEW.REALTIME_TURN(sessionId), payload),
    "Failed to resolve realtime interview turn.",
  );
  return envelope.data;
}

export async function commitRealtimeAssistantMessage(
  sessionId: string,
  directiveId: string,
  payload: CommitRealtimeAssistantMessageRequest,
): Promise<CommitRealtimeAssistantMessageResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CommitRealtimeAssistantMessageResponse>>(
    httpClient.post(
      API_ROUTES.INTERVIEW.REALTIME_DIRECTIVE_COMMIT(sessionId, directiveId),
      payload,
    ),
    "Failed to commit realtime interviewer transcript.",
  );
  return envelope.data;
}

export async function endInterview(
  sessionId: string,
  liveTurns?: LiveInterviewTurnInput[],
): Promise<InterviewDetailResponseDto> {
  const payload = liveTurns ? { sessionId, liveTurns } : { sessionId };
  const envelope = await unwrapEnvelope<
    ApiEnvelope<InterviewDetailResponseDto>
  >(
    httpClient.post(API_ROUTES.INTERVIEW.END, payload),
    "Failed to end interview.",
  );
  return envelope.data;
}

/**
 * Best-effort end for a session being abandoned (tab close, page navigation).
 * Uses a keepalive fetch instead of navigator.sendBeacon because /interview/end
 * requires the Authorization bearer header, which sendBeacon cannot set.
 * Fire-and-forget by design: the backend sweeps and scores stale IN_PROGRESS
 * sessions on the user's next /interview/start if this request never lands.
 */
export function sendBestEffortInterviewEnd(sessionId: string): void {
  const token = getAccessToken();
  if (!token || typeof fetch !== "function") return;
  void fetch(`${httpClient.defaults?.baseURL ?? ""}${API_ROUTES.INTERVIEW.END}`, {
    method: "POST",
    keepalive: true,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId }),
  }).catch(() => {
    // Swallowed on purpose — the BE stale-session sweep is the backstop.
  });
}

export async function getInterviewHistory(
  query: InterviewHistoryQuery = {},
): Promise<InterviewHistoryResponse> {
  const params: InterviewHistoryQuery = {
    page: query.page ?? 1,
    limit: query.limit ?? 10,
    ...(query.scoredOnly == null ? {} : { scoredOnly: query.scoredOnly }),
  };
  const envelope = await unwrapEnvelope<ApiEnvelope<InterviewHistoryResponse>>(
    httpClient.get(API_ROUTES.INTERVIEW.HISTORY, { params }),
    "Failed to load interview history.",
  );
  return envelope.data;
}

export async function getInterviewDetail(
  id: string,
): Promise<InterviewDetailResponseDto> {
  const envelope = await unwrapEnvelope<
    ApiEnvelope<InterviewDetailResponseDto>
  >(
    httpClient.get(API_ROUTES.INTERVIEW.DETAIL(id)),
    "Failed to load interview detail.",
  );
  return envelope.data;
}

export async function refreshRealtimeToken(
  id: string,
): Promise<RealtimeClientSecretDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<RealtimeClientSecretDto>>(
    httpClient.post(API_ROUTES.INTERVIEW.REALTIME_TOKEN(id)),
    "Failed to refresh realtime token.",
  );
  return envelope.data;
}

export async function getInterviewQuestionAudio(id: string): Promise<Blob> {
  const response = await httpClient.post<Blob>(
    API_ROUTES.INTERVIEW.QUESTION_AUDIO(id),
    undefined,
    { responseType: "blob", timeout: QUESTION_AUDIO_TIMEOUT_MS },
  );
  return normalizeQuestionAudioBlob(response.data);
}

async function normalizeQuestionAudioBlob(blob: Blob): Promise<Blob> {
  if (blob.size === 0) {
    throw new Error("Question audio endpoint returned an empty audio file.");
  }

  const type = blob.type.toLowerCase();
  if (!isTextLikeBlobType(type)) return blob;

  const text = await blob.text().catch(() => "");
  if (!text.trim()) {
    throw new Error(
      `Question audio endpoint returned ${type} instead of playable audio.`,
    );
  }

  const parsed = parseJson(text);
  const serializedAudio = parsed ? readSerializedAudioBlob(parsed) : null;
  if (serializedAudio) return serializedAudio;

  const backendMessage = parsed
    ? readMessage(parsed)
    : text.trim().slice(0, 300);
  throw new Error(
    backendMessage
      ? `Question audio endpoint returned ${type}: ${backendMessage}`
      : `Question audio endpoint returned ${type} instead of playable audio.`,
  );
}

function isTextLikeBlobType(type: string): boolean {
  return (
    type.startsWith("text/") ||
    type.includes("json") ||
    type.includes("xml") ||
    type.includes("html")
  );
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readSerializedAudioBlob(value: unknown): Blob | null {
  if (!isRecord(value)) return null;
  const data = value.data;
  if (!isRecord(data)) return null;

  const options = data.options;
  const audioType =
    isRecord(options) &&
    typeof options.type === "string" &&
    options.type.startsWith("audio/")
      ? options.type
      : null;
  if (!audioType) return null;

  const stream = data.stream;
  const readableState = isRecord(stream) ? stream._readableState : null;
  const buffer = isRecord(readableState) ? readableState.buffer : null;
  if (!Array.isArray(buffer) || buffer.length === 0) return null;

  const chunks = buffer
    .map(readSerializedBufferChunk)
    .filter((chunk): chunk is ArrayBuffer => chunk !== null);
  if (chunks.length === 0) return null;

  return new Blob(chunks, { type: audioType });
}

function readSerializedBufferChunk(value: unknown): ArrayBuffer | null {
  if (!isRecord(value) || !Array.isArray(value.data)) return null;
  const bytes = value.data;
  if (
    !bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  ) {
    return null;
  }
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readMessage(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!isRecord(value)) return null;

  if (typeof value.message === "string" && value.message.trim()) {
    return value.message.trim();
  }
  if (typeof value.error === "string" && value.error.trim()) {
    return value.error.trim();
  }
  if (isRecord(value.error)) {
    return readMessage(value.error);
  }
  return null;
}
