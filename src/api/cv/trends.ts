import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { SkillGapResponse } from "@shared/api";

export interface SkillGapQuery {
  /** Role code, mặc định 'all'. */
  role?: string;
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
