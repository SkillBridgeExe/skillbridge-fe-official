// ─── chat-action-chips ──────────────────────────────────────────────
// Pure mapper: turn a chat answer's `cited_gap_id` into deep-link chips the
// user can click to jump to the matching gap / tailor action / roadmap
// section. Honest-empty by construction: a join miss (no matching gap) or a
// missing `citedGapId` returns [] — NEVER fabricates a target to jump to.

import type { GapItem, TailorAction } from "@shared/api";

export type ChatActionKind = "jump" | "rewrite" | "roadmap" | "prove_it" | "copy" | "view_match";

export interface CitedMatch {
  match_id: string;
  cv_id: string;
  jd_title: string | null;
}

export interface ChatActionChip {
  kind: ChatActionKind;
  labelKey: string;
  /** Jump target for existing anchored cards/sections. */
  anchorId?: string;
  /** Verified tailor rewrite action; only present for kind='rewrite'. */
  rewrite?: { action: TailorAction };
  /** Prove-it payload; only present for kind='prove_it'. */
  proveIt?: { canonical: string; displayName: string; evidenceText?: string | null };
  /** Clipboard payload; only present for kind='copy'. */
  copyText?: string;
  /** Cross-JD deep-link target (another persisted CV/JD match); only present for kind='view_match'. */
  viewMatch?: { cvId: string; matchId: string; jdTitle: string | null };
  /** CV builder chat: the proposed edit to write; only present for its rewrite chip. */
  cvEdit?: { field_path: string; before: string; after: string };
}

export function canOpenTailorRewrite(action: TailorAction | null | undefined): action is TailorAction {
  if (!action?.rewrite_eligible || !action.action_id) return false;
  return action.action_type === "emphasize" || (action.action_type === "deepen_wording" && Boolean(action.before));
}

export function buildChatActionChips(input: {
  citedGapId?: string;
  /** Another persisted match the answer cited (cross-JD comparison) — honest-empty if absent. */
  citedMatch?: CitedMatch;
  gapItems: GapItem[] | undefined;
  actions: TailorAction[] | undefined;
}): ChatActionChip[] {
  const out: ChatActionChip[] = [];

  // Cross-JD deep-link chip — independent of the gap citation below (a single
  // answer can cite another match without citing a specific gap, or vice versa).
  if (input.citedMatch) {
    out.push({
      kind: "view_match",
      labelKey: "companion.chat.chipViewMatch",
      viewMatch: {
        cvId: input.citedMatch.cv_id,
        matchId: input.citedMatch.match_id,
        jdTitle: input.citedMatch.jd_title,
      },
    });
  }

  if (!input.citedGapId) return out;
  const gap = (input.gapItems ?? []).find((g) => g.requirement_id === input.citedGapId);
  if (!gap) return out; // join miss → no chip (honest)

  out.push({ kind: "jump", labelKey: "companion.chat.chipViewGap", anchorId: `gap-${gap.requirement_id}` });

  const action = (input.actions ?? []).find(
    (a) => a.requirement_id === gap.requirement_id || a.skill_canonical === gap.canonical_name,
  );
  const actionId = action?.action_id;
  if (gap.fixability === "rewrite" && action?.rewrite_eligible && actionId) {
    if (canOpenTailorRewrite(action)) {
      out.push({ kind: "rewrite", labelKey: "companion.chat.chipRewriteHere", rewrite: { action } });
    } else {
      out.push({ kind: "jump", labelKey: "companion.chat.chipRewrite", anchorId: `tailor-${actionId}` });
    }
  }

  if (gap.fixability === "add_evidence") {
    const evidenceText = gap.evidence?.[0]?.quote ?? null;
    out.push({
      kind: "prove_it",
      labelKey: "companion.chat.proveitCta",
      proveIt: {
        canonical: gap.canonical_name, 
        displayName: gap.display_name,
        ...(evidenceText ? { evidenceText } : {}),
      },
    });
  }

  if (gap.fixability === "learn") {
    out.push({ kind: "roadmap", labelKey: "companion.chat.chipRoadmap" });
  }

  return out;
}
