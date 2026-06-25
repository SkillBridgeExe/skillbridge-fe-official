import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { CvMatchDto } from "@shared/api";
import { CV_AI_TIMEOUT_MS } from "./upload";

export interface MatchCvWithJdInput {
  /** Raw JD text (paste mode). */
  jdText: string;
  /** Tiêu đề JD, tối đa 160 ký tự. */
  title?: string;
  /** Role code; BE fallback sang targetRole của CV nếu bỏ trống. */
  targetRole?: string;
}

export interface MatchCvWithJdFileInput {
  /** JD file upload. Supported by the backend: TXT, PDF, DOCX. */
  file: File;
  /** Optional JD title. Defaults to the uploaded file name on the backend. */
  title?: string;
  /** Role code; the backend falls back to the CV target role when omitted. */
  targetRole?: string;
}

export interface CvMatchListQuery {
  page?: number;
  limit?: number;
}

export interface CvMatchListResponse {
  items: CvMatchDto[];
  total: number;
  page: number;
  limit: number;
}

/** POST /api/cvs/:cvId/match — diff CV × JD (deterministic, kết quả trong parsedResponse). */
export async function matchCvWithJdApi(
  cvId: string,
  input: MatchCvWithJdInput,
): Promise<CvMatchDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvMatchDto>>(
    httpClient.post(API_ROUTES.CV.MATCH(cvId), input, { timeout: CV_AI_TIMEOUT_MS }),
    "Failed to match the CV with the job description.",
  );
  return envelope.data;
}

/** POST /api/cvs/:cvId/match/file - upload JD file and persist CV/JD match. */
export async function matchCvWithJdFileApi(
  cvId: string,
  { file, title, targetRole }: MatchCvWithJdFileInput,
): Promise<CvMatchDto> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  if (targetRole) formData.append("targetRole", targetRole);

  const envelope = await unwrapEnvelope<ApiEnvelope<CvMatchDto>>(
    httpClient.post(API_ROUTES.CV.MATCH_FILE(cvId), formData, {
      timeout: CV_AI_TIMEOUT_MS,
      headers: { "Content-Type": "multipart/form-data" },
    }),
    "Failed to match the CV with the job description file.",
  );
  return envelope.data;
}

/** GET /api/cvs/:cvId/matches - persisted CV/JD match history for interview setup. */
export async function getCvMatchesApi(
  cvId: string,
  query: CvMatchListQuery = {},
): Promise<CvMatchListResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvMatchListResponse>>(
    httpClient.get(API_ROUTES.CV.MATCHES(cvId), { params: query }),
    "Failed to load CV match history.",
  );
  return envelope.data;
}

/** GET /api/cvs/:cvId/matches/:matchId - one persisted match. */
export async function getCvMatchDetailApi(cvId: string, matchId: string): Promise<CvMatchDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvMatchDto>>(
    httpClient.get(API_ROUTES.CV.MATCH_DETAIL(cvId, matchId)),
    "Failed to load the CV match.",
  );
  return envelope.data;
}
