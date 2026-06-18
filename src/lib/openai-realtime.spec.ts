import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIRealtimeSession, type RealtimeEvent } from "./openai-realtime";

describe("OpenAIRealtimeSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function collectEvents(session: OpenAIRealtimeSession) {
    const events: RealtimeEvent[] = [];
    session.on((event) => events.push(event));
    return events;
  }

  it("maps current OpenAI Realtime output audio transcript events", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);

    (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
      JSON.stringify({
        type: "response.output_audio_transcript.delta",
        delta: "Xin chao",
      }),
    );

    expect(events).toContainEqual({ type: "ai_transcript", data: "Xin chao" });
  });

  it("normalizes Vietnamese user and AI transcripts to NFC", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);
    const vietnameseNfd = "Tiếng Việt có dấu".normalize("NFD");

    (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
      JSON.stringify({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: vietnameseNfd,
      }),
    );
    (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
      JSON.stringify({
        type: "response.output_audio_transcript.delta",
        delta: vietnameseNfd,
      }),
    );

    expect(events).toEqual([
      { type: "user_transcript", data: "Tiếng Việt có dấu" },
      { type: "ai_transcript", data: "Tiếng Việt có dấu" },
    ]);
  });

  it("surfaces input audio transcription failures", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);

    (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
      JSON.stringify({
        type: "conversation.item.input_audio_transcription.failed",
        error: { message: "Unable to transcribe Vietnamese audio." },
      }),
    );

    expect(events).toContainEqual({
      type: "error",
      data: "Unable to transcribe Vietnamese audio.",
    });
  });

  it("maps current OpenAI Realtime output audio speaking lifecycle events", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);

    (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
      JSON.stringify({
        type: "response.output_audio.delta",
        delta: "base64-audio",
      }),
    );
    (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
      JSON.stringify({
        type: "response.output_audio.done",
      }),
    );

    expect(events).toEqual([{ type: "ai_speaking" }, { type: "ai_stopped" }]);
  });

  it("asks realtime to produce audio with the current response.create schema", () => {
    const session = new OpenAIRealtimeSession();
    const sent: unknown[] = [];
    (session as unknown as { dataChannel: { readyState: string; send: (payload: string) => void } }).dataChannel = {
      readyState: "open",
      send: (payload: string) => sent.push(JSON.parse(payload)),
    };

    session.speakOfficialQuestion("Ban hay gioi thieu ve du an gan nhat.", "vi");

    expect(sent[0]).toEqual({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: expect.stringContaining(
              "Hãy đọc câu hỏi phỏng vấn chính thức sau bằng tiếng Việt tự nhiên",
            ),
          },
        ],
      },
    });
    expect(sent[1]).toEqual({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
      },
    });
  });

  it("does not override the server-owned realtime session configuration on connect", async () => {
    const sent: unknown[] = [];
    const dataChannel = {
      readyState: "open",
      send: (payload: string) => sent.push(JSON.parse(payload)),
      close: vi.fn(),
      onopen: null as ((event: Event) => void) | null,
      onmessage: null,
      onerror: null,
    };
    const peerConnection = {
      connectionState: "new",
      createDataChannel: vi.fn(() => dataChannel),
      addTrack: vi.fn(),
      createOffer: vi.fn(async () => ({ type: "offer", sdp: "offer-sdp" })),
      setLocalDescription: vi.fn(async () => undefined),
      setRemoteDescription: vi.fn(async () => undefined),
      close: vi.fn(),
      ontrack: null,
      onconnectionstatechange: null,
    };
    vi.stubGlobal("RTCPeerConnection", vi.fn(() => peerConnection));
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        autoplay: false,
        pause: vi.fn(),
        srcObject: null,
      })),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => "answer-sdp",
      })),
    );
    const stream = {
      getAudioTracks: () => [{ enabled: true }],
    } as unknown as MediaStream;
    const session = new OpenAIRealtimeSession();

    await session.connect({ clientSecret: "client-secret", stream });
    dataChannel.onopen?.({} as Event);

    expect(sent).toEqual([]);
  });
});
