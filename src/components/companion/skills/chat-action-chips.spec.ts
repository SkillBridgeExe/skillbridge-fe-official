import { describe, expect, it } from "vitest";
import { buildChatActionChips } from "./chat-action-chips";
import type { GapItem, TailorAction } from "@shared/api";

function mkGap(overrides: Partial<GapItem> = {}): GapItem {
  return {
    requirement_id: "req-1",
    source: "jd",
    type: "hard_skill",
    canonical_name: "react",
    display_name: "React",
    importance: "REQUIRED",
    cv_status: "missing",
    cv_level: null,
    required_level: 3,
    gap_levels: 3,
    satisfied_by: null,
    evidence_refs: [],
    evidence_risk: "unproven",
    fixability: "rewrite",
    market_demand: 0.8,
    severity: 0.7,
    confidence: 0.9,
    recommended_next_action: "add react evidence",
    ...overrides,
  };
}

function mkAction(overrides: Partial<TailorAction> = {}): TailorAction {
  return {
    action_type: "add_evidence",
    skill_canonical: "react",
    display_name: "React",
    why: "JD requires React",
    rewrite_eligible: true,
    anchor: null,
    jd_importance: "REQUIRED",
    jd_count: 5,
    cv_count: 0,
    action_id: "add_evidence:react",
    requirement_id: "req-1",
    ...overrides,
  };
}

describe("buildChatActionChips", () => {
  it("returns view-gap + rewrite chips when the cited gap and a rewrite-eligible action both match", () => {
    const chips = buildChatActionChips({
      citedGapId: "req-1",
      gapItems: [mkGap()],
      actions: [mkAction()],
    });
    expect(chips).toEqual([
      { labelKey: "companion.chat.chipViewGap", anchorId: "gap-req-1" },
      { labelKey: "companion.chat.chipRewrite", anchorId: "tailor-add_evidence:react" },
    ]);
  });

  it("returns [] on a join miss (citedGapId doesn't match any gap item — honest, never fabricates)", () => {
    const chips = buildChatActionChips({
      citedGapId: "req-does-not-exist",
      gapItems: [mkGap()],
      actions: [mkAction()],
    });
    expect(chips).toEqual([]);
  });

  it("returns [] when citedGapId is absent (the answer wasn't about a specific gap)", () => {
    const chips = buildChatActionChips({
      citedGapId: undefined,
      gapItems: [mkGap()],
      actions: [mkAction()],
    });
    expect(chips).toEqual([]);
  });

  it("adds the roadmap chip (no rewrite chip) when the gap's fixability is 'learn'", () => {
    const chips = buildChatActionChips({
      citedGapId: "req-1",
      gapItems: [mkGap({ fixability: "learn" })],
      actions: [],
    });
    expect(chips).toEqual([
      { labelKey: "companion.chat.chipViewGap", anchorId: "gap-req-1" },
      { labelKey: "companion.chat.chipRoadmap", anchorId: "roadmap-anchor" },
    ]);
  });
});
