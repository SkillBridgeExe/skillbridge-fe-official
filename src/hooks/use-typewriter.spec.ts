// @vitest-environment jsdom
// ─── use-typewriter.spec ────────────────────────────────────────────
// Vitest fake-timer tests for the companion chat typewriter hook.
// Spec items 1–6 from W119 brief.

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTypewriter } from "./use-typewriter";

// ── Helpers ──

/** Advance fake timers by `ms` inside an `act` boundary. */
function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useTypewriter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // ── 1. Progressive reveal ──
  it("progressive reveal: displayed grows over ticks and ends exactly equal to text", () => {
    const text = "Hello, world!";
    const { result } = renderHook(() =>
      useTypewriter(text, { animate: true }),
    );

    // Initially empty (before first tick).
    expect(result.current.displayed).toBe("");
    expect(result.current.done).toBe(false);

    // After some ticks, partial text.
    tick(100);
    expect(result.current.displayed.length).toBeGreaterThan(0);
    expect(result.current.displayed.length).toBeLessThanOrEqual(text.length);

    // After enough time (3s >> 2s budget), fully done.
    tick(3000);
    expect(result.current.displayed).toBe(text);
    expect(result.current.done).toBe(true);
  });

  // ── 2. animate=false → full text + done immediately, zero timers ──
  it("animate=false returns full text and done=true with zero timers", () => {
    const text = "No animation here.";
    const { result } = renderHook(() =>
      useTypewriter(text, { animate: false }),
    );

    expect(result.current.displayed).toBe(text);
    expect(result.current.done).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  // ── 3. Length scaling: a 2000-char text completes within ~2s ──
  it("length scaling: 2000-char text completes within ~2s of fake time", () => {
    const text = "A".repeat(2000);
    const { result } = renderHook(() =>
      useTypewriter(text, { animate: true }),
    );

    // Not done at the start.
    expect(result.current.done).toBe(false);

    // Advance 2100ms — generous enough to cover the ≤2s budget.
    tick(2100);
    expect(result.current.displayed).toBe(text);
    expect(result.current.done).toBe(true);
  });

  // ── 4. Code-point safety (emoji) ──
  it("code-point safety: every intermediate displayed is a code-point prefix of the text", () => {
    const text = "Hi 🇻🇳 xin chào 🧑‍💻!";
    const cps = Array.from(text);
    const snapshots: string[] = [];

    const { result } = renderHook(() =>
      useTypewriter(text, { animate: true }),
    );

    // Collect snapshots across many ticks.
    for (let t = 0; t < 80; t++) {
      tick(28);
      snapshots.push(result.current.displayed);
      if (result.current.done) break;
    }

    // Every snapshot must be a valid code-point prefix.
    for (const snap of snapshots) {
      const snapCps = Array.from(snap);
      // snap must be equal to the first N code points of text.
      const expected = cps.slice(0, snapCps.length).join("");
      expect(snap).toBe(expected);
    }

    // Final snapshot equals the full text.
    expect(snapshots[snapshots.length - 1]).toBe(text);
  });

  // ── 5. Unmount mid-animation → no timers left ──
  it("unmount mid-animation cleans up all timers", () => {
    const text = "This will be interrupted.";
    const { unmount } = renderHook(() =>
      useTypewriter(text, { animate: true }),
    );

    // Let a few ticks fire.
    tick(100);

    // Unmount mid-animation.
    unmount();

    // No dangling timers.
    expect(vi.getTimerCount()).toBe(0);
  });

  // ── 6. text prop changes mid-animation → old timer cleared ──
  it("text change mid-animation clears old timer and restarts", () => {
    const { result, rerender } = renderHook(
      ({ text, animate }: { text: string; animate: boolean }) =>
        useTypewriter(text, { animate }),
      { initialProps: { text: "First message", animate: true } },
    );

    // Let a few ticks fire.
    tick(100);
    const partial = result.current.displayed;
    expect(partial.length).toBeGreaterThan(0);

    // Rerender with a new text while old animation is in progress.
    rerender({ text: "Second message", animate: true });

    // After rerender, displayed should reset (starts fresh for new text).
    expect(result.current.done).toBe(false);

    // Advance enough to finish the second text.
    tick(3000);
    expect(result.current.displayed).toBe("Second message");
    expect(result.current.done).toBe(true);

    // Only one interval should exist at any time — after completion, zero.
    expect(vi.getTimerCount()).toBe(0);
  });

  // ── 7. Background-tab throttling: progress is elapsed-based, not tick-counted ──
  it("a throttled tab (wall clock passes, ticks are rare) completes on its next tick", () => {
    const text = "A".repeat(500);
    const { result } = renderHook(() =>
      useTypewriter(text, { animate: true }),
    );

    tick(28); // one normal early tick → partial reveal
    expect(result.current.done).toBe(false);
    expect(result.current.displayed.length).toBeLessThan(text.length);

    // Hidden tab: 5s of wall clock passes but NO intermediate ticks fire
    // (Chrome throttles setInterval to ~1 tick/s when the tab is hidden).
    act(() => {
      vi.setSystemTime(Date.now() + 5000);
      vi.advanceTimersByTime(28); // the single throttled tick
    });
    expect(result.current.displayed).toBe(text);
    expect(result.current.done).toBe(true);
  });

  // ── Edge: empty string ──
  it("handles empty text gracefully", () => {
    const { result } = renderHook(() =>
      useTypewriter("", { animate: true }),
    );

    expect(result.current.displayed).toBe("");
    expect(result.current.done).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
