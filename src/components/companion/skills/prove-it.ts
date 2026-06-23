// ─── prove-it.ts ─────────────────────────────────────────────────
// Pure selectors for the "Prove-it" coach (#13).
// Identifies skills that are in the CV but only "listed" (no
// concrete evidence bullet), and are required by JD.

import type { SkillMatchItem, EvidenceLedger, EvidenceItem } from "@shared/api";

/**
 * Pick the top "prove-it" candidate: a JD-required skill that
 * IS on the CV (present/partial) but has weak evidence (listed_only).
 *
 * Returns null when there's nothing to prove — companion stays silent (honest-empty).
 */
export function pickTopProveIt(
  hardSkills: SkillMatchItem[],
  softSkills: SkillMatchItem[],
  ledger: EvidenceLedger | null | undefined,
): EvidenceItem | null {
  if (!ledger?.items?.length) return null;

  // Build set of skills that ARE on the CV but only listed
  const listedOnly = new Set<string>();
  for (const item of ledger.items) {
    if (item.strength === "listed_only") {
      listedOnly.add(item.skill_canonical);
    }
  }

  if (listedOnly.size === 0) return null;

  // Among JD-required skills (present or partial), find one whose evidence is listed_only
  const allSkills = [...hardSkills, ...softSkills];
  const jdRelevant = allSkills.filter(
    (s) => (s.status === "present" || s.status === "partial") && listedOnly.has(s.canonical_name ?? s.name),
  );

  if (jdRelevant.length === 0) return null;

  // Pick the one with lowest cvScore (weakest evidence)
  jdRelevant.sort((a, b) => a.cvScore - b.cvScore);
  const target = jdRelevant[0];
  const canon = target.canonical_name ?? target.name;

  return ledger.items.find((item) => item.skill_canonical === canon) ?? null;
}
