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
  /**
   * Optional action-chip intent. Prevents explicit user actions such as
   * "add evidence" from degrading into a generic "already strong" no-op.
   */
  requested_action?: "analyze" | "add_evidence" | "make_ats_friendly" | "turn_into_impact";
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
  output_lang?: "vi" | "en";
  /**
   * Task M4 — set ONLY when the user clicks "Viết lại nhẹ hơn" on an already-presented
   * patch (re-fires the SAME answers/target, asking BE for a gentler tone).
   * Requires a BE DTO that declares the field because the API rejects unknown properties.
   */
  tone?: "softer";
  /** Action-chip rewrite intent. BE may rewrite safely or return NEEDS_DETAIL. */
  intent?: "improve" | "shorten" | "make_ats_friendly" | "turn_into_impact" | "add_evidence";
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

export type AssistantExplanation = {
  type: "explanation";
  message: string;
  citedSignals: Array<
    | "missing_action"
    | "missing_role"
    | "missing_tech"
    | "missing_result"
    | "weak_evidence"
    | "ats_readability"
  >;
} | null;

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

// ── Diagnosis corner-advisor chat: POST /api/cv-matches/:matchId/chat ─
// The calm corner advisor: the user drives a two-way chat about HOW their CV
// was scored / where it's weak. The BE answer endpoint is built separately;
// these client-side types let the FE wire the call + graceful states now.

/**
 * Which diagnosis section the user is currently viewing — TAB-level granularity.
 * Step 2 (DiagnosisStep2Review) has 3 tabs (CV Audit / Skills Analysis /
 * Market & Careers); Step 3 (DiagnosisStep3Results) is a single Skill-Gap section.
 * Passed to the BE so it can EMPHASIZE that section in the answer — it does NOT
 * change the FACTS, only what to foreground.
 */
export type DiagnosisChatFocus =
  | "cv_audit"
  | "skills_analysis"
  | "market_careers"
  | "gap_results";

export interface DiagnosisChatRequest {
  /** The user's question (required, non-empty). */
  question: string;
  /** CV-only fallback when there is no JD match id. */
  cvId?: string;
  /** Section the user is viewing → BE biases the answer's emphasis (not the facts). */
  focus?: DiagnosisChatFocus;
  /** "vi" | "en" — answer language. */
  language?: string;
}

export interface DiagnosisChatResponse {
  /** The grounded answer text to show in the thread. */
  answer: string;
  /** If the answer is about a score dimension, its key (e.g. "skills_relevance") → scroll `dim-{key}`. */
  cited_dimension?: string;
  /** If the answer is about a specific gap, its id → scroll `gap-{id}`. */
  cited_gap_id?: string;
  /** If the answer used a verified tool result, show a small provenance chip in the chat bubble. */
  cited_tool?: "github.enrich" | "resource.validate" | string;
  /** Optional suggested follow-up step. */
  suggested_next_step?: string | null;
  /** If the answer references ANOTHER persisted match (cross-JD comparison), its id + owning CV so the
   * FE can offer a deep-link chip. Absent when the answer isn't about another match (honest-empty). */
  cited_match?: {
    match_id: string;
    cv_id: string;
    jd_title: string | null;
  };
}

// ── CV Intake: POST /api/cvs/:id/builder/assistant/extract ──────────

export interface ExtractRequest {
  section: "experience";
  narrative: string;
  locale: "vi" | "en";
  output_lang: "vi" | "en";
}

export interface ExtractedField<T = string> {
  value: T;
  found: boolean;
  confidence: "high" | "low";
  source_span: string;
}

export interface ExtractResponse {
  fields: {
    company: ExtractedField<string>;
    position: ExtractedField<string>;
    start: ExtractedField<string>;
    end: ExtractedField<string>;
    description: ExtractedField<string[]>;
    achievements: ExtractedField<string[]>;
  };
  missing: string[];
  degraded?: boolean;
}

