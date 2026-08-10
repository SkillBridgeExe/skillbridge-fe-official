import type { RealtimeAnswerSignal, RealtimeCandidateIntent } from "@/api/interview-api";

const INTENTS = new Set<RealtimeCandidateIntent>([
  "ANSWER",
  "NO_ANSWER",
  "REPEAT",
  "CLARIFY",
  "EASIER",
  "HINT",
  "FEEDBACK",
  "SKIP",
  "END",
]);
const ANSWER_SIGNALS = new Set<RealtimeAnswerSignal>([
  "COMPLETE",
  "PARTIAL",
  "OFF_TOPIC",
  "NO_ANSWER",
]);

export interface RealtimeTurnClassification {
  transcript: string;
  intent: RealtimeCandidateIntent;
  answerSignal: RealtimeAnswerSignal;
}

export function parseRealtimeTurnClassification(
  rawArguments: string,
): RealtimeTurnClassification | null {
  try {
    const value = JSON.parse(rawArguments) as {
      transcript?: unknown;
      intent?: unknown;
      answer_signal?: unknown;
    };
    if (
      typeof value.transcript !== "string" ||
      !value.transcript.trim() ||
      typeof value.intent !== "string" ||
      !INTENTS.has(value.intent as RealtimeCandidateIntent) ||
      typeof value.answer_signal !== "string" ||
      !ANSWER_SIGNALS.has(value.answer_signal as RealtimeAnswerSignal)
    ) {
      return null;
    }
    return {
      transcript: value.transcript.trim().normalize("NFC"),
      intent: value.intent as RealtimeCandidateIntent,
      answerSignal: value.answer_signal as RealtimeAnswerSignal,
    };
  } catch {
    return null;
  }
}
