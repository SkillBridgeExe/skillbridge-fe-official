// ─── diagnosis-review.ts ─────────────────────────────────────────
// Pure selectors for Diagnosis Companion Phase 2 (#16).
// Checks CV document completeness and identifies the top gap.

import type { CanonicalCvDocument } from "@shared/api";

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
