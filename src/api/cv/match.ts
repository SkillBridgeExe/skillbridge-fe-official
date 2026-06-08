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
