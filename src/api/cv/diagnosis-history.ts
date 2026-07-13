import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import type { CvListQuery } from "@/api/cv/list";
import { API_ROUTES } from "@/constants/api-routes";
import type { CvListItemDto, Paginated } from "@shared/api";

export type DiagnosisHistoryQuery = Pick<CvListQuery, "page" | "limit">;

/** GET /api/diagnosis/history — uploaded CV diagnosis history only. */
export async function getDiagnosisHistoryApi(
  query: DiagnosisHistoryQuery = {},
): Promise<Paginated<CvListItemDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Paginated<CvListItemDto>>>(
    httpClient.get(API_ROUTES.DIAGNOSIS.HISTORY, { params: query }),
    "Failed to load your diagnosis history.",
  );
  return envelope.data;
}
