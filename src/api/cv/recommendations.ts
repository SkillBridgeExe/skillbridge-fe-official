import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { JobRecommendationsResponse } from "@shared/api";

export interface JobRecommendationsQuery {
  limit?: number;
  /** Role code filter; BE mặc định theo targetRole của CV. */
  role?: string;
}

/**
 * GET /api/cvs/:cvId/job-recommendations — top job thật cho CV
 * (hybrid skill-match + embedding, RRF-fused). pool_size=0 → pool chưa có
 * data cho role này, UI hiển thị empty-state.
 */
export async function getJobRecommendationsApi(
  cvId: string,
  query: JobRecommendationsQuery = {},
): Promise<JobRecommendationsResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobRecommendationsResponse>>(
    httpClient.get(API_ROUTES.CV.JOB_RECOMMENDATIONS(cvId), { params: query }),
    "Failed to load job recommendations.",
  );
  return envelope.data;
}
