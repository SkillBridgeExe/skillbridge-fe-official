// ─── Companion Types ────────────────────────────────────────────────
// FE-only DTO types for the 4 CV Assistant / Companion endpoints.
// Source of truth: BE controllers (PR #126) + docs/FE-companion-task-AG.md.

// ── Turn-1: POST /api/cvs/:id/builder/assistant/analyze ─────────────

export interface AssistantAnalyzeRequest {
  /** Text of the field currently being edited (required, non-empty). */
  current_value: string;
  /** CV section the field belongs to. */
  section: "projects" | "experience" | "summary";
  /** Dotted path to the field, e.g. "projects[0].bullets[0]". */
  field_path?: string;
  locale: "vi" | "en";
}

export interface AssistantQuestionOption {
  id: string;
  label: string;
}

export interface AssistantQuestion {
  /** Gap category, e.g. "action" | "tech" | "result" | "role" | "strength" | "evidence". */
  gap: string;
  /** The question prompt to display. */
  prompt: string;
  /** Chip options the user can pick from. */
  options: AssistantQuestionOption[];
  /** Whether the user can also type a free-text answer. */
  allows_free_text: boolean;
}

export interface AssistantFieldPatch {
  /** Target field path, e.g. "projects[0].bullets[0]". */
  target: string;
  /** Original text (before rewrite). */
  before: string;
  /** Proposed replacement text. */
  after: string;
  /** Explanation of why the rewrite is better. */
  why: string;
}

/** Response from Turn-1 analyze. */
export interface CvAssistantTurn {
  message: string;
  questions: AssistantQuestion[];
  requires_user_confirmation: boolean;
  /** Always null at Turn-1 — don't expect a patch here. */
  field_patch: AssistantFieldPatch | null;
}

// ── Turn-2: POST /api/cvs/:id/builder/assistant/rewrite ─────────────

export interface AssistantAnswer {
  gap: string;
  /** Selected chip option id. */
  option_id?: string;
  /** Free-text or "other" detail. */
  detail?: string;
}

export interface AssistantRewriteRequest {
  before: string;
  answers: AssistantAnswer[];
  /** Target field path, e.g. "projects[0].bullets[0]". */
  target: string;
  /** "bullet" for projects/experience, "summary" for summary. */
  kind: "bullet" | "summary";
  locale: "vi" | "en";
}

export type AssistantRewriteReason =
  | "NEEDS_DETAIL"
  | "UNGROUNDED"
  | "DEGRADED";

/**
 * Response from Turn-2 rewrite. Branch on `ok` + `reason`:
 * - ok=true  → field_patch present (show diff)
 * - ok=false, NEEDS_DETAIL → re-ask for specific gap
 * - ok=false, UNGROUNDED/DEGRADED → show message, retry
 */
export interface AssistantRewriteResponse {
  ok: boolean;
  field_patch?: AssistantFieldPatch | null;
  reason?: AssistantRewriteReason;
  /** Which gap needs more detail (only when reason=NEEDS_DETAIL). */
  gap?: string;
  /** BE message to display as-is. */
  message?: string;
}

// ── Skills nudge: GET /api/cvs/:id/builder/assistant/skills-nudge ───

export interface SkillsNudgeItem {
  code: string;
  message: string;
}

// ── Next steps: GET /api/cv-matches/:matchId/next-steps ─────────────

export interface NextStepItem {
  rank: number;
  skill: string;
  canonical: string;
  status: string;
  severity: number;
  action: string;
}

export interface NextStepsResponse {
  match_id: string;
  target_role: string;
  language: string;
  steps: NextStepItem[];
}
