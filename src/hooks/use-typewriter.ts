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

import { useEffect, useRef, useState } from "react";

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

  // Refs survive across ticks without triggering re-renders.
  const codePointsRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const charsPerTickRef = useRef(1);

  useEffect(() => {
    // ── Fast path: no animation requested ──
    if (!opts.animate) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    // ── Prepare code-point array (R4) ──
    const cps = Array.from(text);
    codePointsRef.current = cps;
    indexRef.current = 0;

    if (cps.length === 0) {
      setDisplayed("");
      setDone(true);
      return;
    }

    // ── Speed scaling (R2): finish in ≤ MAX_DURATION_MS ──
    const totalTicks = Math.floor(MAX_DURATION_MS / TICK_MS);
    const perTick = Math.max(1, Math.ceil(cps.length / totalTicks));
    charsPerTickRef.current = perTick;

    // Start with empty string; first tick fires after TICK_MS.
    setDisplayed("");
    setDone(false);

    const id = setInterval(() => {
      const next = Math.min(
        indexRef.current + charsPerTickRef.current,
        codePointsRef.current.length,
      );
      indexRef.current = next;

      const slice = codePointsRef.current.slice(0, next).join("");
      setDisplayed(slice);

      if (next >= codePointsRef.current.length) {
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
