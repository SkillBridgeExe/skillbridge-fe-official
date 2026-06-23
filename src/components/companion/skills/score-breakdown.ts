// ─── score-breakdown.ts ──────────────────────────────────────────
// Pure selector for Score-level explain popover (#14).
// Groups JD match skills into covered/not-covered buckets.

import type { CvJdMatch } from "@shared/api";

export interface CoverageBucket {
  covered: Array<{ name: string; score: number }>;
  notCovered: Array<{ name: string; status: "partial" | "missing" }>;
}

/**
 * Bucket JD match skills into covered (present) and not-covered (partial/missing).
 * Returns null when no JD match data is available — honest-empty.
 *
 * Skill-only by design — do NOT add `jd_dimensions` here:
 *  1. The displayed match % is skill-coverage; non-skill dimensions don't factor into it, so listing
 *     them in a "why this number" popover would misrepresent what the number means.
 *  2. `JdDimension` only describes the JD's requirement (value_text/importance/deal_breaker) — it has
 *     NO per-dimension CV-coverage signal, so bucketing it covered/not-covered would fabricate an
 *     assessment we don't have. Anti-fabrication: better honest-skill-only than invented coverage.
 */
export function bucketCoverage(jdMatch: CvJdMatch | null | undefined): CoverageBucket | null {
  if (!jdMatch) return null;

  const covered: CoverageBucket["covered"] = [];
  const notCovered: CoverageBucket["notCovered"] = [];

  for (const s of jdMatch.hardSkills) {
    if (s.status === "present") {
      covered.push({ name: s.name, score: s.cvScore });
    } else {
      notCovered.push({ name: s.name, status: s.status === "partial" ? "partial" : "missing" });
    }
  }

  for (const s of jdMatch.softSkills) {
    if (s.status === "present") {
      covered.push({ name: s.name, score: s.cvScore });
    } else {
      notCovered.push({ name: s.name, status: s.status === "partial" ? "partial" : "missing" });
    }
  }

  if (covered.length === 0 && notCovered.length === 0) return null;

  return { covered, notCovered };
}
