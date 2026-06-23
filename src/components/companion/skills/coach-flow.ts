// ─── coach-flow.ts ───────────────────────────────────────────────
// Pure, deterministic coaching funnel for Diagnosis Companion Pillar 3
// (Phase 2, Task 2.1). NO LLM — code owns the next question; every string
// is an i18n KEY (added to locale files later), never literal user text.
//
// Anti-fabrication is the spine:
//  - CHOICE options are CATEGORY keys (scaffolding that routes the NEXT
//    question), NEVER fabricated specific bullets. The user still supplies
//    every real fact; picking a category asserts nothing false.
//  - The funnel has a REAL terminal honest-stop turn: genuinely nothing to
//    add → stop, leave blank, never invent content.

export interface CoachTurn {
  kind: "open" | "choice";
  /** i18n key for the coaching prompt — never literal user-facing text. */
  promptKey: string;
  /** Present only for CHOICE turns; each is a CATEGORY (anti-fab scaffolding). */
  options?: Array<{ key: string; labelKey: string }>;
}

/** Which dead-end routed the user into the coaching loop. */
export type CoachTrigger = "degraded" | "needs_detail" | "gate";

export interface CoachContext {
  trigger: CoachTrigger;
  /** The known gap the upstream signal reported (e.g. "result" / "role"), if any. */
  gap?: string | null;
  /** Funnel position: 0 = un-freeze, growing as the conversation deepens. */
  step: number;
}

const KEY_PREFIX = "companion.coach";

// CATEGORY banks — i18n keys only. These route/tag the NEXT question; they are
// scaffolding, NOT content. Each ends with an explicit "other" escape hatch so
// the user is never forced into a category that doesn't fit (and never nudged
// toward a fabricated specific).
const IMPACT_CATEGORIES = ["saved_time", "increased_revenue", "improved_quality", "reduced_cost"] as const;
const ROLE_CATEGORIES = ["frontend", "backend", "fullstack", "data", "devops"] as const;

const choice = (promptSuffix: string, categories: readonly string[], group: string): CoachTurn => ({
  kind: "choice",
  promptKey: `${KEY_PREFIX}.${promptSuffix}`,
  options: [
    ...categories.map((c) => ({ key: c, labelKey: `${KEY_PREFIX}.options.${group}.${c}` })),
    { key: "other", labelKey: `${KEY_PREFIX}.options.other` },
  ],
});

const open = (promptSuffix: string): CoachTurn => ({
  kind: "open",
  promptKey: `${KEY_PREFIX}.${promptSuffix}`,
});

// A funnel can run for several turns before it honestly stops. Past this depth
// we surface the terminal honest-stop (leave blank, nothing more to add).
const TERMINAL_STEP = 4;

/**
 * Return the next coaching turn (deterministic, i18n keys only).
 *
 * The funnel, broad → specific → honest stop:
 *  - step 0  → OPEN un-freeze ("what did you do day-to-day?") — ALWAYS open,
 *              even with a known gap, to get the user talking first.
 *  - gap with a known category bank → CHOICE (lower cognitive load):
 *      gap="result" → impact-type categories · gap="role" → role-type categories.
 *      Options are CATEGORIES + an "other" escape hatch (anti-fab).
 *  - unknown / no gap (past step 0) → OPEN STAR probe.
 *  - past the funnel depth → terminal honest-stop OPEN ("nothing to add? leave blank").
 */
export function nextCoachTurn(ctx: CoachContext): CoachTurn {
  // Un-freeze first, always — get the user talking before narrowing.
  if (ctx.step <= 0) {
    return open("openDayToDay");
  }

  // Honest terminal: deep in the funnel, genuinely nothing left to elicit.
  if (ctx.step >= TERMINAL_STEP) {
    return open("terminalStop");
  }

  // Gap with a known category bank → CHOICE scaffolding (categories only).
  switch (ctx.gap) {
    case "result":
      return choice("pickImpactType", IMPACT_CATEGORIES, "impact");
    case "role":
      return choice("pickRoleType", ROLE_CATEGORIES, "role");
    default:
      // Unknown gap (or none) → OPEN STAR probe (situation/task/action/result).
      return open("starProbe");
  }
}
