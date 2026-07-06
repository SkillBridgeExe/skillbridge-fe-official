// ─── element-issues.ts ───────────────────────────────────────────
// Pure detector layer — the heart of the Perfected Diagnosis Companion
// (Pillar 2: proactive per-element analysis + explain-why).
//
// One detector per REAL signal. Each returns ElementIssue[] (possibly
// empty). NO LLM is ever invoked — code owns WHAT is wrong; the "why"
// is either a BE-authored field rendered VERBATIM (anti-fabrication)
// or a static, enum-keyed i18n string. A clean element yields nothing,
// so a clean CV → [] → empty queue → no context → silence (honest-empty).
//
// ⚠️ TYPE CORRECTIONS vs the plan (real types win — see shared/api.ts):
//  • The detector input cannot run off `CvJdMatch` alone: `gap_items` and
//    `jd_intelligence` live on `GapReportDto`, fetched separately by
//    GapReportCard. So the input ALSO accepts `gapReport: GapReportDto | null`
//    to feed the gap_item + deal_breaker detectors. jdMatch + reviewData
//    drive listed_no_evidence / exp_no_dates / parse_quality / missing_section.
//  • `GapItem` has NO numeric `evidence_risk`/`interview_risk` sub-scores —
//    `severity` is a flat number, `market_demand` is the only present numeric
//    factor (`evidence_risk` is an enum string). So `severityFactors` only ever
//    carries `market_demand`, and ONLY when the gap actually has one (honest).

import type {
  CvJdMatch,
  CvReviewData,
  GapReportDto,
  GapItem,
  EvidenceItem,
  CvIssue,
} from "@shared/api";
import { pickTopProveIt } from "./prove-it";
import {
  pickTopCompletenessGap,
  dimensionIssueSlice,
  type CompletenessGap,
} from "./diagnosis-review";

export type IssueKind =
  | "listed_no_evidence"
  | "gap_item"
  | "exp_no_dates"
  | "parse_quality"
  | "deal_breaker"
  | "missing_section"
  // ── Phase A commentary: proactive grounded commentary on the analysis the
  // user is viewing (never a fabricated claim — see anti-fab notes below). ──
  | "explain_dimension"
  | "praise_overall";

/** Dimension band keyed off the SAME thresholds the card uses (dimensionTone). */
export type DimensionBand = "strong" | "watch" | "priority";
/** Overall band keyed off the SAME thresholds the card's scoreMessage uses. */
export type OverallBand = "excellent" | "good" | "fair" | "low";

export interface ElementIssue {
  /** Stable per element, e.g. `gap:${requirement_id}` / `evidence:${skill_canonical}`. */
  id: string;
  kind: IssueKind;
  /** DOM id of the offending card the dolphin points at. */
  anchorId: string;
  /** Sort key (severity desc). */
  severity: number;
  /** i18n key for the "what" line. */
  whatKey: string;
  /** BE-authored "why" rendered VERBATIM, or null → use whyKey. */
  why: string | null;
  /** i18n key for the "why" line when there's no BE string. */
  whyKey: string | null;
  ctaKind: "intake" | "rewrite" | "builder" | "roadmap" | null;
  /** #2 why-this-first — only ever-present numeric factors (honest). */
  severityFactors?: { market_demand?: number; evidence_risk?: number; interview_risk?: number };
  // ── Phase A commentary fields — REAL data carried verbatim for the renderer.
  //    The renderer wraps these in a STATIC enum-keyed template; it never
  //    composes a novel claim sentence. Absent for non-commentary kinds. ──
  /** Dimension display title key (e.g. `review.dims.action_verbs`) — verbatim. */
  titleKey?: string;
  /** Real BE number, VERBATIM from reviewData (dim.score20 / overallScore). */
  score20?: number;
  /** Real overall number, VERBATIM from reviewData.overallScore. */
  overallScore?: number;
  /** Band derived by the SAME thresholds as the card — selects the template. */
  band?: DimensionBand;
  /** Overall band keyed off the card's scoreMessage thresholds. */
  overallBand?: OverallBand;
  /** Tips shown on the dimension card — VERBATIM CvIssue rows (same slice). */
  tips?: CvIssue[];
  /** Biggest-fix line for a low overall — VERBATIM prioritized_actions[0]. */
  biggestFix?: string;
}

export interface ElementIssuesInput {
  jdMatch: CvJdMatch | null;
  reviewData: CvReviewData | null;
  /** Optional — gap_item + deal_breaker detectors read from the gap report. */
  gapReport?: GapReportDto | null;
}

// ── Deterministic, code-owned severity ranks for the non-GapItem detectors.
// Derived from the completeness GAP_PRIORITY order + spec §1 anchor order
// (gap → evidence → dimension → exp). GapItem detectors use their own real
// `.severity` number; these fixed ranks slot the code-owned detectors below
// any real gap-engine severity while staying internally deterministic.
const NON_GAP_RANK: Record<
  Exclude<IssueKind, "gap_item" | "explain_dimension" | "praise_overall">,
  number
> = {
  // Order of importance among the code-owned detectors (highest first).
  deal_breaker: 5,
  missing_section: 4,
  listed_no_evidence: 3,
  exp_no_dates: 2,
  parse_quality: 1,
};

// ── Phase A commentary ranks: STRICTLY BELOW every NON_GAP_RANK value (1..5)
// AND below every real gap-engine severity (gaps are 0..100). Commentary is the
// lowest tier in the severity sort, so a real gap/issue on a card ALWAYS
// out-ranks the commentary anchored to the same card (a problem wins the pick).
const COMMENTARY_RANK: Record<"explain_dimension" | "praise_overall", number> = {
  explain_dimension: 0.5,
  praise_overall: 0.2,
};

/** Dimension band by the SAME thresholds as the card's `dimensionTone` (pct = score20×5). */
function dimensionBand(score20: number): DimensionBand {
  const pct = Math.round(score20 * 5);
  if (pct >= 70) return "strong";
  if (pct >= 50) return "watch";
  return "priority";
}

/** Overall band by the SAME thresholds as the card's `scoreMessage`. */
function overallBandOf(overallScore: number): OverallBand {
  if (overallScore >= 70) return "excellent";
  if (overallScore >= 55) return "good";
  if (overallScore >= 40) return "fair";
  return "low";
}

// ─── Detector: listed_no_evidence ──────────────────────────────────
// JD-required skill that IS on the CV but only "listed" (no concrete
// evidence). "Why" = static enum string (the BE ledger carries gap notes
// only at LEDGER level, never per-item — contract-sync 2026-07-06).
function detectListedNoEvidence(input: ElementIssuesInput): ElementIssue[] {
  const { jdMatch, reviewData } = input;
  if (!jdMatch) return [];
  const item: EvidenceItem | null = pickTopProveIt(
    jdMatch.hardSkills ?? [],
    jdMatch.softSkills ?? [],
    reviewData?.evidence_ledger,
  );
  if (!item) return [];
  return [
    {
      id: `evidence:${item.skill_canonical}`,
      kind: "listed_no_evidence",
      anchorId: `evidence-${item.skill_canonical}`,
      severity: NON_GAP_RANK.listed_no_evidence,
      whatKey: "companion.elementIssue.listed_no_evidence.what",
      why: null,
      whyKey: "companion.elementIssue.listed_no_evidence.why",
      ctaKind: "rewrite",
    },
  ];
}

// ─── Detector: gap_item ────────────────────────────────────────────
// Canonical Gap Engine v2 objects. Fire on any unmatched gap; carry its
// real `.severity` + recommended_next_action (VERBATIM why). severityFactors
// only carries market_demand when present (the only real numeric factor).
function detectGapItems(input: ElementIssuesInput): ElementIssue[] {
  const items = input.gapReport?.gap_items;
  if (!items?.length) return [];
  const ctaFor = (g: GapItem): ElementIssue["ctaKind"] => {
    switch (g.fixability) {
      case "rewrite":
        return "rewrite";
      case "add_evidence":
        return "intake";
      case "learn":
        return "roadmap";
      default:
        return null;
    }
  };
  return items
    .filter((g) => g.cv_status !== "matched")
    // Match GapReportCard's render cap EXACTLY (severity desc, top 6): only the
    // top-6 gaps get a rendered card with id=`gap-<requirement_id>`. A gap ranked
    // #7+ has no DOM anchor → the companion could never reach it → it must NOT be
    // emitted (an orphan issue would silently never surface). Keep detector and
    // renderer in lockstep.
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 6)
    .map((g) => {
      const issue: ElementIssue = {
        id: `gap:${g.requirement_id}`,
        kind: "gap_item",
        anchorId: `gap-${g.requirement_id}`,
        severity: g.severity,
        whatKey: "companion.elementIssue.gap_item.what",
        why: g.recommended_next_action || null,
        whyKey: g.recommended_next_action ? null : "companion.elementIssue.gap_item.why",
        ctaKind: ctaFor(g),
      };
      if (g.market_demand != null) {
        issue.severityFactors = { market_demand: g.market_demand };
      }
      return issue;
    });
}

// ─── Detector: missing_section / exp_no_dates ──────────────────────
// Both derive from pickTopCompletenessGap over the parsed CV document.
// "Why" is code-owned (static enum i18n), so why=null + whyKey set.
const MISSING_SECTION_GAPS = new Set<CompletenessGap>([
  "no_experience",
  "no_projects",
  "no_skills",
  "no_summary",
]);

function detectCompleteness(input: ElementIssuesInput): ElementIssue[] {
  const doc = input.reviewData?.document;
  const gap = pickTopCompletenessGap(doc);
  if (!gap) return [];

  if (gap === "exp_no_dates") {
    return [
      {
        id: "completeness:exp_no_dates",
        kind: "exp_no_dates",
        anchorId: "exp-0",
        severity: NON_GAP_RANK.exp_no_dates,
        whatKey: "companion.elementIssue.exp_no_dates.what",
        why: null,
        whyKey: "companion.elementIssue.exp_no_dates.why",
        ctaKind: "builder",
      },
    ];
  }

  if (MISSING_SECTION_GAPS.has(gap)) {
    return [
      {
        id: `completeness:${gap}`,
        kind: "missing_section",
        // No specific card to point at (the section is MISSING) → empty anchor =
        // the companion rests at its home corner (fallback) instead of degenerately
        // anchoring to the whole page (which clips the unit at the edge).
        anchorId: "",
        severity: NON_GAP_RANK.missing_section,
        whatKey: `companion.elementIssue.missing_section.${gap}.what`,
        why: null,
        whyKey: `companion.elementIssue.missing_section.${gap}.why`,
        ctaKind: "builder",
      },
    ];
  }

  return [];
}

// ─── Detector: parse_quality (Improvement 3 — honest-uncertainty) ──
// When extraction confidence is not "high", the dolphin says so honestly
// rather than asserting on shaky text. "Why" = code-owned enum i18n.
function detectParseQuality(input: ElementIssuesInput): ElementIssue[] {
  const eq = input.reviewData?.extraction_quality;
  if (!eq || eq.confidence === "high") return [];
  return [
    {
      id: "parse_quality",
      kind: "parse_quality",
      // Whole-document signal, no single card → rest at the home corner (fallback).
      anchorId: "",
      severity: NON_GAP_RANK.parse_quality,
      whatKey: "companion.elementIssue.parse_quality.what",
      why: null,
      whyKey: "companion.elementIssue.parse_quality.why",
      ctaKind: null,
    },
  ];
}

// ─── Detector: deal_breaker ────────────────────────────────────────
// JD dimension flagged as a deal-breaker that the CV has no signal for.
// "Why" = code-owned enum i18n.
function detectDealBreakers(input: ElementIssuesInput): ElementIssue[] {
  const dims = input.gapReport?.jd_intelligence?.dimensions;
  if (!dims?.length) return [];
  return dims
    .filter((d) => d.deal_breaker && d.cv_signal == null)
    .map((d) => ({
      id: `deal_breaker:${d.dimension}`,
      kind: "deal_breaker" as const,
      anchorId: `dim-${d.dimension}`,
      severity: NON_GAP_RANK.deal_breaker,
      whatKey: "companion.elementIssue.deal_breaker.what",
      why: null,
      whyKey: "companion.elementIssue.deal_breaker.why",
      ctaKind: "roadmap" as const,
    }));
}

// ─── Detector: explain_dimension (Phase A commentary) ──────────────
// For each scored dimension, emit ONE grounded commentary item anchored to the
// `dim-${key}` card. ANTI-FAB: the only number is the VERBATIM `dim.score20`;
// the only prose is the VERBATIM `dim.rationale` (BE-authored, why=...) and the
// VERBATIM tips (same `dimensionIssueSlice` the card renders). The band only
// selects a static enum template — no claim sentence is composed by the FE.
// Severity is the lowest commentary rank, so a real gap on this card wins.
function detectExplainDimension(input: ElementIssuesInput): ElementIssue[] {
  const dims = input.reviewData?.dimensions;
  if (!dims?.length) return [];
  return dims.map((dim, i) => {
    const tips = dimensionIssueSlice(input.reviewData, i);
    const issue: ElementIssue = {
      id: `commentary:dim:${dim.key}`,
      kind: "explain_dimension",
      anchorId: `dim-${dim.key}`,
      severity: COMMENTARY_RANK.explain_dimension,
      // WHAT line is a static enum-keyed template wrapping the real band + number.
      whatKey: "companion.scoreBreakdown.explain.what",
      // WHY = the BE-authored rationale rendered VERBATIM (the "explain why").
      // No rationale → null → renderer shows no why line (honest-empty), no static
      // substitute (the rationale IS the source of truth for this dimension).
      why: dim.rationale ?? null,
      whyKey: null,
      ctaKind: null,
      // Real data for the renderer (numbers verbatim; band derived by card rules).
      titleKey: `review.dims.${dim.key}`,
      score20: dim.score20,
      band: dimensionBand(dim.score20),
      tips,
    };
    return issue;
  });
}

// ─── Detector: praise_overall (Phase A commentary) ─────────────────
// ONE whole-doc commentary item: praise a high overall score, or (low band)
// frame the real biggest fix. ANTI-FAB: the only number is VERBATIM
// `overallScore`; `why` reuses the EXISTING band scoreMsg i18n keys verbatim
// (review.scoreMsg.*) — never invented; the biggest-fix string is the VERBATIM
// `top_summary.prioritized_actions[0]` and is only carried when present.
function detectOverallCommentary(input: ElementIssuesInput): ElementIssue[] {
  const overallScore = input.reviewData?.overallScore;
  if (overallScore == null) return [];
  const overallBand = overallBandOf(overallScore);
  const isLow = overallBand === "low";
  // Reuse the card's existing band scoreMsg keys VERBATIM (don't invent copy).
  const scoreMsgKey =
    overallBand === "excellent"
      ? "review.scoreMsg.excellent"
      : overallBand === "good"
        ? "review.scoreMsg.good"
        : overallBand === "fair"
          ? "review.scoreMsg.fair"
          : "review.scoreMsg.poor";
  const biggestFix = input.reviewData?.top_summary?.prioritized_actions?.[0];
  const issue: ElementIssue = {
    id: "commentary:overall",
    kind: "praise_overall",
    // Whole-document signal, no single card → rest at the home corner (fallback).
    anchorId: "",
    severity: COMMENTARY_RANK.praise_overall,
    whatKey: "companion.praise.what",
    // WHY = the existing band scoreMsg copy, rendered verbatim via whyKey.
    why: null,
    whyKey: scoreMsgKey,
    // Low band → route to the roadmap and carry the real biggest fix; otherwise
    // pure praise with no CTA (it's not a problem).
    ctaKind: isLow && biggestFix ? "roadmap" : null,
    overallScore,
    overallBand,
  };
  if (isLow && biggestFix) issue.biggestFix = biggestFix;
  return [issue];
}

/**
 * Collect every real element issue, sorted by severity descending.
 * Returns [] when everything is clean (honest-empty). Pure, no LLM.
 *
 * Phase A commentary (explain_dimension / praise_overall) is appended LAST and
 * carries the lowest severity ranks (COMMENTARY_RANK ⋘ every real severity), so
 * the severity sort always keeps real gaps/issues above commentary — a real gap
 * on a card out-ranks the commentary anchored to the same card.
 */
export function collectElementIssues(input: ElementIssuesInput): ElementIssue[] {
  const issues: ElementIssue[] = [
    ...detectGapItems(input),
    ...detectDealBreakers(input),
    ...detectListedNoEvidence(input),
    ...detectCompleteness(input),
    ...detectParseQuality(input),
    ...detectExplainDimension(input),
    ...detectOverallCommentary(input),
  ];
  return issues.sort((a, b) => b.severity - a.severity);
}

/** True for the Phase A grounded-commentary kinds (praise + dimension explain). */
export function isCommentaryKind(kind: IssueKind): boolean {
  return kind === "explain_dimension" || kind === "praise_overall";
}

/**
 * Pick the worst (first, since the queue is severity-sorted) issue whose anchor
 * card is currently RESOLVABLE on screen — so the dolphin only ever points at a
 * card that actually exists on the current step/tab. Detectors emit anchors for
 * cards that may live on the OTHER step / behind a non-default tab / in an async
 * card; those `anchorId`s won't resolve there, so we skip them rather than park
 * the bubble in the corner (Fix C). Returns null when no visible issue resolves
 * (honest-empty). Pure: takes an `isResolvable` predicate so it is jsdom-testable.
 */
export function pickActiveResolvableIssue(
  visible: ElementIssue[],
  isResolvable: (anchorId: string) => boolean,
): ElementIssue | null {
  for (const issue of visible) {
    if (isResolvable(issue.anchorId)) return issue;
  }
  return null;
}
