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
} from "@shared/api";
import { pickTopProveIt } from "./prove-it";
import { pickTopCompletenessGap, type CompletenessGap } from "./diagnosis-review";

export type IssueKind =
  | "listed_no_evidence"
  | "gap_item"
  | "exp_no_dates"
  | "parse_quality"
  | "deal_breaker"
  | "missing_section";

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
const NON_GAP_RANK: Record<Exclude<IssueKind, "gap_item">, number> = {
  // Order of importance among the code-owned detectors (highest first).
  deal_breaker: 5,
  missing_section: 4,
  listed_no_evidence: 3,
  exp_no_dates: 2,
  parse_quality: 1,
};

// ─── Detector: listed_no_evidence ──────────────────────────────────
// JD-required skill that IS on the CV but only "listed" (no concrete
// evidence). "Why" = EvidenceItem.evidence_gap, rendered VERBATIM.
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
      // BE-authored "why" verbatim; fall back to the static enum string when absent.
      why: item.evidence_gap ?? null,
      whyKey: item.evidence_gap ? null : "companion.elementIssue.listed_no_evidence.why",
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
        anchorId: "diagnosis-root",
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
      anchorId: "diagnosis-root",
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

/**
 * Collect every real element issue, sorted by severity descending.
 * Returns [] when everything is clean (honest-empty). Pure, no LLM.
 */
export function collectElementIssues(input: ElementIssuesInput): ElementIssue[] {
  const issues: ElementIssue[] = [
    ...detectGapItems(input),
    ...detectDealBreakers(input),
    ...detectListedNoEvidence(input),
    ...detectCompleteness(input),
    ...detectParseQuality(input),
  ];
  return issues.sort((a, b) => b.severity - a.severity);
}
