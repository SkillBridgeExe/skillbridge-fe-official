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
