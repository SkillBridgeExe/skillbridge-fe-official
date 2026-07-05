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
    action_type: "deepen_wording",
    skill_canonical: "react",
    display_name: "React",
    why: "JD requires React",
    rewrite_eligible: true,
    anchor: null,
    jd_importance: "REQUIRED",
    jd_count: 5,
    cv_count: 0,
    action_id: "deepen_wording:react",
    requirement_id: "req-1",
    before: "Built React UI for booking flow.",
    ...overrides,
  };
}

describe("buildChatActionChips", () => {
  it("returns view-gap + in-chat rewrite chips when the cited gap and a verified rewrite action both match", () => {
    const chips = buildChatActionChips({
      citedGapId: "req-1",
      gapItems: [mkGap()],
      actions: [mkAction()],
    });
    expect(chips).toEqual([
      { kind: "jump", labelKey: "companion.chat.chipViewGap", anchorId: "gap-req-1" },
      { kind: "rewrite", labelKey: "companion.chat.chipRewriteHere", rewrite: { action: mkAction() } },
    ]);
  });

  it("falls back to a tailor jump when a deepen action lacks the verified before anchor", () => {
    const chips = buildChatActionChips({
      citedGapId: "req-1",
      gapItems: [mkGap()],
      actions: [mkAction({ before: null })],
    });
    expect(chips).toEqual([
      { kind: "jump", labelKey: "companion.chat.chipViewGap", anchorId: "gap-req-1" },
      { kind: "jump", labelKey: "companion.chat.chipRewrite", anchorId: "tailor-deepen_wording:react" },
    ]);
  });

  it("maps add_evidence gaps to the prove-it builder bridge instead of a rewrite CTA", () => {
    const chips = buildChatActionChips({
      citedGapId: "req-1",
      gapItems: [mkGap({ fixability: "add_evidence" })],
      actions: [mkAction({ action_type: "add_evidence", action_id: "add_evidence:react" })],
    });
    expect(chips).toEqual([
      { kind: "jump", labelKey: "companion.chat.chipViewGap", anchorId: "gap-req-1" },
      {
        kind: "prove_it",
        labelKey: "companion.chat.proveitCta",
        proveIt: { canonical: "react", displayName: "React" },
      },
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
      { kind: "jump", labelKey: "companion.chat.chipViewGap", anchorId: "gap-req-1" },
      { kind: "roadmap", labelKey: "companion.chat.chipRoadmap" },
    ]);
  });

  it("does not create action CTAs for not_fixable_now gaps", () => {
    const chips = buildChatActionChips({
      citedGapId: "req-1",
      gapItems: [mkGap({ fixability: "not_fixable_now" })],
      actions: [mkAction()],
    });
    expect(chips).toEqual([
      { kind: "jump", labelKey: "companion.chat.chipViewGap", anchorId: "gap-req-1" },
    ]);
  });

  it("adds a view_match chip when the answer cites another persisted match (no gap citation needed)", () => {
    const chips = buildChatActionChips({
      citedMatch: { match_id: "match-2", cv_id: "cv-2", jd_title: "Backend Engineer" },
      gapItems: [],
      actions: [],
    });
    expect(chips).toEqual([
      {
        kind: "view_match",
        labelKey: "companion.chat.chipViewMatch",
        viewMatch: { cvId: "cv-2", matchId: "match-2", jdTitle: "Backend Engineer" },
      },
    ]);
  });

  it("returns [] when citedMatch is absent (honest-empty — the answer wasn't about another match)", () => {
    const chips = buildChatActionChips({
      citedMatch: undefined,
      gapItems: [mkGap()],
      actions: [mkAction()],
    });
    expect(chips).toEqual([]);
  });

  it("combines the view_match chip with a cited gap's chips when the answer cites both", () => {
    const chips = buildChatActionChips({
      citedGapId: "req-1",
      citedMatch: { match_id: "match-2", cv_id: "cv-2", jd_title: null },
      gapItems: [mkGap()],
      actions: [mkAction()],
    });
    expect(chips).toEqual([
      {
        kind: "view_match",
        labelKey: "companion.chat.chipViewMatch",
        viewMatch: { cvId: "cv-2", matchId: "match-2", jdTitle: null },
      },
      { kind: "jump", labelKey: "companion.chat.chipViewGap", anchorId: "gap-req-1" },
      { kind: "rewrite", labelKey: "companion.chat.chipRewriteHere", rewrite: { action: mkAction() } },
    ]);
  });
});
