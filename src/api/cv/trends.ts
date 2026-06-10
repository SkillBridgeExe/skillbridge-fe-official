import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { SkillGapResponse, TrendsInsightResponse } from "@shared/api";

export interface SkillGapQuery {
  /** Role code, mặc định 'all'. */
  role?: string;
  limit?: number;
}

export interface TrendsInsightQuery {
  cvId: string;
  role?: string | null;
  limit?: number;
}

/** GET /api/trends/skills/gap/:cvId — kỹ năng thị trường cần mà CV thiếu (theo role). */
export async function getSkillGapApi(
  cvId: string,
  query: SkillGapQuery = {},
): Promise<SkillGapResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<SkillGapResponse>>(
    httpClient.get(API_ROUTES.TRENDS.SKILL_GAP(cvId), { params: query }),
    "Failed to load the skill gap trends.",
  );
  return envelope.data;
}

/** GET /api/trends/insight — AI market insight for the analyzed CV. */
export async function getTrendsInsightApi({
  cvId,
  role,
  limit,
}: TrendsInsightQuery): Promise<TrendsInsightResponse> {
  const params = {
    cv_id: cvId,
    ...(role ? { role } : {}),
    ...(limit ? { limit } : {}),
  };
  const envelope = await unwrapEnvelope<ApiEnvelope<TrendsInsightResponse>>(
    httpClient.get(API_ROUTES.TRENDS.INSIGHT, { params }),
    "Failed to load the trends insight.",
  );
  return envelope.data;
}
