import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { ProgressReportDto } from "@shared/api";

/**
 * GET /api/cv-matches/:matchId/progress — match progress report.
 * Deterministic (KHÔNG LLM, KHÔNG quota). Compares baseline vs current gap states.
 */
export async function getMatchProgressApi(matchId: string): Promise<ProgressReportDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<ProgressReportDto>>(
    httpClient.get(API_ROUTES.CV_MATCHES.PROGRESS(matchId), { timeout: 15_000 }),
    "Failed to fetch match progress.",
  );
  return envelope.data;
}
