import { useCallback, useEffect, useRef } from "react";
import { sendBestEffortInterviewEnd } from "@/api/interview-api";

/**
 * Fires a best-effort /interview/end when the user abandons a live interview:
 * on component unmount (SPA navigation away) and on `pagehide` (tab close /
 * mobile app kill — the reliable mobile exit signal). Without this the session
 * stays IN_PROGRESS forever and the paid quota silently leaks; with it the
 * backend scores the answered turns the user already paid for.
 *
 * Deliberately NOT wired to visibilitychange: merely switching tabs must not
 * end an in-progress interview.
 *
 * Call `markEnded()` when an explicit end starts so exit signals never
 * double-end the same session. A new sessionId re-arms the hook.
 */
export function useEndInterviewOnExit(input: {
  interviewing: boolean;
  sessionId: string | null;
}): { markEnded: () => void } {
  const endedRef = useRef(false);
  const inputRef = useRef(input);

  useEffect(() => {
    inputRef.current = input;
  });

  useEffect(() => {
    endedRef.current = false;
  }, [input.sessionId]);

  const fire = useCallback(() => {
    const { interviewing, sessionId } = inputRef.current;
    if (!interviewing || !sessionId || endedRef.current) return;
    endedRef.current = true;
    sendBestEffortInterviewEnd(sessionId);
  }, []);

  useEffect(() => {
    window.addEventListener("pagehide", fire);
    return () => {
      window.removeEventListener("pagehide", fire);
      fire();
    };
  }, [fire]);

  const markEnded = useCallback(() => {
    endedRef.current = true;
  }, []);

  return { markEnded };
}
