import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { NextStepsResponse } from "@/types/companion";

/**
 * GET /api/cv-matches/:matchId/next-steps — "bước tiếp theo" ưu tiên theo gap thật.
 * Deterministic (KHÔNG LLM, KHÔNG quota). steps:[] = CV đã đủ mạnh.
 */
export async function getNextStepsApi(
  matchId: string,
  lang: "vi" | "en" = "vi",
): Promise<NextStepsResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<NextStepsResponse>>(
    httpClient.get(API_ROUTES.CV_MATCHES.NEXT_STEPS(matchId), {
      params: { lang },
      timeout: 15_000,
    }),
    "Failed to fetch next steps.",
  );
  return envelope.data;
}
