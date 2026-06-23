// ─── useElementIssuesCompanion ───────────────────────────────────────
// Boundary-fired wiring for the Perfected Diagnosis Companion (Pillar 1+2).
// On data-loaded (parse-done / results-loaded — NOT a timer), this hook:
//   1. runs the pure `collectElementIssues(...)` detector layer,
//   2. pushes the severity-sorted queue into the companion store,
//   3. registers exactly ONE context `id="diagnosis:issue"` anchored at the
//      active issue's card, and
//   4. REPLACES the legacy `diagnosis:results` + `diagnosis:proveit`
//      registrations (the new detectors subsume them) so there is never a
//      double-pop — preserving the single-active-`activeId` invariant.
//
// Honest-empty: `collectElementIssues` → [] → no context registered → silence.
// Anti-Clippy: a dismissed/snoozed issue is filtered out of the visible queue
// (persisted), so the active issue is always the worst NON-dismissed one.

import { useEffect } from "react";
import { useCompanionStore, activeIssue, visibleIssues } from "@/store/useCompanionStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { collectElementIssues, type ElementIssue, type ElementIssuesInput } from "./element-issues";

const ISSUE_CONTEXT_ID = "diagnosis:issue";

/** Route an issue's CTA to the right destination (deterministic per ctaKind). */
function runCta(kind: ElementIssue["ctaKind"]): void {
  switch (kind) {
    case "rewrite":
    case "intake":
    case "builder":
      // All three land the user in the CV builder where they add/fix evidence.
      useDiagnosisStore.getState().setStep("builder");
      break;
    case "roadmap": {
      const el = document.getElementById("roadmap-anchor");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      break;
    }
    default:
      break;
  }
  useCompanionStore.getState().dismissActive();
}

/**
 * Wire element-issues into the companion at a diagnosis step.
 * @param input  jdMatch + reviewData (+ gapReport) — the detector inputs.
 * @param ready  boundary flag: only collect once the data is loaded/settled.
 */
export function useElementIssuesCompanion(input: ElementIssuesInput, ready: boolean): void {
  // Stable signal of WHAT data we have, so the boundary effect re-runs on load.
  const matchId = input.jdMatch?.matchId ?? null;
  const hasReview = !!input.reviewData;
  const hasGapReport = !!input.gapReport;

  // ── Boundary: (re)collect issues when data settles ──
  useEffect(() => {
    const store = useCompanionStore.getState();
    if (!ready) {
      store.setIssues([]);
      return;
    }
    store.setIssues(collectElementIssues(input));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, matchId, hasReview, hasGapReport]);

  // ── Subscribe to the visible queue + active issue → register/replace ──
  // Depend on STABLE primitives (id/anchorId/index/count); `getTurn` reads the
  // freshest issue from the store at render time so dismiss re-points cleanly.
  const activeId = useCompanionStore((s) => activeIssue(s)?.id ?? null);
  const activeAnchorId = useCompanionStore((s) => activeIssue(s)?.anchorId ?? null);
  const visibleCount = useCompanionStore((s) => visibleIssues(s).length);
  const activeIndex = useCompanionStore((s) => {
    const visible = visibleIssues(s);
    return Math.min(s.activeIssueIndex, Math.max(visible.length - 1, 0));
  });

  useEffect(() => {
    const store = useCompanionStore.getState();
    if (!activeId || !activeAnchorId) {
      // No real issue → honest-empty. Drop our context; leave legacy contexts
      // (results/proveit) to their own effects.
      store.unregisterContext(ISSUE_CONTEXT_ID);
      return;
    }

    // Element-issues subsume the legacy results/proveit surfacing → gate them
    // off so only ONE bubble (diagnosis:issue) is ever active (anti-Clippy).
    store.unregisterContext("diagnosis:results");
    store.unregisterContext("diagnosis:proveit");

    store.registerContext({
      id: ISSUE_CONTEXT_ID,
      priority: 30, // above legacy results(10)/proveit(20)
      anchorId: activeAnchorId,
      getTurn: () => {
        // Read the freshest active issue at render time (post-dismiss re-point).
        const issue = activeIssue(useCompanionStore.getState());
        return {
          skill: "diagnosis_element_issue",
          props: {
            issue,
            index: activeIndex,
            total: visibleCount,
            onCta: () => runCta(issue?.ctaKind ?? null),
            onDismiss: () => issue && useCompanionStore.getState().dismissIssue(issue.id, "once"),
            onSnooze: () => issue && useCompanionStore.getState().dismissIssue(issue.id, "snooze"),
          },
        };
      },
    });
    store.activateContext(ISSUE_CONTEXT_ID);

    return () => useCompanionStore.getState().unregisterContext(ISSUE_CONTEXT_ID);
  }, [activeId, activeAnchorId, activeIndex, visibleCount]);
}
