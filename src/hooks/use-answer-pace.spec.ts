// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnswerPace } from "./use-answer-pace";

const BUDGET = 90;

function setup(overrides: Partial<Parameters<typeof useAnswerPace>[0]> = {}) {
  const onCeilingReached = vi.fn();
  const onNudge = vi.fn();
  const view = renderHook((props: Partial<Parameters<typeof useAnswerPace>[0]> = {}) =>
    useAnswerPace({
      timeBudgetSeconds: BUDGET,
      isMicOpen: true,
      isEnding: false,
      isAiSpeaking: false,
      onCeilingReached,
      onNudge,
      ...overrides,
      ...props,
    }),
  );
  return { ...view, onCeilingReached, onNudge };
}

describe("useAnswerPace", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("force-submits at the ceiling even though the candidate never stopped talking", () => {
    // the bug this exists for: the idle-flush timer re-arms on every STT segment, so a
    // continuous speaker is never submitted. This timer must not care about segments at all.
    const { onCeilingReached } = setup();

    act(() => void vi.advanceTimersByTime(BUDGET * 2 * 1000 - 1));
    expect(onCeilingReached).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(1));
    expect(onCeilingReached).toHaveBeenCalledTimes(1);
  });

  it("nudges at the budget and does not submit there", () => {
    const { onNudge, onCeilingReached } = setup();

    act(() => void vi.advanceTimersByTime(BUDGET * 1000));

    expect(onNudge).toHaveBeenCalledTimes(1);
    expect(onCeilingReached).not.toHaveBeenCalled();
  });

  it("nudges once per answer, not once per tick", () => {
    const { onNudge } = setup();

    act(() => void vi.advanceTimersByTime(BUDGET * 2 * 1000));

    expect(onNudge).toHaveBeenCalledTimes(1);
  });

  it("reports progress that actually advances while the answer runs", () => {
    // guards the ref-vs-state trap: mutating a ref never re-renders, which leaves the ring frozen
    // at 0 for the whole answer.
    const { result } = setup();
    expect(result.current.progress).toBe(0);

    act(() => void vi.advanceTimersByTime(45_000));

    expect(result.current.progress).toBeCloseTo(0.25, 2);
    expect(result.current.elapsedSeconds).toBe(45);
  });

  it("surfaces nudgeFired to the renderer, not just to a timer", () => {
    // the ring only draws once this flips; if it lived in a ref it would never reach the screen.
    const { result } = setup();
    expect(result.current.nudgeFired).toBe(false);

    act(() => void vi.advanceTimersByTime(BUDGET * 1000));

    expect(result.current.nudgeFired).toBe(true);
  });

  it("does nothing at all without a budget", () => {
    const { result, onCeilingReached, onNudge } = setup({ timeBudgetSeconds: null });

    act(() => void vi.advanceTimersByTime(10 * 60 * 1000));

    expect(onCeilingReached).not.toHaveBeenCalled();
    expect(onNudge).not.toHaveBeenCalled();
    expect(result.current.budgetSeconds).toBeNull();
    expect(result.current.progress).toBeNull();
  });

  it("does not run the clock while the interviewer is still speaking", () => {
    const { onCeilingReached } = setup({ isAiSpeaking: true });

    act(() => void vi.advanceTimersByTime(BUDGET * 4 * 1000));

    expect(onCeilingReached).not.toHaveBeenCalled();
  });

  it("stops the ceiling when the mic closes", () => {
    const { rerender, onCeilingReached } = setup();

    act(() => void vi.advanceTimersByTime(BUDGET * 1000));
    rerender({ isMicOpen: false });
    act(() => void vi.advanceTimersByTime(BUDGET * 4 * 1000));

    expect(onCeilingReached).not.toHaveBeenCalled();
  });

  it("gives the next answer a full ceiling of its own", () => {
    const { rerender, onCeilingReached } = setup();

    // first answer runs out
    act(() => void vi.advanceTimersByTime(BUDGET * 2 * 1000));
    expect(onCeilingReached).toHaveBeenCalledTimes(1);

    // mic cycles for the next turn, whose question is a follow-up with a smaller budget
    rerender({ isMicOpen: false });
    rerender({ isMicOpen: true, timeBudgetSeconds: 60 });

    // the follow-up's ceiling is 2 x 60s, measured from ITS mic-open — not what is left of the
    // previous answer's.
    act(() => void vi.advanceTimersByTime(60 * 2 * 1000 - 1));
    expect(onCeilingReached).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(1));
    expect(onCeilingReached).toHaveBeenCalledTimes(2);
  });
});
