// ─── useElementIssuesCompanion ───────────────────────────────────────
// Boundary-fired + VIEWPORT-DRIVEN wiring for the Perfected Diagnosis Companion
// (Pillar 1+2). On data-loaded (parse-done / results-loaded — NOT a timer), this hook:
//   1. runs the pure `collectElementIssues(...)` detector layer,
//   2. pushes the severity-sorted queue into the companion store,
//   3. registers exactly ONE context `id="diagnosis:issue"` anchored at the
//      active issue's card, and
//   4. REPLACES the legacy `diagnosis:results` + `diagnosis:proveit`
//      registrations (the new detectors subsume them) so there is never a
//      double-pop — preserving the single-active-`activeId` invariant.
//
// VIEWPORT-DRIVEN (the heart of the scroll-aware coach): the active issue is the
// worst NON-dismissed issue whose anchor card is CURRENTLY IN THE VIEWPORT — not
// merely mounted in the DOM. An IntersectionObserver tracks which issue cards are
// on screen; as the user scrolls PAST a card, the companion re-derives and swims
// to the next in-view card's issue. Whole-document issues (missing_section /
// parse_quality, empty anchor) never pre-empt a visible card — they surface at the
// home corner ONLY when there are no card-anchored issues at all.
//
// Honest-empty: nothing in view + no whole-doc fallback → no context → silence.
// Anti-Clippy: a dismissed/snoozed issue is filtered out of the visible queue
// (persisted), so it is never re-selected even when scrolled back into view.

import { useCallback, useEffect, useRef, useState } from "react";
import { useCompanionStore, visibleIssues } from "@/store/useCompanionStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import {
  collectElementIssues,
  isCommentaryKind,
  pickActiveResolvableIssue,
  type ElementIssue,
  type ElementIssuesInput,
} from "./element-issues";

const ISSUE_CONTEXT_ID = "diagnosis:issue";

// ⛔ Auto-surfacing disabled — the advisor is chat-driven (owner decision 06-23);
// detectors retained for future chat grounding.
// The dolphin no longer auto-jumps to cards or auto-pops issue/commentary bubbles.
// On the diagnosis tab the ONLY active context is `diagnosis:chat` (the calm corner
// advisor). This hook keeps `collectElementIssues` + the IntersectionObserver code
// intact (they will feed chat grounding later) but registers/activates NOTHING and
// sets NO issues into the store, so the IntersectionObserver/auto-jump never fires.
const AUTO_SURFACING_ENABLED = false;

// IntersectionObserver tuning (the "earn the interruption" zone): discount the
// ~80px sticky header up top, and bias toward cards the user is actually reading
// (a card barely peeking at the very bottom should not count) → bottom inset.
const IN_VIEW_ROOT_MARGIN = "-72px 0px -20% 0px";
const IN_VIEW_THRESHOLDS = [0, 0.25, 0.5, 0.75, 1];

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
  // Auto-surfacing disabled (owner decision 06-23): never push issues into the
  // store, so the IntersectionObserver/auto-jump below has nothing to anchor to and
  // the calm corner chat advisor is the only context. Keep the store's issue queue
  // empty (clear any stale queue) without running the detectors as a side effect.
  useEffect(() => {
    if (!AUTO_SURFACING_ENABLED) {
      useCompanionStore.getState().setIssues([]);
      return;
    }
    const store = useCompanionStore.getState();
    if (!ready) {
      store.setIssues([]);
      return;
    }
    store.setIssues(collectElementIssues(input));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, matchId, hasReview, hasGapReport]);

  // ── Viewport tracking (Pillar 2: scroll-aware selection) ──
  // ratioMap: anchorId → live intersection ratio (which issue cards are on screen).
  const ratioMapRef = useRef<Map<string, number>>(new Map());
  const [viewportTick, setViewportTick] = useState(0);
  // resolveTick: bump on DOM mutation (step swap / late card mount) so the observer
  // re-attaches to anchors that appear after the issues were collected.
  const [resolveTick, setResolveTick] = useState(0);

  // An issue is "active-able" only if its card is ON SCREEN right now. Empty anchor
  // ("") = whole-document issue with no card → never wins the in-view pick (it is the
  // corner fallback below). A stale ratio for an unmounted card is guarded by the
  // getElementById check.
  const anchorInView = useCallback((anchorId: string): boolean => {
    if (!anchorId) return false;
    if ((ratioMapRef.current.get(anchorId) ?? 0) <= 0) return false;
    return typeof document !== "undefined" && !!document.getElementById(anchorId);
  }, []);

  // Stable signal of the visible queue identity (changes on re-scan / dismiss) → it
  // drives both the observer re-attach and the pick recompute.
  const visibleSig = useCompanionStore((s) =>
    visibleIssues(s).map((i) => `${i.id}@${i.anchorId}#${i.severity}`).join("|"),
  );

  // ── IntersectionObserver: observe every current issue anchor; update ratios. ──
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || typeof document === "undefined") return;
    const map = ratioMapRef.current;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          if (id) map.set(id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => setViewportTick((t) => t + 1));
      },
      { root: null, rootMargin: IN_VIEW_ROOT_MARGIN, threshold: IN_VIEW_THRESHOLDS },
    );
    // Prune ratios for ids no longer in the queue; (re)observe the current anchors.
    const ids = new Set(
      visibleIssues(useCompanionStore.getState()).map((i) => i.anchorId).filter(Boolean),
    );
    for (const key of [...map.keys()]) if (!ids.has(key)) map.delete(key);
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [visibleSig, resolveTick]);

  // ── Resolvability tick: DOM mutation (step swap / async card mount) → re-attach
  //    the observer to anchors that appear after collection. rAF-coalesced. ──
  useEffect(() => {
    if (typeof document === "undefined") return;
    const scopeEl = document.getElementById("diagnosis-root") ?? document.body;
    let raf = 0;
    const obs = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setResolveTick((t) => t + 1);
      });
    });
    obs.observe(scopeEl, { childList: true, subtree: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, []);

  // ── Pick the worst IN-VIEW card issue (scroll-aware). ──
  // Read imperatively from getState() (NOT a subscription): `visibleIssues` returns
  // a NEW array each call, so subscribing here would make useSyncExternalStore see a
  // changed snapshot every render → infinite loop ("getSnapshot should be cached").
  // Re-renders are driven by `visibleSig` (stable string) + `viewportTick` + `resolveTick`.
  void viewportTick;
  void resolveTick;
  const visible = visibleIssues(useCompanionStore.getState());
  const inViewActive = pickActiveResolvableIssue(visible, anchorInView);
  // Whole-document fallback: surface a no-card issue (missing_section/parse_quality)
  // at the home corner ONLY when there is no card-anchored issue at all — so it never
  // steals focus from a visible gap/evidence card.
  const hasCardIssues = visible.some((i) => i.anchorId);
  const emptyFallback = !hasCardIssues ? (visible.find((i) => !i.anchorId) ?? null) : null;
  const active = inViewActive ?? emptyFallback;

  const activeId = active?.id ?? null;
  const activeAnchorId = active?.anchorId ?? null; // "" for the whole-document fallback
  // "1 of N" within the currently-IN-VIEW slice (honest: only cards on screen now);
  // for the whole-document fallback there is exactly one.
  const inViewSlice = inViewActive
    ? visible.filter((i) => anchorInView(i.anchorId))
    : emptyFallback
      ? [emptyFallback]
      : [];
  const activeIndex = active ? Math.max(inViewSlice.findIndex((i) => i.id === active.id), 0) : 0;
  const visibleCount = inViewSlice.length;

  // Track the previously-anchored card so we can detect a genuinely NEW card.
  const prevAnchorRef = useRef<string | null>(null);

  useEffect(() => {
    const store = useCompanionStore.getState();
    // Auto-surfacing disabled (owner decision 06-23): never register/activate the
    // diagnosis:issue context. Ensure any stale registration is torn down so the
    // calm corner chat advisor is the sole diagnosis context.
    if (!AUTO_SURFACING_ENABLED) {
      store.unregisterContext(ISSUE_CONTEXT_ID);
      prevAnchorRef.current = null;
      return;
    }
    if (!activeId) {
      // Nothing in view + no whole-doc fallback → honest-empty. Drop our context;
      // leave legacy contexts (results/proveit) to their own effects.
      store.unregisterContext(ISSUE_CONTEXT_ID);
      prevAnchorRef.current = null;
      return;
    }

    // Element-issues subsume the legacy results/proveit surfacing → gate them off so
    // only ONE bubble (diagnosis:issue) is ever active (anti-Clippy).
    store.unregisterContext("diagnosis:results");
    store.unregisterContext("diagnosis:proveit");

    // A genuinely NEW card (scroll-switch or queue advance) = new advice → the dolphin
    // swims to it: re-enable anchoring (positionMode "manual"→"auto") + clear the
    // session dismiss so the bubble re-opens. Re-pointing to the SAME card (scroll
    // jitter that does not change the winner) does NOT re-pop.
    const isNewCard = prevAnchorRef.current !== activeAnchorId;
    if (isNewCard) {
      store.resetPositionMode();
      store.clearDismissed(ISSUE_CONTEXT_ID);
    }
    prevAnchorRef.current = activeAnchorId;

    store.registerContext({
      id: ISSUE_CONTEXT_ID,
      priority: 30, // above legacy results(10)/proveit(20)
      anchorId: activeAnchorId ?? "",
      getTurn: () => {
        // Read the freshest in-view issue at render time (post-dismiss / post-scroll
        // re-point); fall back to the last computed active (e.g. the whole-doc fallback).
        const fresh = pickActiveResolvableIssue(
          visibleIssues(useCompanionStore.getState()),
          anchorInView,
        );
        const issue = fresh ?? active;
        // Phase A commentary kinds render via DiagnosisCommentarySkill (praise +
        // dimension-explain); real problem kinds keep the ElementIssueSkill turn.
        // A real problem ALWAYS out-ranks commentary in the severity sort, so the
        // commentary skill only surfaces when the active issue IS commentary.
        if (issue && isCommentaryKind(issue.kind)) {
          return {
            skill: "diagnosis_commentary",
            props: {
              issue,
              onCta: () => runCta(issue.ctaKind),
              // Light dismiss for explain_dimension only; praise carries no dismiss
              // (it's not a problem). The renderer hides the control when undefined.
              onDismiss:
                issue.kind === "explain_dimension"
                  ? () => useCompanionStore.getState().dismissIssue(issue.id, "once")
                  : undefined,
            },
          };
        }
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
