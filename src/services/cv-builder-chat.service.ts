// ─── CV Builder Chat Companion Service ──────────────────────────────
// Thin FE service for the builder's free-form chat companion (Slice 5).
// POST = ask, GET = restore thread, DELETE = clear thread — all keyed
// by cvId. The BE contract is POST /api/cvs/:cvId/builder/chat etc.

import { isAxiosError } from "axios";
import { httpClient } from "@/api/core/http-client";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { API_ROUTES } from "@/constants/api-routes";
import { CV_AI_TIMEOUT_MS } from "@/api/cv/upload";
import { getApiErrorCode } from "@/lib/api-error";

// ── Request / response types (inline — do NOT touch shared/) ────────

export interface CvBuilderChatRequest {
  question: string;
  focused_field?: {
    field_path: string;
    current_value: string;
  };
  language?: string;
  /** The diagnosed CV this draft was cloned from — a POINTER so the BE can read the parent CV's scan
   *  findings when this fresh draft has none of its own. Sent from useCvBuilderStore.diagnosisSourceCvId. */
  source_cv_id?: string;
}

export interface CvBuilderChatProposedEdit {
  field_path: string;
  before: string;
  after: string;
}

export interface CvBuilderChatGroundedFact {
  kind: "original_bullet" | "detected_gap" | "user_answer";
  text: string;
  field_path?: string;
}

export interface CvBuilderChatKnownState {
  target_role: string | null;
  active_field_path: string | null;
  answered_gaps: string[];
}

export interface CvBuilderChatResponse {
  answer: string;
  answer_kind: "grounded" | "refusal" | "canned";
  proposed_edit: CvBuilderChatProposedEdit | null;
  grounded_facts: CvBuilderChatGroundedFact[];
  known_state: CvBuilderChatKnownState;
  suggested_next_step: string | null;
}

export interface CvBuilderChatTurn {
  role: "user" | "assistant";
  text: string;
  ts: string;
}

export interface CvBuilderChatThreadResponse {
  turns: CvBuilderChatTurn[];
  known_state: CvBuilderChatKnownState;
}

// ── API callers ─────────────────────────────────────────────────────

/** POST /api/cvs/:cvId/builder/chat — send a question. */
export async function postBuilderChatApi(
  cvId: string,
  body: CvBuilderChatRequest,
): Promise<CvBuilderChatResponse> {
  let rawStatus: number | undefined;
  const request = httpClient
    .post(API_ROUTES.CV.BUILDER_CHAT(cvId), body, { timeout: CV_AI_TIMEOUT_MS })
    .catch((error: unknown) => {
      if (isAxiosError(error)) rawStatus = error.response?.status;
      throw error;
    });

  try {
    const envelope = await unwrapEnvelope<ApiEnvelope<CvBuilderChatResponse>>(
      request,
      "Failed to reach the builder chat assistant.",
    );
    return envelope.data;
  } catch (error) {
    if (rawStatus && error && typeof error === "object") {
      (error as { status?: number }).status = rawStatus;
    }
    throw error;
  }
}

/** GET /api/cvs/:cvId/builder/chat — restore persisted thread. */
export async function getBuilderChatThreadApi(
  cvId: string,
): Promise<CvBuilderChatThreadResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvBuilderChatThreadResponse>>(
    httpClient.get(API_ROUTES.CV.BUILDER_CHAT(cvId), { timeout: 15_000 }),
    "Failed to fetch the builder chat thread.",
  );
  return envelope.data;
}

/** DELETE /api/cvs/:cvId/builder/chat — clear the thread. */
export async function deleteBuilderChatThreadApi(
  cvId: string,
): Promise<void> {
  await unwrapEnvelope<ApiEnvelope<unknown>>(
    httpClient.delete(API_ROUTES.CV.BUILDER_CHAT(cvId), { timeout: 15_000 }),
    "Failed to erase the builder chat thread.",
  );
}

/** Is this axios/Api error the BE's daily-cap 429? Mirrors diagnosis hook. */
export function isDailyLimitError(error: unknown): boolean {
  if (isAxiosError(error) && error.response?.status === 429) return true;
  if (
    typeof error === "object" &&
    error !== null &&
    (error as { status?: number }).status === 429
  ) {
    return true;
  }
  return getApiErrorCode(error) === "FEATURE_USAGE_LIMIT_REACHED";
}
