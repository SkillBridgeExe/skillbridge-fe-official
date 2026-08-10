import { describe, expect, it } from "vitest";
import { interviewSessionReducer, initialInterviewSessionState } from "./interview-session-machine";

describe("interviewSessionReducer", () => {
  it("moves through listening, thinking, speaking, and barge-in", () => {
    const listening = interviewSessionReducer(initialInterviewSessionState, { type: "CONNECTED" });
    const thinking = interviewSessionReducer(listening, { type: "CANDIDATE_TURN_ENDED" });
    const speaking = interviewSessionReducer(thinking, { type: "ASSISTANT_AUDIO_STARTED" });
    const interrupted = interviewSessionReducer(speaking, { type: "CANDIDATE_INTERRUPTED" });

    expect(listening).toEqual({ status: "LISTENING" });
    expect(thinking).toEqual({ status: "THINKING" });
    expect(speaking.status).toBe("SPEAKING");
    expect(interrupted).toEqual({ status: "LISTENING" });
  });

  it("offers text fallback after reconnect timeout without ending the session", () => {
    const reconnecting = interviewSessionReducer(
      { status: "LISTENING" },
      { type: "CONNECTION_LOST", attempt: 1 },
    );
    const fallback = interviewSessionReducer(reconnecting, { type: "RECONNECT_TIMEOUT" });

    expect(reconnecting).toEqual({ status: "RECONNECTING", attempt: 1 });
    expect(fallback).toEqual({ status: "TEXT_FALLBACK", reason: "reconnect_timeout" });
  });
});
