// ─── AI Mock Interview API Client ────────────────────
// All calls go through httpClient (Axios) for unified JWT + error handling.

import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";

export interface StartInterviewResponse {
  session_id: string;
  message: string;
  questions_left: number;
}

export interface AnswerResponse {
  message: string;
  questions_left: number;
  finished: boolean;
}

export async function startInterview(
  topic: string,
  language: string = "en",
): Promise<StartInterviewResponse> {
  const { data } = await httpClient.post<StartInterviewResponse>(API_ROUTES.INTERVIEW.START, {
    topic,
    language,
  });
  return data;
}

export async function submitAnswer(
  sessionId: string,
  userAnswer: string,
): Promise<AnswerResponse> {
  const { data } = await httpClient.post<AnswerResponse>(API_ROUTES.INTERVIEW.ANSWER, {
    session_id: sessionId,
    user_answer: userAnswer,
  });
  return data;
}

// ─── End Interview (AI Summary) ─────────────────────────
export interface EndInterviewResponse {
  summary: string;
  score: number;
  finished: boolean;
}

export async function endInterview(
  sessionId: string,
): Promise<EndInterviewResponse> {
  const { data } = await httpClient.post<EndInterviewResponse>(API_ROUTES.INTERVIEW.END, {
    session_id: sessionId,
  });
  return data;
}

// ─── Interview History ──────────────────────────────────
export interface HistoryEntry {
  id: number;
  topic: string;
  score: number;
  duration: number;
  summary: string;
  date: string;
  status: string;
}

export async function saveInterviewHistory(payload: {
  topic: string;
  score: number;
  duration: number;
  summary: string;
}): Promise<{ success: boolean; entry: HistoryEntry }> {
  const { data } = await httpClient.post(API_ROUTES.INTERVIEW.SAVE_HISTORY, payload);
  return data;
}

export async function getInterviewHistory(): Promise<{ history: HistoryEntry[] }> {
  const { data } = await httpClient.get(API_ROUTES.INTERVIEW.HISTORY);
  return data;
}

// ─── Gemini TTS ─────────────────────────────────────────
// Uses gemini-2.5-flash-preview-tts via backend endpoint

let currentAudioSource: AudioBufferSourceNode | null = null;
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Speak text using Gemini TTS (natural voice).
 * Falls back to browser TTS if Gemini fails.
 */
export async function speakWithGeminiTTS(
  text: string,
  language: string = "en",
  onStart?: () => void,
  onEnd?: () => void,
): Promise<void> {
  // Stop any current audio
  stopSpeaking();

  try {
    const { data: ttsData } = await httpClient.post<{ audio: string; mimeType: string }>(
      API_ROUTES.INTERVIEW.TTS,
      { text, language },
    );

    // Decode base64 audio
    const binaryString = atob(ttsData.audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();

    const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    currentAudioSource = source;

    source.onended = () => {
      currentAudioSource = null;
      onEnd?.();
    };

    onStart?.();
    source.start(0);
  } catch (err) {
    console.warn("[TTS] Gemini TTS failed, falling back to browser TTS:", err);
    // Fallback to browser speechSynthesis
    speakWithBrowserFallback(text, language, onStart, onEnd);
  }
}

/** Browser TTS fallback */
function speakWithBrowserFallback(
  text: string,
  language: string,
  onStart?: () => void,
  onEnd?: () => void,
): void {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "vi" ? "vi-VN" : "en-US";
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const langCode = utterance.lang;
  const preferred = voices.find(
    (v) => v.lang === langCode && (v.name.includes("Google") || v.name.includes("Microsoft") || v.name.includes("Natural")),
  ) || voices.find((v) => v.lang.startsWith(langCode.split("-")[0]));
  if (preferred) utterance.voice = preferred;

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}

/** Stop any ongoing TTS (Gemini or browser fallback) */
export function stopSpeaking(): void {
  // Stop Gemini TTS audio
  if (currentAudioSource) {
    try {
      currentAudioSource.stop();
    } catch { /* already stopped */ }
    currentAudioSource = null;
  }
  // Also stop browser TTS fallback
  window.speechSynthesis.cancel();
}
