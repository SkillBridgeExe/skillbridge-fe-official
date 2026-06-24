// ─── ThinkingDots ───────────────────────────────────────────────────
// A tiny "the assistant is thinking" indicator: animated dots cycling
//   .  →  . .  →  . . .  →  loop   (CSS keyframes, ~1.3s total)
// paired with a short honest label.
//
// A11y (spec §4):
//   • the looping dots are DECORATIVE → aria-hidden, never announced as
//     a stream of periods;
//   • a SEPARATE <span role="status" aria-live="polite"> carries the
//     human label so screen readers announce "Đang suy nghĩ…", not "...";
//   • under prefers-reduced-motion (framer-motion useReducedMotion) we
//     render a STATIC "…" (no loop) — with a canonical CSS @media
//     fallback so the animation is killed even if JS misses it.
//
// Driven by CSS keyframes only — no JS timer / no re-render churn.

import { useReducedMotion } from "framer-motion";

export interface ThinkingDotsProps {
  /** Short honest label, e.g. t("companion.thinking") → "Đang suy nghĩ…" / "Thinking…". */
  label?: string;
  className?: string;
}

// One animation cycle ≈ 1.3s: four steps of ~0.32s ( . / . . / . . . / blank ).
const KEYFRAMES = `
@keyframes sb-thinking-dots {
  0%   { content: "."; }
  25%  { content: ". ."; }
  50%  { content: ". . ."; }
  75%  { content: ". ."; }
  100% { content: "."; }
}
.sb-thinking-dots__glyph::after {
  content: ".";
}
.thinking-dots--loop .sb-thinking-dots__glyph::after {
  animation: sb-thinking-dots 1.3s steps(1, end) infinite;
}
/* Canonical reduced-motion fallback — static ellipsis, no animation. */
@media (prefers-reduced-motion: reduce) {
  .thinking-dots--loop .sb-thinking-dots__glyph::after {
    animation: none;
    content: "…";
  }
}
`;

export function ThinkingDots({ label, className }: ThinkingDotsProps) {
  const prefersReducedMotion = useReducedMotion() === true;

  return (
    <span
      className={
        "inline-flex items-center gap-2 text-xs text-[#787774]" +
        (className ? ` ${className}` : "")
      }
    >
      <style>{KEYFRAMES}</style>

      {/* Decorative animated (or static) dots — hidden from assistive tech. */}
      <span
        data-testid="thinking-dots"
        data-static={prefersReducedMotion ? "true" : "false"}
        aria-hidden="true"
        className={
          "sb-thinking-dots inline-flex items-center" +
          (prefersReducedMotion ? "" : " thinking-dots--loop")
        }
      >
        {prefersReducedMotion ? (
          <span aria-hidden="true">…</span>
        ) : (
          // The visible glyph; CSS ::after cycles . → . . → . . .
          <span className="sb-thinking-dots__glyph" aria-hidden="true" />
        )}
      </span>

      {/* Human-readable status — the ONLY thing announced. */}
      <span role="status" aria-live="polite">
        {label}
      </span>
    </span>
  );
}

export default ThinkingDots;
