import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatDuration } from "./interview-view-model";
import type { AnswerPaceState } from "@/hooks/use-answer-pace";

const RING_SIZE = 40;
const STROKE_WIDTH = 3;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Whether the user prefers reduced motion. Safe in jsdom (optional-chaining). */
const prefersReducedMotion = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

interface AnswerPaceRingProps {
  pace: AnswerPaceState;
  className?: string;
}

/**
 * W120 — Small countdown ring displayed in voice mode when timeBudgetSeconds is present.
 * Shows elapsed vs ceiling (2×budget) as a circular progress.
 * Changes color at budget threshold (nudge point).
 *
 * Design rules:
 *  - Only renders when pace.budgetSeconds is not null (voice mode + budget present).
 *  - Before budget: no ring shown at all (most answers are 40-70s).
 *  - At/after budget (nudge fired): ring appears with warm amber color (NOT red — user did nothing wrong).
 *  - Smooth animation unless prefers-reduced-motion is set.
 */
export function AnswerPaceRing({ pace, className }: AnswerPaceRingProps) {
  const { t } = useTranslation("common");
  const reducedMotion = useMemo(prefersReducedMotion, []);

  // Nothing before the budget: a normal answer runs 40-70s and must never see a clock.
  if (pace.budgetSeconds == null || pace.progress == null || pace.elapsedSeconds == null) {
    return null;
  }
  if (!pace.nudgeFired) return null;

  const progress = Math.min(1, Math.max(0, pace.progress));
  const strokeOffset = CIRCUMFERENCE * (1 - progress);

  // Warm amber (nudge) — never red (spec: user is not doing anything wrong).
  const strokeColor = "stroke-amber-400";
  const textColor = "text-amber-600";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="timer"
      aria-label={t("interview.session.paceNudge")}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          className="text-muted-foreground/20"
        />
        {/* Progress arc */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeOffset}
          className={cn(
            strokeColor,
            !reducedMotion && "transition-[stroke-dashoffset] duration-1000 ease-linear",
          )}
        />
      </svg>
      <span
        className={cn(
          "absolute text-[9px] font-bold leading-none tabular-nums",
          textColor,
        )}
      >
        {formatDuration(pace.elapsedSeconds)}
      </span>
    </div>
  );
}
