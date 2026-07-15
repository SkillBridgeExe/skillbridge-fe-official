import { useEffect, useRef, useState } from "react";
import { computeAnswerCeilingMs } from "@/components/interview/interview-view-model";

/** How often the ring redraws while an answer is running. */
const TICK_MS = 1000;

export interface UseAnswerPaceOptions {
  /** Current turn's answer budget in seconds. null → degrade (no timers, no UI). */
  timeBudgetSeconds: number | null | undefined;
  /** Whether the mic is currently open for the user (turn is active). */
  isMicOpen: boolean;
  /** Whether the interview is ending. */
  isEnding: boolean;
  /** Whether AI is currently speaking. */
  isAiSpeaking: boolean;
  /** Force-submit the answer: the hard ceiling was reached. */
  onCeilingReached: () => void;
  /** Soft nudge: the budget was reached. Must not end the interview. */
  onNudge: () => void;
}

export interface AnswerPaceState {
  /** Elapsed as a fraction of the ceiling (0..1). null when no budget or no live answer. */
  progress: number | null;
  /** Whether the soft nudge has already fired for this answer. */
  nudgeFired: boolean;
  /** Seconds elapsed since the mic opened for this answer. null when no budget. */
  elapsedSeconds: number | null;
  /** Budget in seconds. null when no budget. */
  budgetSeconds: number | null;
}

const IDLE: AnswerPaceState = {
  progress: null,
  nudgeFired: false,
  elapsedSeconds: null,
  budgetSeconds: null,
};

/**
 * W120 — per-turn answer pacing.
 *
 * Owns ONE ceiling timer per answer, armed when the mic opens and **never re-armed while the
 * candidate keeps talking**. That is the whole point: the existing idle-flush timer restarts on
 * every STT segment, so a candidate who never pauses is never submitted at all and can spend the
 * entire session on one question. This is the only thing that bounds an answer.
 *
 *   0 → budget    nothing shown; a normal answer (40-70s) never sees this hook's UI
 *   = budget      soft nudge — the AI invites them to land the point. Never a cut.
 *   = 2 × budget  force-submit
 *
 * No budget (legacy turn, text mode, BE not deployed) → every timer is a no-op and the state is
 * idle, so the UI degrades to exactly what existed before.
 *
 * State, not refs: the ring is rendered from what this returns, so a tick that only mutated a ref
 * would leave it frozen — the values below have to go through setState to reach the screen.
 */
export function useAnswerPace({
  timeBudgetSeconds,
  isMicOpen,
  isEnding,
  isAiSpeaking,
  onCeilingReached,
  onNudge,
}: UseAnswerPaceOptions): AnswerPaceState {
  const [state, setState] = useState<AnswerPaceState>(IDLE);

  // callbacks live in refs so a re-render never re-arms the timers below.
  const onCeilingReachedRef = useRef(onCeilingReached);
  onCeilingReachedRef.current = onCeilingReached;
  const onNudgeRef = useRef(onNudge);
  onNudgeRef.current = onNudge;

  const active = isMicOpen && !isEnding && !isAiSpeaking;
  const ceilingMs = computeAnswerCeilingMs(timeBudgetSeconds);
  const budget = ceilingMs === null ? null : (timeBudgetSeconds as number);

  useEffect(() => {
    if (!active || budget === null || ceilingMs === null) {
      setState(IDLE);
      return;
    }

    const startedAt = Date.now();
    setState({ progress: 0, nudgeFired: false, elapsedSeconds: 0, budgetSeconds: budget });

    const nudgeTimer = setTimeout(() => {
      setState((prev) => (prev.nudgeFired ? prev : { ...prev, nudgeFired: true }));
      onNudgeRef.current();
    }, budget * 1000);

    const ceilingTimer = setTimeout(() => onCeilingReachedRef.current(), ceilingMs);

    const tick = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      setState((prev) => ({
        ...prev,
        progress: Math.min(1, elapsedMs / ceilingMs),
        elapsedSeconds: Math.round(elapsedMs / 1000),
      }));
    }, TICK_MS);

    return () => {
      clearTimeout(nudgeTimer);
      clearTimeout(ceilingTimer);
      clearInterval(tick);
    };
  }, [active, budget, ceilingMs]);

  return state;
}
