import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";

export type PlatformInterviewMode = "TEXT" | "VOICE" | "HYBRID";
export type PlatformInterviewType = "HR" | "TECHNICAL" | "MIXED";
export type PlatformInterviewStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PlatformInterviewLanguage = "vi" | "en";
export type PlatformInterviewModality = "TEXT" | "AUDIO";

export interface RealtimeClientSecretDto {
  enabled: boolean;
  provider: "openai";
  model: string | null;
  clientSecret: string | null;
  expiresAt: string | null;
  reason?: string;
}

export interface InterviewSessionDto {
  id: string;
  cvId: string | null;
  cvMatchId: string | null;
  jobDescriptionId: string | null;
  targetRole: string;
  language: PlatformInterviewLanguage | string;
  mode: PlatformInterviewMode;
  interviewType: PlatformInterviewType;
  status: PlatformInterviewStatus | string;
  totalQuestionsPlanned: number | null;
  maxDurationSeconds: number;
  expiresAt: string | null;
  overallScore: number | null;
  semanticScore: number | null;
  llmScore: number | null;
  communicationScore: number | null;
  aiFeedback: InterviewFeedback | null;
  durationSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface InterviewTurnDto {
  id: string;
  sessionId: string;
  turnOrder: number;
  phase: string | null;
  modality: PlatformInterviewModality;
  aiRequestId: string | null;
  interviewerMessage: string | null;
  interviewerQuestion: string;
  userAnswerText: string | null;
  userAnswerTranscript: string | null;
  perQuestionScore: number | null;
  strengths: string[] | unknown;
  improvements: string[] | unknown;
  askedAt: string;
  answeredAt: string | null;
  durationSeconds: number | null;
}

export interface InterviewFeedback {
  summary?: string;
  technical_delivery?: Record<string, number>;
  communication_flow?: Record<string, number>;
  body_language?: Record<string, number> | null;
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
  interviewType?: PlatformInterviewType;
}

export interface StartInterviewResponseDto extends InterviewSessionDto {
  firstMessage: string;
  firstQuestion: string;
  phase: string | null;
  realtime: RealtimeClientSecretDto;
}

export interface SubmitInterviewTurnRequest {
  sessionId: string;
  userAnswer: string;
  userTranscript?: string;
  modality?: PlatformInterviewModality;
  durationSeconds?: number;
}

export interface AnswerInterviewResponseDto {
  session: InterviewSessionDto;
  answeredTurn: InterviewTurnDto;
  nextTurn: InterviewTurnDto | null;
  aiMessage: string;
  nextQuestion: string | null;
  finished: boolean;
}

export interface InterviewDetailResponseDto extends InterviewSessionDto {
  turns: InterviewTurnDto[];
}

export interface InterviewHistoryQuery {
  page?: number;
  limit?: number;
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
  const envelope = await unwrapEnvelope<ApiEnvelope<AnswerInterviewResponseDto>>(
    httpClient.post(API_ROUTES.INTERVIEW.TURN, payload),
    "Failed to submit interview answer.",
  );
  return envelope.data;
}

export async function endInterview(sessionId: string): Promise<InterviewDetailResponseDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<InterviewDetailResponseDto>>(
    httpClient.post(API_ROUTES.INTERVIEW.END, { sessionId }),
    "Failed to end interview.",
  );
  return envelope.data;
}

export async function getInterviewHistory(
  query: InterviewHistoryQuery = {},
): Promise<InterviewHistoryResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<InterviewHistoryResponse>>(
    httpClient.get(API_ROUTES.INTERVIEW.HISTORY, { params: query }),
    "Failed to load interview history.",
  );
  return envelope.data;
}

export async function getInterviewDetail(id: string): Promise<InterviewDetailResponseDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<InterviewDetailResponseDto>>(
    httpClient.get(API_ROUTES.INTERVIEW.DETAIL(id)),
    "Failed to load interview detail.",
  );
  return envelope.data;
}

export async function refreshRealtimeToken(id: string): Promise<RealtimeClientSecretDto> {
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
    { responseType: "blob" },
  );
  return response.data;
}
