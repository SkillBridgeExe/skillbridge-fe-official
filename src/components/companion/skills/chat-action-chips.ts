// ─── chat-action-chips ──────────────────────────────────────────────
// Pure mapper: turn a chat answer's `cited_gap_id` into deep-link chips the
// user can click to jump to the matching gap / tailor action / roadmap
// section. Honest-empty by construction: a join miss (no matching gap) or a
// missing `citedGapId` returns [] — NEVER fabricates a target to jump to.

import type { GapItem, TailorAction } from "@shared/api";

export interface ChatActionChip {
  labelKey: string;
  anchorId: string;
}

export function buildChatActionChips(input: {
  citedGapId?: string;
  gapItems: GapItem[] | undefined;
  actions: TailorAction[] | undefined;
}): ChatActionChip[] {
  const out: ChatActionChip[] = [];
  if (!input.citedGapId) return out;
  const gap = (input.gapItems ?? []).find((g) => g.requirement_id === input.citedGapId);
  if (!gap) return out; // join miss → no chip (honest)

  out.push({ labelKey: "companion.chat.chipViewGap", anchorId: `gap-${gap.requirement_id}` });

  const action = (input.actions ?? []).find(
    (a) => a.requirement_id === gap.requirement_id || a.skill_canonical === gap.canonical_name,
  );
  if (action?.rewrite_eligible && action.action_id) {
    out.push({ labelKey: "companion.chat.chipRewrite", anchorId: `tailor-${action.action_id}` });
  }

  if (gap.fixability === "learn") {
    out.push({ labelKey: "companion.chat.chipRoadmap", anchorId: "roadmap-anchor" });
  }

  return out;
}
