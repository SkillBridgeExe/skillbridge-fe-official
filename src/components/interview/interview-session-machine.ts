export type InterviewTransportState =
  | { status: "CONNECTING" }
  | { status: "CONNECTED" }
  | { status: "RECONNECTING"; attempt: number }
  | {
      status: "TEXT_FALLBACK";
      reason: "reconnect_timeout" | "voice_unavailable";
    }
  | { status: "ENDED" }
  | { status: "ERROR"; message: string };

export type InterviewTurnState =
  | { status: "LISTENING" }
  | { status: "THINKING" }
  | { status: "SPEAKING"; subtitle: string };

export interface InterviewMicState {
  trackAvailable: boolean;
  userMuted: boolean;
}

export interface InterviewSessionState {
  transport: InterviewTransportState;
  turn: InterviewTurnState;
  mic: InterviewMicState;
}

export type InterviewSessionAction =
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "ASSISTANT_RESPONSE_QUEUED" }
  | { type: "CANDIDATE_TURN_ENDED" }
  | { type: "ASSISTANT_AUDIO_STARTED"; subtitle?: string }
  | { type: "ASSISTANT_SUBTITLE"; subtitle: string }
  | { type: "ASSISTANT_AUDIO_ENDED" }
  | { type: "CANDIDATE_INTERRUPTED" }
  | { type: "CONNECTION_LOST"; attempt: number }
  | { type: "RECONNECT_TIMEOUT" }
  | { type: "VOICE_UNAVAILABLE" }
  | { type: "SWITCH_TO_TEXT" }
  | { type: "SET_USER_MUTED"; muted: boolean }
  | { type: "SET_TRACK_AVAILABLE"; available: boolean }
  | { type: "END" }
  | { type: "FAIL"; message: string };

export const initialInterviewSessionState: InterviewSessionState = {
  transport: { status: "CONNECTING" },
  turn: { status: "LISTENING" },
  mic: { trackAvailable: false, userMuted: false },
};

export function interviewSessionReducer(
  state: InterviewSessionState,
  action: InterviewSessionAction,
): InterviewSessionState {
  switch (action.type) {
    case "CONNECTING":
      return { ...state, transport: { status: "CONNECTING" } };
    case "CONNECTED":
      return {
        ...state,
        transport: { status: "CONNECTED" },
        turn: { status: "LISTENING" },
      };
    case "ASSISTANT_RESPONSE_QUEUED":
    case "CANDIDATE_TURN_ENDED":
      return { ...state, turn: { status: "THINKING" } };
    case "ASSISTANT_AUDIO_STARTED":
      return {
        ...state,
        turn: { status: "SPEAKING", subtitle: action.subtitle ?? "" },
      };
    case "ASSISTANT_SUBTITLE":
      return state.turn.status === "SPEAKING"
        ? {
            ...state,
            turn: {
              ...state.turn,
              subtitle: state.turn.subtitle + action.subtitle,
            },
          }
        : state;
    case "ASSISTANT_AUDIO_ENDED":
    case "CANDIDATE_INTERRUPTED":
      return { ...state, turn: { status: "LISTENING" } };
    case "CONNECTION_LOST":
      return {
        ...state,
        transport: { status: "RECONNECTING", attempt: action.attempt },
      };
    case "RECONNECT_TIMEOUT":
      return {
        ...state,
        transport: {
          status: "TEXT_FALLBACK",
          reason: "reconnect_timeout",
        },
        turn: { status: "LISTENING" },
      };
    case "VOICE_UNAVAILABLE":
    case "SWITCH_TO_TEXT":
      return {
        ...state,
        transport: {
          status: "TEXT_FALLBACK",
          reason: "voice_unavailable",
        },
        turn: { status: "LISTENING" },
      };
    case "SET_USER_MUTED":
      return {
        ...state,
        mic: { ...state.mic, userMuted: action.muted },
      };
    case "SET_TRACK_AVAILABLE":
      return {
        ...state,
        mic: { ...state.mic, trackAvailable: action.available },
      };
    case "END":
      return {
        ...state,
        transport: { status: "ENDED" },
        mic: { ...state.mic, trackAvailable: false },
      };
    case "FAIL":
      return {
        ...state,
        transport: { status: "ERROR", message: action.message },
      };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
