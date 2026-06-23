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
//
// Fix C — RESOLVABLE filter: detectors emit anchors for cards that may live on
// the OTHER step / behind a non-default tab / in an async-loading card. We only
// surface the worst issue whose anchor card is actually ON SCREEN right now;
// otherwise honest-empty (no corner-parking). Re-evaluated on every queue/step/
// tab change via a MutationObserver-driven tick.

import { useEffect, useRef, useState } from "react";
import { useCompanionStore, visibleIssues } from "@/store/useCompanionStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import {
  collectElementIssues,
  pickActiveResolvableIssue,
  type ElementIssue,
  type ElementIssuesInput,
} from "./element-issues";

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

/** Is this anchor card currently mounted in the DOM? (Fix C resolvability.) */
function anchorResolves(anchorId: string): boolean {
  return typeof document !== "undefined" && !!document.getElementById(anchorId);
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

  // ── Resolvability tick: bump whenever the diagnosis DOM mutates (step swap,
  //    tab change, async card mount) so the resolvable-filter re-evaluates. ──
  const [resolveTick, setResolveTick] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const scopeEl = document.getElementById("diagnosis-root") ?? document.body;
    const obs = new MutationObserver(() => setResolveTick((t) => t + 1));
    obs.observe(scopeEl, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // ── Subscribe to the visible queue (stable id signature) → pick the worst
  //    RESOLVABLE issue as active (Fix C). ──
  // The visible queue's identity changes only on a real re-scan / dismiss; we
  // key the register effect off the resolved issue's stable primitives.
  const visibleSig = useCompanionStore((s) =>
    visibleIssues(s).map((i) => `${i.id}@${i.anchorId}#${i.severity}`).join("|"),
  );

  // Recompute the active resolvable issue on queue change OR DOM mutation.
  const visible = useCompanionStore(visibleIssues);
  const active = pickActiveResolvableIssue(visible, anchorResolves);
  // `resolveTick` participates so the memo below re-derives after a DOM change.
  void resolveTick;

  const activeId = active?.id ?? null;
  const activeAnchorId = active?.anchorId ?? null;
  // "1 of N" within the RESOLVABLE slice (honest footer: only on-screen cards).
  const resolvable = visible.filter((i) => anchorResolves(i.anchorId));
  const activeIndex = active ? Math.max(resolvable.findIndex((i) => i.id === active.id), 0) : 0;
  const visibleCount = resolvable.length;

  // Track the previously-anchored card so we can detect a genuinely NEW card.
  const prevAnchorRef = useRef<string | null>(null);

  useEffect(() => {
    const store = useCompanionStore.getState();
    if (!activeId || !activeAnchorId) {
      // No resolvable issue → honest-empty. Drop our context; leave legacy
      // contexts (results/proveit) to their own effects.
      store.unregisterContext(ISSUE_CONTEXT_ID);
      prevAnchorRef.current = null;
      return;
    }

    // Element-issues subsume the legacy results/proveit surfacing → gate them
    // off so only ONE bubble (diagnosis:issue) is ever active (anti-Clippy).
    store.unregisterContext("diagnosis:results");
    store.unregisterContext("diagnosis:proveit");

    // Fix A: advancing the queue reuses ONE context id, so the shell's
    // activeId-change reset never fires. When the active anchor changes,
    // re-enable anchoring (drag latches positionMode="manual").
    // Fix F: a genuinely NEW card = new advice → clear the session dismiss so
    // activateContext re-opens the bubble. The SAME card stays dismissed.
    const isNewCard = prevAnchorRef.current !== activeAnchorId;
    if (isNewCard) {
      store.resetPositionMode();
      store.clearDismissed(ISSUE_CONTEXT_ID);
    }
    prevAnchorRef.current = activeAnchorId;

    store.registerContext({
      id: ISSUE_CONTEXT_ID,
      priority: 30, // above legacy results(10)/proveit(20)
      anchorId: activeAnchorId,
      getTurn: () => {
        // Read the freshest resolvable issue at render time (post-dismiss re-point).
        const fresh = pickActiveResolvableIssue(
          visibleIssues(useCompanionStore.getState()),
          anchorResolves,
        );
        const issue = fresh ?? active;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeAnchorId, activeIndex, visibleCount, visibleSig]);
}
