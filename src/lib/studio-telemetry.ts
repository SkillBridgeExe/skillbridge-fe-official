import posthog from "posthog-js";
import { isAxiosError } from "axios";
import { ApiError } from "@/lib/api-error";

/**
 * Non-PII telemetry for Resume Studio (P5-5). Every event is built through a
 * WHITELIST: only the typed fields below can reach PostHog, so CV text,
 * contact details, image data URLs, patch text or PDF bytes cannot leak by
 * construction. Error codes are pattern-gated — prose (which may quote user
 * content) is collapsed to "unclassified".
 */
export type StudioOperation =
  | "builder_create"
  | "builder_recover"
  | "builder_save"
  | "version_save"
  | "version_restore"
  | "version_import"
  | "preview_render"
  | "pdf_download";

export type StudioOutcome = "success" | "failure";

export interface StudioEventInput {
  outcome: StudioOutcome;
  /** Low-cardinality template id (e.g. "azurill"). */
  templateId?: string;
  atsMode?: boolean;
  latencyMs?: number;
  /** Machine error code only (AiGate/BE errorCode or http_<status>) — never prose. */
  errorCode?: string;
}

export interface StudioEventProperties {
  outcome: StudioOutcome;
  template_id?: string;
  ats_mode?: boolean;
  latency_ms?: number;
  error_code?: string;
}

// Machine-code shape: letters/digits/_-.: only, short. Anything else could be
// (or quote) user content and is dropped to a constant.
const ERROR_CODE_PATTERN = /^[A-Za-z0-9_.:-]{1,80}$/;

export function sanitizeStudioErrorCode(code: string | undefined): string | undefined {
  if (code === undefined) return undefined;
  return ERROR_CODE_PATTERN.test(code) ? code : "unclassified";
}

/** Derive a machine error code from an unknown thrown value. */
export function studioErrorCode(error: unknown): string {
  if (isAxiosError(error)) return `http_${error.response?.status ?? "network"}`;
  if (error instanceof ApiError && error.errorCode) {
    return sanitizeStudioErrorCode(error.errorCode) ?? "unclassified";
  }
  if (error instanceof Error) return sanitizeStudioErrorCode(error.name) ?? "unclassified";
  return "unknown";
}

export function buildStudioEventProperties(input: StudioEventInput): StudioEventProperties {
  const properties: StudioEventProperties = { outcome: input.outcome };

  if (input.templateId !== undefined) {
    properties.template_id = sanitizeStudioErrorCode(input.templateId) ?? "unclassified";
  }
  if (input.atsMode !== undefined) properties.ats_mode = Boolean(input.atsMode);
  if (input.latencyMs !== undefined && Number.isFinite(input.latencyMs)) {
    properties.latency_ms = Math.max(0, Math.round(input.latencyMs));
  }
  if (input.errorCode !== undefined) properties.error_code = sanitizeStudioErrorCode(input.errorCode);

  return properties;
}

/** Fire-and-forget: telemetry must never break a user flow. */
export function captureStudioEvent(operation: StudioOperation, input: StudioEventInput): void {
  try {
    posthog.capture(`studio_${operation}`, buildStudioEventProperties(input));
  } catch {
    // PostHog unavailable (tests, blocked, not initialized) — drop silently.
  }
}
