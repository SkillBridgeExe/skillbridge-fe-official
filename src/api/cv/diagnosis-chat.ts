// ─── Diagnosis corner-advisor chat API ──────────────────────────────
// Client for the calm corner advisor's two-way chat. The user asks about HOW
// their CV was scored / where it's weak; the BE answers grounded in the match's
// gap-report (no FE-side LLM). The BE endpoint is built SEPARATELY — this client
// is ready so the UI can wire the call + graceful no-endpoint states today.
//
// Template: diagnosis-addons.ts (httpClient.post → unwrapEnvelope).

import { isAxiosError } from "axios";
import { httpClient } from "@/api/core/http-client";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { API_ROUTES } from "@/constants/api-routes";
import { CV_AI_TIMEOUT_MS } from "./upload";
import type { DiagnosisChatRequest, DiagnosisChatResponse } from "@/types/companion";

/**
 * Ask the corner advisor a question about a CV/JD match. POST /api/cv-matches/:matchId/chat.
 * If the endpoint is not built yet (404/501), the promise rejects — the caller surfaces a
 * friendly "assistant is being connected" state rather than crashing.
 *
 * `unwrapEnvelope` re-throws an `ApiError` that drops the HTTP status, but the daily-cap
 * case (HTTP 429 `FEATURE_USAGE_LIMIT_REACHED`) needs a distinct, no-retry UI. We capture
 * the axios status BEFORE unwrap and re-attach it to the thrown error so the caller can
 * branch on `error.status === 429`.
 */
export async function askDiagnosisChatApi(
  matchId: string,
  body: DiagnosisChatRequest,
): Promise<DiagnosisChatResponse> {
  // Capture the raw axios status FIRST (unwrapEnvelope re-throws an ApiError that
  // drops it). On any axios error we re-throw the unwrapped ApiError but tag it with
  // `status` so the caller can branch on the 429 daily-cap.
  let rawStatus: number | undefined;
  const request = httpClient
    .post(API_ROUTES.CV_MATCHES.CHAT(matchId), body, { timeout: CV_AI_TIMEOUT_MS })
    .catch((error: unknown) => {
      if (isAxiosError(error)) rawStatus = error.response?.status;
      throw error;
    });

  try {
    const envelope = await unwrapEnvelope<ApiEnvelope<DiagnosisChatResponse>>(
      request,
      "Failed to reach the diagnosis assistant.",
    );
    return envelope.data;
  } catch (error) {
    if (rawStatus && error && typeof error === "object") {
      (error as { status?: number }).status = rawStatus;
    }
    throw error;
  }
}
