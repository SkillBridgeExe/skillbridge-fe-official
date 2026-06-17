import { useState, useEffect } from "react";
import { useGapReportQuery } from "./use-diagnosis";
import { rewriteTailorBullet } from "@/services/diagnosis.service";
import type { CanonicalCvDocument, TailorAction } from "@shared/api";

export interface AiAppliedCvResult {
  isFetching: boolean;
  appliedDocument: CanonicalCvDocument | null;
  appliedCount: number;
  failedCount: number;
  totalEligible: number;
  manualTasks: TailorAction[];
  changedBullets: string[];
}

export function useAiAppliedCv(
  cvId: string | null,
  matchId: string | null,
  baseDocument: CanonicalCvDocument | null
): AiAppliedCvResult {
  const { data: gapReport, isFetching: isFetchingGapReport } = useGapReportQuery(matchId);
  const [isRewriting, setIsRewriting] = useState(false);
  const [result, setResult] = useState<Omit<AiAppliedCvResult, "isFetching" | "manualTasks">>({
    appliedDocument: null,
    appliedCount: 0,
    failedCount: 0,
    totalEligible: 0,
    changedBullets: [],
  });

  const manualTasks: TailorAction[] = [];
  const eligibleActions: TailorAction[] = [];

  if (gapReport?.recommended_actions) {
    for (const action of gapReport.recommended_actions) {
      if (action.action_type === "missing_required" || action.action_type === "add_evidence") {
        manualTasks.push(action);
      } else if (
        action.rewrite_eligible &&
        action.before &&
        (action.action_type === "emphasize" || action.action_type === "deepen_wording")
      ) {
        eligibleActions.push(action);
      }
    }
  }

  // W26 Spec: max 5 bullets
  const topActions = eligibleActions.slice(0, 5);

  useEffect(() => {
    let isMounted = true;

    async function applySuggestions() {
      if (!baseDocument || !cvId || !matchId || topActions.length === 0) {
        setResult({
          appliedDocument: baseDocument ? JSON.parse(JSON.stringify(baseDocument)) : null,
          appliedCount: 0,
          failedCount: 0,
          totalEligible: 0,
          changedBullets: [],
        });
        return;
      }

      setIsRewriting(true);

      const promises = topActions.map((action) =>
        rewriteTailorBullet({
          cvId,
          matchId,
          text: action.before!,
          action,
        })
          .then((res) => ({ action, suggestion: res.suggestion }))
          .catch((err) => {
            console.error("Failed to rewrite bullet:", action.skill_canonical, err);
            return { action, suggestion: null };
          })
      );

      const results = await Promise.all(promises);
      if (!isMounted) return;

      const clonedDoc: CanonicalCvDocument = JSON.parse(JSON.stringify(baseDocument));
      let appliedCount = 0;
      let failedCount = 0;
      const changedBullets: string[] = [];

      // Apply the suggestions to the cloned document
      for (const res of results) {
        if (!res.suggestion) {
          failedCount++;
          continue;
        }

        const before = res.action.before!;
        let found = false;

        // Utility to replace within an array of strings
        const replaceInBullets = (bullets: string[] | undefined) => {
          if (!bullets) return false;
          const idx = bullets.findIndex((b) => b === before || b.includes(before));
          if (idx !== -1) {
            bullets[idx] = res.suggestion!;
            return true;
          }
          return false;
        };

        // Try replacing based on cv_section if available, otherwise search globally
        // For simplicity of FE MVP, we just search globally in the standard sections
        if (clonedDoc.summary && clonedDoc.summary.includes(before)) {
          clonedDoc.summary = res.suggestion;
          found = true;
        }

        if (!found && clonedDoc.experience) {
          for (const exp of clonedDoc.experience) {
            if (replaceInBullets(exp.bullets)) {
              found = true;
              break;
            }
          }
        }

        if (!found && clonedDoc.projects) {
          for (const proj of clonedDoc.projects) {
            if (replaceInBullets(proj.bullets)) {
              found = true;
              break;
            }
          }
        }

        if (!found && clonedDoc.education) {
          for (const edu of clonedDoc.education) {
            if (replaceInBullets(edu.highlights)) {
              found = true;
              break;
            }
          }
        }

        if (!found && clonedDoc.activities) {
          for (const act of clonedDoc.activities) {
            if (replaceInBullets(act.bullets)) {
              found = true;
              break;
            }
          }
        }

        if (found) {
          appliedCount++;
          changedBullets.push(res.suggestion);
        } else {
          failedCount++;
        }
      }

      setResult({
        appliedDocument: clonedDoc,
        appliedCount,
        failedCount,
        totalEligible: topActions.length,
        changedBullets,
      });
      setIsRewriting(false);
    }

    applySuggestions();

    return () => {
      isMounted = false;
    };
    // topActions derives from gapReport (already a dep) — re-run is keyed on the source data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDocument, cvId, matchId, gapReport]);

  return {
    isFetching: isFetchingGapReport || isRewriting,
    appliedDocument: result.appliedDocument,
    appliedCount: result.appliedCount,
    failedCount: result.failedCount,
    totalEligible: result.totalEligible,
    manualTasks,
    changedBullets: result.changedBullets || [],
  };
}
