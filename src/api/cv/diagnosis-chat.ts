// ─── Diagnosis corner-advisor chat API ──────────────────────────────
// Client for the calm corner advisor's two-way chat. The user asks about HOW
// their CV was scored / where it's weak; the BE answers grounded in the match's
// gap-report — or, on a CV-only scan, in the CV review alone (no FE-side LLM).
//
// Two routes, same response shape:
//   POST /api/cv-matches/:matchId/chat      (JD-match path — gap-report grounded)
//   POST /api/cvs/:cvId/diagnosis-chat      (CV-only path — review grounded)
//
// Template: diagnosis-addons.ts (httpClient.post → unwrapEnvelope).

import { isAxiosError } from "axios";
import { httpClient } from "@/api/core/http-client";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { API_ROUTES } from "@/constants/api-routes";
import { CV_AI_TIMEOUT_MS } from "./upload";
import type { DiagnosisChatRequest, DiagnosisChatResponse } from "@/types/companion";

/**
 * POST to a diagnosis-chat route and unwrap the answer. Shared by both the JD-match
 * and CV-only callers.
 *
 * `unwrapEnvelope` re-throws an `ApiError` that drops the HTTP status, but the daily-cap
 * case (HTTP 429 `FEATURE_USAGE_LIMIT_REACHED`) needs a distinct, no-retry UI. We capture
 * the axios status BEFORE unwrap and re-attach it to the thrown error so the caller can
 * branch on `error.status === 429`. If the endpoint is not built yet (404/501), the promise
 * rejects — the caller surfaces a friendly "assistant is being connected" state.
 */
async function postDiagnosisChat(
  url: string,
  body: DiagnosisChatRequest,
): Promise<DiagnosisChatResponse> {
  // Capture the raw axios status FIRST (unwrapEnvelope re-throws an ApiError that
  // drops it). On any axios error we re-throw the unwrapped ApiError but tag it with
  // `status` so the caller can branch on the 429 daily-cap.
  let rawStatus: number | undefined;
  const request = httpClient
    .post(url, body, { timeout: CV_AI_TIMEOUT_MS })
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

/**
 * Ask the corner advisor a question about a CV/JD match. POST /api/cv-matches/:matchId/chat.
 */
export async function askDiagnosisChatApi(
  matchId: string,
  body: DiagnosisChatRequest,
): Promise<DiagnosisChatResponse> {
  return postDiagnosisChat(API_ROUTES.CV_MATCHES.CHAT(matchId), body);
}

/**
 * CV-only fallback: ask the corner advisor about a CV scan that has no JD match.
 * POST /api/cvs/:cvId/diagnosis-chat. The BE grounds the answer in the CV review.
 */
export async function askCvDiagnosisChatApi(
  cvId: string,
  body: DiagnosisChatRequest,
): Promise<DiagnosisChatResponse> {
  return postDiagnosisChat(API_ROUTES.CV.DIAGNOSIS_CHAT(cvId), body);
}
