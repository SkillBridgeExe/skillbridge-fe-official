// ─── useCompanionContext ────────────────────────────────────────────
// Hook: register a companion context + optionally observe its DOM node
// via IntersectionObserver to auto-activate the most-visible section.
// Phase 1: autoObserve defaults to false (user-invoked triggers only).

import { useEffect, type RefObject } from "react";
import {
  useCompanionStore,
  type CompanionTurn,
} from "@/store/useCompanionStore";
import { pickActiveContext } from "./pick-active-context";

// Module-level map of live visibility ratios so a single shared observer
// logic can pick the winner across all registered contexts.
const ratios = new Map<string, { ratio: number; priority?: number }>();

export function useCompanionContext(opts: {
  id: string;
  ref: RefObject<HTMLElement | null>;
  priority?: number;
  getTurn: () => CompanionTurn;
  autoObserve?: boolean;
}): void {
  const { id, ref, priority, getTurn, autoObserve = false } = opts;
  const registerContext = useCompanionStore((s) => s.registerContext);
  const unregisterContext = useCompanionStore((s) => s.unregisterContext);
  const activateContext = useCompanionStore((s) => s.activateContext);

  useEffect(() => {
    registerContext({ id, priority, getTurn });
    return () => {
      ratios.delete(id);
      unregisterContext(id);
    };
    // getTurn is stable per render-cycle; re-register on id change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, priority, registerContext, unregisterContext]);

  useEffect(() => {
    if (!autoObserve) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          ratios.set(id, { ratio: e.intersectionRatio, priority });
        const winner = pickActiveContext(
          [...ratios.entries()].map(([k, v]) => ({
            id: k,
            ratio: v.ratio,
            priority: v.priority,
          })),
        );
        if (winner) activateContext(winner);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [autoObserve, id, priority, ref, activateContext]);
}
