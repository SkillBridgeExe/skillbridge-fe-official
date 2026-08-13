import { describe, expect, it } from "vitest";
import {
  interviewSessionReducer,
  initialInterviewSessionState,
} from "./interview-session-machine";

describe("interviewSessionReducer", () => {
  it("changes turn state without presenting app capture gating as user mute", () => {
    const listening = interviewSessionReducer(initialInterviewSessionState, {
      type: "CONNECTED",
    });
    const thinking = interviewSessionReducer(listening, {
      type: "CANDIDATE_TURN_ENDED",
    });
    const speaking = interviewSessionReducer(thinking, {
      type: "ASSISTANT_AUDIO_STARTED",
    });
    const interrupted = interviewSessionReducer(speaking, {
      type: "CANDIDATE_INTERRUPTED",
    });

    expect(listening).toMatchObject({
      transport: { status: "CONNECTED" },
      turn: { status: "LISTENING" },
      mic: { userMuted: false },
    });
    expect(thinking).toMatchObject({
      turn: { status: "THINKING" },
      mic: { userMuted: false },
    });
    expect(speaking).toMatchObject({
      turn: { status: "SPEAKING" },
      mic: { userMuted: false },
    });
    expect(interrupted).toMatchObject({
      turn: { status: "LISTENING" },
      mic: { userMuted: false },
    });
  });

  it("offers text fallback after reconnect timeout without ending the session", () => {
    const connected = interviewSessionReducer(initialInterviewSessionState, {
      type: "CONNECTED",
    });
    const reconnecting = interviewSessionReducer(connected, {
      type: "CONNECTION_LOST",
      attempt: 1,
    });
    const fallback = interviewSessionReducer(reconnecting, {
      type: "RECONNECT_TIMEOUT",
    });

    expect(reconnecting).toMatchObject({
      transport: { status: "RECONNECTING", attempt: 1 },
      mic: { userMuted: false },
    });
    expect(fallback).toMatchObject({
      transport: { status: "TEXT_FALLBACK", reason: "reconnect_timeout" },
      mic: { userMuted: false },
    });
  });

  it("preserves the user's mute choice through reconnect", () => {
    const connected = interviewSessionReducer(initialInterviewSessionState, {
      type: "CONNECTED",
    });
    const muted = interviewSessionReducer(connected, {
      type: "SET_USER_MUTED",
      muted: true,
    });
    const reconnecting = interviewSessionReducer(muted, {
      type: "CONNECTION_LOST",
      attempt: 1,
    });
    const restored = interviewSessionReducer(reconnecting, {
      type: "CONNECTED",
    });

    expect(restored.mic.userMuted).toBe(true);
  });
});
