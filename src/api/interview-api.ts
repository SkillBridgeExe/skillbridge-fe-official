import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { getAccessToken } from "@/services/auth-token.service";

export type PlatformInterviewMode = "TEXT" | "VOICE";
export type InterviewExperienceMode = "MOCK" | "PRACTICE";
export type RealtimeCandidateIntent =
  | "ANSWER"
  | "NO_ANSWER"
  | "REPEAT"
  | "CLARIFY"
  | "EASIER"
  | "HINT"
  | "FEEDBACK"
  | "SKIP"
  | "END";
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
  protocolVersion: 'interview-realtime-v3';
  transcriptionModel: string;
  clientSecret: string | null;
  expiresAt: string | null;
  reason?: string;
}

export interface FinalScoreDto {
  overall: number | null;
  overall_band: "poor" | "borderline" | "solid" | "outstanding" | "legacy";
  dimensions: Array<{
    dimension: string;
    score: number;
    band: string;
    weight: number;
  }>;
  role_family: string;
  scored_answers: number;
  score_basis?: "criterion_rubric" | "legacy_fallback" | "mixed" | "unscored";
  scoring_note?: string;
  score_explanations?: Array<{
    dimension:
      | "technical_depth"
      | "problem_solving"
      | "communication"
      | "evidence_credibility"
      | "role_fit";
    score: number;
    band: "poor" | "borderline" | "solid" | "outstanding";
    weight: number;
    rubric_anchor: string;
    evidence_quote: string | null;
    linked_question_id: string | null;
    uncertainty: "low" | "medium" | "high";
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
  conciseness?: "too_short" | "ideal" | "verbose";
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
  interviewType: PlatformInterviewType;
  voice: PlatformInterviewVoice | string;
  speechSpeed: number;
  status: PlatformInterviewStatus | string;
  analysisStatus?:
    | "NOT_STARTED"
    | "PENDING"
    | "READY"
    | "FAILED"
    | "NOT_REQUIRED";
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
  action: "ask" | "drill" | "move_on" | "wrap";
  phase: string;
  topic_id?: string;
  reasons: string[];
  depth: number;
  remaining_turn_budget: number;
  confidence: "high" | "medium" | "low";
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
  currentTurnId: string;
  firstMessage: string;
  firstQuestion: string;
  phase: string | null;
  realtime: RealtimeClientSecretDto;
  /** I-PACE: answer budget for the first question (seconds). */
  answerBudgetSeconds?: number;
}

export type RealtimeExchangeInputType = "ANSWER" | "CONTROL" | "CAPTURE_RETRY";
export type RealtimeIntentSource = "VOICE_LEXICAL" | "BUTTON" | "TEXT";

export type RealtimeInterviewTurnRequest =
  | {
      kind: "REALTIME_EXCHANGE";
      clientTurnId: string;
      questionTurnId: string | null;
      input: {
        type: RealtimeExchangeInputType;
        modality: PlatformInterviewModality;
        transcript?: string;
        intent?: RealtimeCandidateIntent;
        intentSource: RealtimeIntentSource;
        itemIds?: string[];
        speechStartedAt?: string;
        speechEndedAt?: string;
        segmentCount?: number;
        meanLogprob?: number;
      };
      assistant: {
        responseId: string;
        transcript: string;
        firstAudioAt?: string;
        interrupted: boolean;
      };
    }
  | {
      kind: "TEXT_FALLBACK";
      clientTurnId: string;
      questionTurnId: string | null;
      text: string;
      intent?: RealtimeCandidateIntent;
    };

export type RealtimeExchangeDisposition =
  | "COMMITTED"
  | "DUPLICATE"
  | "CAPTURE_RETRY"
  | "CONTROL_APPLIED"
  | "PENDING";

export interface RealtimeExchangeResponseDto {
  clientTurnId: string;
  disposition: RealtimeExchangeDisposition;
  answeredTurnId: string | null;
  currentTurnId: string | null;
  assistant: {
    responseId: string | null;
    transcript: string;
    question: string | null;
  } | null;
  finished: boolean;
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

export async function submitRealtimeInterviewTurn(
  sessionId: string,
  payload: RealtimeInterviewTurnRequest,
): Promise<RealtimeExchangeResponseDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<RealtimeExchangeResponseDto>>(
    httpClient.post(API_ROUTES.INTERVIEW.REALTIME_TURN(sessionId), payload),
    "Failed to resolve realtime interview turn.",
  );
  return envelope.data;
}

export async function endInterview(
  sessionId: string,
): Promise<InterviewDetailResponseDto> {
  const envelope = await unwrapEnvelope<
    ApiEnvelope<InterviewDetailResponseDto>
  >(
    httpClient.post(API_ROUTES.INTERVIEW.END, { sessionId }, { timeout: 90_000 }),
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
  void fetch(
    `${httpClient.defaults?.baseURL ?? ""}${API_ROUTES.INTERVIEW.END}`,
    {
      method: "POST",
      keepalive: true,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId }),
    },
  ).catch(() => {
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
