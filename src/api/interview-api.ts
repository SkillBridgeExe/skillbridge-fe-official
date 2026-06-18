import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";

const QUESTION_AUDIO_TIMEOUT_MS = 60_000;

export type PlatformInterviewMode = "TEXT" | "VOICE" | "HYBRID";
export type PlatformInterviewType = "HR" | "TECHNICAL" | "MIXED";
export type PlatformInterviewStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PlatformInterviewLanguage = "vi" | "en";
export type PlatformInterviewModality = "TEXT" | "AUDIO";
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

export interface InterviewSessionDto {
  id: string;
  cvId: string | null;
  cvMatchId: string | null;
  jobDescriptionId: string | null;
  targetRole: string;
  language: PlatformInterviewLanguage | string;
  mode: PlatformInterviewMode;
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
  voice?: PlatformInterviewVoice;
  speechSpeed?: number;
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
  const params: InterviewHistoryQuery = {
    page: query.page ?? 1,
    limit: query.limit ?? 10,
  };
  const envelope = await unwrapEnvelope<ApiEnvelope<InterviewHistoryResponse>>(
    httpClient.get(API_ROUTES.INTERVIEW.HISTORY, { params }),
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
    throw new Error(`Question audio endpoint returned ${type} instead of playable audio.`);
  }

  const parsed = parseJson(text);
  const serializedAudio = parsed ? readSerializedAudioBlob(parsed) : null;
  if (serializedAudio) return serializedAudio;

  const backendMessage = parsed ? readMessage(parsed) : text.trim().slice(0, 300);
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
    isRecord(options) && typeof options.type === "string" && options.type.startsWith("audio/")
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
  if (!bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
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
