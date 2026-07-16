// ─── useTypewriter (companion chat reveal) ─────────────────────────
// FE-only progressive text reveal for the companion chat bubbles.
// The hook is a PURE timer — no framer-motion, no matchMedia.
// The caller decides `animate` (reduced-motion lives in the component).
//
// Contract:
//   useTypewriter(text, { animate }): { displayed: string; done: boolean }
//
// • animate=false → displayed===text, done=true immediately (no timers).
// • animate=true  → displayed grows from "" to text; done flips true at the end.
// • Speed scales with length so full reveal completes in ≤ 2s (R2).
// • Advances by code points, never by UTF-16 index (R4 — no broken emoji/surrogates).
// • Interval is cleaned up on unmount or text change (R9).
// • Progress derives from ELAPSED TIME, not a tick counter — hidden tabs throttle
//   setInterval to ~1 tick/s (1/min after 5 idle minutes), and a counter would
//   stretch the 2s reveal into minutes with the chips hidden the whole way.

import { useEffect, useState } from "react";

/** Target wall-clock reveal duration (ms). Actual may be slightly shorter. */
const MAX_DURATION_MS = 2000;
/** setInterval tick (ms). Aim for ~30 fps without thrashing React state. */
const TICK_MS = 28;

export interface UseTypewriterOpts {
  animate: boolean;
}

export function useTypewriter(
  text: string,
  opts: UseTypewriterOpts,
): { displayed: string; done: boolean } {
  const [displayed, setDisplayed] = useState(() =>
    opts.animate ? "" : text,
  );
  const [done, setDone] = useState(() => !opts.animate);

  useEffect(() => {
    // ── Fast path: no animation requested ──
    if (!opts.animate) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    // ── Prepare code-point array (R4) ──
    const cps = Array.from(text);

    if (cps.length === 0) {
      setDisplayed("");
      setDone(true);
      return;
    }

    // ── Speed scaling (R2): finish in ≤ MAX_DURATION_MS, elapsed-based ──
    // Each tick derives the reveal position from wall-clock elapsed, so a
    // throttled background tab jumps straight to the right position on whatever
    // tick it does get, and completes on the first tick past the budget.
    const durationMs = Math.min(MAX_DURATION_MS, cps.length * TICK_MS);
    const startedAt = Date.now();

    // Start with empty string; first tick fires after TICK_MS.
    setDisplayed("");
    setDone(false);

    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(
        cps.length,
        Math.max(1, Math.ceil((elapsed / durationMs) * cps.length)),
      );
      setDisplayed(cps.slice(0, next).join(""));

      if (next >= cps.length) {
        setDone(true);
        clearInterval(id);
      }
    }, TICK_MS);

    // Cleanup on unmount or text/animate change (R9).
    return () => {
      clearInterval(id);
    };
  }, [text, opts.animate]);

  return { displayed, done };
}
