// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { useEndInterviewOnExit } from "./use-end-interview-on-exit";
import { sendBestEffortInterviewEnd } from "@/api/interview-api";

vi.mock("@/api/interview-api", () => ({
  sendBestEffortInterviewEnd: vi.fn(),
}));

describe("useEndInterviewOnExit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("fires exactly one end call when unmounted mid-interview", () => {
    const { unmount } = renderHook(() =>
      useEndInterviewOnExit({ interviewing: true, sessionId: "session-1" }),
    );

    unmount();

    expect(sendBestEffortInterviewEnd).toHaveBeenCalledTimes(1);
    expect(sendBestEffortInterviewEnd).toHaveBeenCalledWith("session-1");
  });

  it("fires exactly once when pagehide is followed by unmount", () => {
    const { unmount } = renderHook(() =>
      useEndInterviewOnExit({ interviewing: true, sessionId: "session-1" }),
    );

    window.dispatchEvent(new Event("pagehide"));
    unmount();

    expect(sendBestEffortInterviewEnd).toHaveBeenCalledTimes(1);
  });

  it("does not fire when the phase is not interviewing", () => {
    const { unmount } = renderHook(() =>
      useEndInterviewOnExit({ interviewing: false, sessionId: "session-1" }),
    );

    window.dispatchEvent(new Event("pagehide"));
    unmount();

    expect(sendBestEffortInterviewEnd).not.toHaveBeenCalled();
  });

  it("does not fire without an active session", () => {
    const { unmount } = renderHook(() =>
      useEndInterviewOnExit({ interviewing: true, sessionId: null }),
    );

    unmount();

    expect(sendBestEffortInterviewEnd).not.toHaveBeenCalled();
  });

  it("does not fire after an explicit end was initiated", () => {
    const { result, unmount } = renderHook(() =>
      useEndInterviewOnExit({ interviewing: true, sessionId: "session-1" }),
    );

    result.current.markEnded();
    window.dispatchEvent(new Event("pagehide"));
    unmount();

    expect(sendBestEffortInterviewEnd).not.toHaveBeenCalled();
  });

  it("arms again for a new session after an explicit end", () => {
    const { result, rerender, unmount } = renderHook(
      (props: { interviewing: boolean; sessionId: string | null }) =>
        useEndInterviewOnExit(props),
      { initialProps: { interviewing: true, sessionId: "session-1" } },
    );

    result.current.markEnded();
    rerender({ interviewing: true, sessionId: "session-2" });
    unmount();

    expect(sendBestEffortInterviewEnd).toHaveBeenCalledTimes(1);
    expect(sendBestEffortInterviewEnd).toHaveBeenCalledWith("session-2");
  });
});
