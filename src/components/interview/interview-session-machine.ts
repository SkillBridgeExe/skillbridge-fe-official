export type InterviewSessionState =
  | { status: "CONNECTING" }
  | { status: "LISTENING" }
  | { status: "THINKING" }
  | { status: "SPEAKING"; subtitle: string }
  | { status: "RECONNECTING"; attempt: number }
  | { status: "TEXT_FALLBACK"; reason: "reconnect_timeout" | "voice_unavailable" }
  | { status: "ENDED" }
  | { status: "ERROR"; message: string };

export type InterviewSessionAction =
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "CANDIDATE_TURN_ENDED" }
  | { type: "ASSISTANT_AUDIO_STARTED"; subtitle?: string }
  | { type: "ASSISTANT_SUBTITLE"; subtitle: string }
  | { type: "ASSISTANT_AUDIO_ENDED" }
  | { type: "CANDIDATE_INTERRUPTED" }
  | { type: "CONNECTION_LOST"; attempt: number }
  | { type: "RECONNECT_TIMEOUT" }
  | { type: "VOICE_UNAVAILABLE" }
  | { type: "SWITCH_TO_TEXT" }
  | { type: "END" }
  | { type: "FAIL"; message: string };

export const initialInterviewSessionState: InterviewSessionState = { status: "CONNECTING" };

export function interviewSessionReducer(
  state: InterviewSessionState,
  action: InterviewSessionAction,
): InterviewSessionState {
  switch (action.type) {
    case "CONNECTING":
      return { status: "CONNECTING" };
    case "CONNECTED":
      return { status: "LISTENING" };
    case "CANDIDATE_TURN_ENDED":
      return { status: "THINKING" };
    case "ASSISTANT_AUDIO_STARTED":
      return { status: "SPEAKING", subtitle: action.subtitle ?? "" };
    case "ASSISTANT_SUBTITLE":
      return state.status === "SPEAKING"
        ? { ...state, subtitle: `${state.subtitle}${action.subtitle}` }
        : state;
    case "ASSISTANT_AUDIO_ENDED":
    case "CANDIDATE_INTERRUPTED":
      return { status: "LISTENING" };
    case "CONNECTION_LOST":
      return { status: "RECONNECTING", attempt: action.attempt };
    case "RECONNECT_TIMEOUT":
      return { status: "TEXT_FALLBACK", reason: "reconnect_timeout" };
    case "VOICE_UNAVAILABLE":
    case "SWITCH_TO_TEXT":
      return { status: "TEXT_FALLBACK", reason: "voice_unavailable" };
    case "END":
      return { status: "ENDED" };
    case "FAIL":
      return { status: "ERROR", message: action.message };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
