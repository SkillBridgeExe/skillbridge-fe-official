// ─── match-score-band ───────────────────────────────────────────────
// Single source of truth for the match-score band thresholds used on
// the results page (ScoreRail mode=match + MatchNarrative).
//
// Thresholds: ≥80 → strong, ≥60 → moderate, <60 → low.
// These MUST stay aligned with MatchNarrative's inline thresholds.
// NOT used for the review-mode band (which uses 70/50 from
// dimensionTone / element-issues).
// NOT used in useDiagnosisChatCompanion (chat opener) — out of scope.

export type MatchBand = "strong" | "moderate" | "low";

export interface MatchBandResult {
  band: MatchBand;
  /** i18n key suffix under the diagnosis namespace. */
  i18nKey: string;
  /** Tailwind chip classes (bg + text + border). */
  chip: string;
  /** Stroke color for the donut SVG. */
  stroke: string;
}

/**
 * Classify a match score into one of 3 bands. Thresholds match
 * MatchNarrative (≥80 / ≥60 / <60) — NOT the review-mode 70/50 scale.
 */
export function matchScoreBand(score: number): MatchBandResult {
  if (score >= 80) {
    return {
      band: "strong",
      i18nKey: "match.band.strong",
      chip: "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/5",
      stroke: "#10B981",
    };
  }
  if (score >= 60) {
    return {
      band: "moderate",
      i18nKey: "match.band.moderate",
      chip: "bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm shadow-amber-500/5",
      stroke: "#F59E0B",
    };
  }
  return {
    band: "low",
    i18nKey: "match.band.low",
    chip: "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm shadow-rose-500/5",
    stroke: "#EF4444",
  };
}
