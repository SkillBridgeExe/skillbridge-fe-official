import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { GapReportDto } from "@shared/api";

/**
 * GET /api/cv-matches/:matchId/gap-report — báo cáo gap hợp nhất trên match đã
 * persist (BE #43/#49): explicit/proficiency/evidence/jd_emphasis/market gaps +
 * strengths + recommended_actions + jd_market_position. Deterministic phía BE,
 * KHÔNG tốn quota chấm (đọc từ kết quả đã lưu).
 */
export async function getGapReportApi(
  matchId: string,
  lang: "vi" | "en" = "vi",
): Promise<GapReportDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<GapReportDto>>(
    httpClient.get(API_ROUTES.CV_MATCHES.GAP_REPORT(matchId), { params: { lang } }),
    "Failed to load the gap report.",
  );
  return envelope.data;
}
