// ─── diagnosis-review.ts ─────────────────────────────────────────
// Pure selectors for Diagnosis Companion Phase 2 (#16).
// Checks CV document completeness and identifies the top gap.

import type { CanonicalCvDocument, CvIssue, CvReviewData } from "@shared/api";

export type CompletenessGap =
  | "no_experience"
  | "exp_no_dates"
  | "no_projects"
  | "no_skills"
  | "no_summary";

const GAP_PRIORITY: CompletenessGap[] = [
  "no_experience",
  "exp_no_dates",
  "no_projects",
  "no_skills",
  "no_summary",
];

/**
 * Identify the highest-priority completeness gap in the parsed CV document.
 * Returns null when the CV is complete enough — companion stays silent (honest-empty).
 */
export function pickTopCompletenessGap(doc: CanonicalCvDocument | null | undefined): CompletenessGap | null {
  if (!doc) return null;

  const checks: Record<CompletenessGap, boolean> = {
    no_experience: !doc.experience || doc.experience.length === 0,
    exp_no_dates: (doc.experience?.length ?? 0) > 0 && doc.experience.some((e) => !e.start && !e.end),
    no_projects: !doc.projects || doc.projects.length === 0,
    no_skills: !doc.skills?.technical || doc.skills.technical.length === 0,
    no_summary: !doc.summary || doc.summary.trim().length === 0,
  };

  for (const gap of GAP_PRIORITY) {
    if (checks[gap]) return gap;
  }

  return null;
}

/**
 * Per-dimension issue slice — the SINGLE source of truth for how the dimension
 * cards distribute `reviewData.issues` across the 4 dimension cards. Both the
 * card (DiagnosisStep2Review → DimensionCard) and the commentary detector
 * (detectExplainDimension) call this, so the tips the companion shows are
 * byte-identical to the tips the card shows (anti-fabrication: same verbatim
 * `CvIssue.detail`/`.suggestion`, never re-composed).
 *
 * Mirrors the historical inline logic exactly: ceil-chunk `issues` into
 * `dimensions.length` consecutive buckets; bucket `i` is `issues[i*per .. ]`.
 * When there are no dimensions, the whole list is one bucket (index 0).
 */
export function dimensionIssueSlice(
  reviewData: CvReviewData | null | undefined,
  dimIndex: number,
): CvIssue[] {
  const allIssues = reviewData?.issues ?? [];
  const dimCount = reviewData?.dimensions?.length ?? 0;
  if (dimCount <= 0) return dimIndex === 0 ? allIssues : [];
  const perDim = Math.ceil(allIssues.length / dimCount);
  return allIssues.slice(dimIndex * perDim, (dimIndex + 1) * perDim);
}

/**
 * Quick summary of parsed CV completeness (counts only).
 */
export function completenessSummary(doc: CanonicalCvDocument | null | undefined) {
  return {
    experiences: doc?.experience?.length ?? 0,
    projects: doc?.projects?.length ?? 0,
    skills: doc?.skills?.technical?.length ?? 0,
    hasSummary: !!doc?.summary?.trim(),
  };
}
