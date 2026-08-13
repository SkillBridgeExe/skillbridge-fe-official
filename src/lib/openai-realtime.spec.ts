import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CandidateTurnBuffer,
  OpenAIRealtimeSession,
  RealtimeResponseWatchdog,
  type RealtimeEvent,
} from "./openai-realtime";

describe("OpenAIRealtimeSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function collectEvents(session: OpenAIRealtimeSession) {
    const events: RealtimeEvent[] = [];
    session.on((event) => events.push(event));
    return events;
  }

  it("merges speech segments separated by less than 900 ms into one candidate turn", () => {
    vi.useFakeTimers();
    const completed = vi.fn();
    const buffer = new CandidateTurnBuffer(900, completed);

    buffer.speechStarted("item-1", 1_000);
    buffer.addTranscript("Tôi đã làm phần API", "item-1");
    buffer.speechStopped("item-1", 1_500);
    vi.advanceTimersByTime(800);
    buffer.speechStarted("item-2", 2_300);
    buffer.addTranscript("và quản lý session.", "item-2");
    buffer.speechStopped("item-2", 2_700);
    vi.advanceTimersByTime(900);

    expect(completed).toHaveBeenCalledOnce();
    expect(completed).toHaveBeenCalledWith({
      clientTurnId: expect.stringMatching(/^audio-/),
      transcript: "Tôi đã làm phần API và quản lý session.",
      itemIds: ["item-1", "item-2"],
      startedAtMs: 1_000,
      endedAtMs: 2_700,
      durationSeconds: 2,
      transcriptSegments: 2,
    });
    vi.useRealTimers();
  });

  it("buffers function arguments until the classification response is completed", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);
    const handleEvent = (value: unknown) =>
      (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
        JSON.stringify(value),
      );

    handleEvent({
      type: "response.function_call_arguments.done",
      response_id: "response-classify-1",
      call_id: "call-1",
      name: "decide_interview_turn",
      arguments:
        '{"transcript":"Tôi làm API","intent":"ANSWER","answer_signal":"PARTIAL"}',
    });
    expect(events).toEqual([]);

    handleEvent({
      type: "response.done",
      response: {
        id: "response-classify-1",
        status: "completed",
        metadata: {
          purpose: "classification",
          clientTurnId: "audio-turn-1",
        },
      },
    });

    expect(events).toContainEqual({
      type: "tool_call",
      responseId: "response-classify-1",
      clientTurnId: "audio-turn-1",
      toolCall: {
        callId: "call-1",
        name: "decide_interview_turn",
        arguments:
          '{"transcript":"Tôi làm API","intent":"ANSWER","answer_signal":"PARTIAL"}',
      },
    });
  });

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

  it("surfaces input audio transcription failures as non-fatal transcript_failed", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);

    (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
      JSON.stringify({
        type: "conversation.item.input_audio_transcription.failed",
        error: { message: "Unable to transcribe Vietnamese audio." },
      }),
    );

    // Per-utterance STT failure must NOT look like a session-fatal "error":
    // that mapping used to tear down voice mode and wipe the buffered answer.
    expect(events).toContainEqual({
      type: "transcript_failed",
      data: "Unable to transcribe Vietnamese audio.",
    });
    expect(
      events.some(
        (event) =>
          event.type === "transport_error" || event.type === "disconnected",
      ),
    ).toBe(false);
  });

  it("uses the WebRTC output buffer lifecycle instead of generation deltas", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);
    const handleEvent = (value: unknown) =>
      (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
        JSON.stringify(value),
      );

    handleEvent({
      type: "response.output_audio.delta",
      response_id: "response_1",
      delta: "base64-audio",
    });
    handleEvent({
      type: "response.done",
      response: { id: "response_1", status: "completed" },
    });

    expect(events.map((event) => event.type)).toEqual(["response_done"]);

    handleEvent({
      type: "output_audio_buffer.started",
      response_id: "response_1",
    });
    handleEvent({
      type: "output_audio_buffer.stopped",
      response_id: "response_1",
    });
    handleEvent({
      type: "output_audio_buffer.cleared",
      response_id: "response_2",
    });

    expect(events.slice(1)).toEqual([
      { type: "ai_speaking", responseId: "response_1" },
      { type: "ai_stopped", responseId: "response_1" },
      { type: "ai_interrupted", responseId: "response_2" },
    ]);
  });

  it("keeps recoverable server errors separate from transport failures", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);

    (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
      JSON.stringify({
        type: "error",
        error: {
          message: "Response already completed.",
          code: "response_cancel_not_active",
          event_id: "client_event_12",
        },
      }),
    );

    expect(events).toEqual([
      {
        type: "server_error",
        data: "Response already completed.",
        errorCode: "response_cancel_not_active",
        clientEventId: "client_event_12",
      },
    ]);
  });

  it("asks realtime to produce audio with the current response.create schema", () => {
    const session = new OpenAIRealtimeSession();
    const sent: unknown[] = [];
    (
      session as unknown as {
        dataChannel: { readyState: string; send: (payload: string) => void };
      }
    ).dataChannel = {
      readyState: "open",
      send: (payload: string) => sent.push(JSON.parse(payload)),
    };

    session.speakOfficialQuestion(
      "Ban hay gioi thieu ve du an gan nhat.",
      "vi",
    );

    expect(sent[0]).toEqual({
      event_id: expect.any(String),
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: expect.stringContaining(
              "Hãy đọc lượt phỏng vấn chính thức sau bằng tiếng Việt tự nhiên",
            ),
          },
        ],
      },
    });
    expect(sent[1]).toEqual({
      event_id: expect.any(String),
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        tool_choice: "none",
        metadata: { purpose: "official_question" },
      },
    });
  });

  it("forces exactly one classification tool call for a stable client turn id", () => {
    const session = new OpenAIRealtimeSession();
    const sent: Array<Record<string, unknown>> = [];
    (
      session as unknown as {
        dataChannel: { readyState: string; send: (payload: string) => void };
      }
    ).dataChannel = {
      readyState: "open",
      send: (payload: string) => sent.push(JSON.parse(payload)),
    };

    session.requestTurnClassification(
      "audio-turn-1",
      "Tôi làm API và quản lý session.",
    );

    expect(sent).toEqual([
      {
        event_id: expect.any(String),
        type: "response.create",
        response: {
          output_modalities: ["audio"],
          metadata: {
            purpose: "classification",
            clientTurnId: "audio-turn-1",
          },
          tool_choice: {
            type: "function",
            name: "decide_interview_turn",
          },
          instructions: expect.stringContaining(
            "Tôi làm API và quản lý session.",
          ),
        },
      },
    ]);
  });

  it("queues a second audio response until playback of the first response stops", () => {
    const session = new OpenAIRealtimeSession();
    const sent: Array<{ type?: string }> = [];
    (
      session as unknown as {
        dataChannel: { readyState: string; send: (payload: string) => void };
        handleEvent(raw: unknown): void;
      }
    ).dataChannel = {
      readyState: "open",
      send: (payload: string) => sent.push(JSON.parse(payload)),
    };
    const handleEvent = (value: unknown) =>
      (
        session as unknown as { handleEvent(raw: unknown): void }
      ).handleEvent(JSON.stringify(value));

    session.speakOfficialQuestion("Câu hỏi thứ nhất?", "vi");
    session.speakOfficialQuestion("Câu hỏi thứ hai?", "vi");
    expect(sent.filter((event) => event.type === "response.create")).toHaveLength(
      1,
    );

    handleEvent({
      type: "response.created",
      response: {
        id: "response-1",
        status: "in_progress",
        metadata: { purpose: "official_question" },
      },
    });
    handleEvent({
      type: "response.done",
      response: {
        id: "response-1",
        status: "completed",
        metadata: { purpose: "official_question" },
      },
    });
    expect(sent.filter((event) => event.type === "response.create")).toHaveLength(
      1,
    );

    handleEvent({
      type: "output_audio_buffer.stopped",
      response_id: "response-1",
    });
    expect(sent.filter((event) => event.type === "response.create")).toHaveLength(
      2,
    );
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
    vi.stubGlobal(
      "RTCPeerConnection",
      vi.fn(() => peerConnection),
    );
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

  it("can ask the live interviewer to close without injecting a user prompt", () => {
    const session = new OpenAIRealtimeSession();
    const sent: unknown[] = [];
    (
      session as unknown as {
        dataChannel: { readyState: string; send: (payload: string) => void };
      }
    ).dataChannel = {
      readyState: "open",
      send: (payload: string) => sent.push(JSON.parse(payload)),
    };

    session.requestLiveInterviewClosing("vi");

    expect(sent).toEqual([
      {
        event_id: expect.any(String),
        type: "response.create",
        response: {
          output_modalities: ["audio"],
          tool_choice: "none",
          metadata: { purpose: "closing" },
          instructions: expect.stringContaining("Cảm ơn ứng viên"),
        },
      },
    ]);
  });

  it("can connect with the microphone disabled for push-to-talk sessions", async () => {
    const dataChannel = {
      readyState: "open",
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
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
    vi.stubGlobal(
      "RTCPeerConnection",
      vi.fn(() => peerConnection),
    );
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
    const audioTrack = { enabled: true } as MediaStreamTrack;
    const stream = {
      getAudioTracks: () => [audioTrack],
    } as unknown as MediaStream;

    await new OpenAIRealtimeSession().connect({
      clientSecret: "client-secret",
      stream,
      initialMicEnabled: false,
    });

    expect(audioTrack.enabled).toBe(false);
    expect(peerConnection.addTrack).toHaveBeenCalledWith(audioTrack, stream);
  });

  it("surfaces the WebRTC handshake error returned by OpenAI", async () => {
    const dataChannel = {
      readyState: "connecting",
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
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
    vi.stubGlobal(
      "RTCPeerConnection",
      vi.fn(() => peerConnection),
    );
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
        ok: false,
        text: async () => "Invalid or expired realtime client secret.",
      })),
    );
    const stream = {
      getAudioTracks: () => [{ enabled: true }],
    } as unknown as MediaStream;

    await expect(
      new OpenAIRealtimeSession().connect({
        clientSecret: "expired-secret",
        stream,
      }),
    ).rejects.toThrow("Invalid or expired realtime client secret.");
  });

  it("emits semantic VAD and function call events without double-submitting a call", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);
    const handleEvent = (raw: unknown) =>
      (session as unknown as { handleEvent(value: unknown): void }).handleEvent(
        raw,
      );

    handleEvent(JSON.stringify({
      type: "input_audio_buffer.speech_started",
      item_id: "item-1",
      audio_start_ms: 120,
    }));
    handleEvent(JSON.stringify({
      type: "input_audio_buffer.speech_stopped",
      item_id: "item-1",
      audio_end_ms: 860,
    }));
    const toolEvent = JSON.stringify({
      type: "response.function_call_arguments.done",
      call_id: "call_1",
      name: "decide_interview_turn",
      arguments: "{}",
    });
    handleEvent(toolEvent);
    handleEvent(toolEvent);

    expect(events.map((event) => event.type)).toEqual([
      "speech_started",
      "speech_stopped",
      "tool_call",
    ]);
    expect(events[0]).toEqual({ type: "speech_started", itemId: "item-1", audioStartMs: 120 });
    expect(events[1]).toEqual({ type: "speech_stopped", itemId: "item-1", audioEndMs: 860 });
    expect(events[2]?.toolCall).toEqual({
      callId: "call_1",
      name: "decide_interview_turn",
      arguments: "{}",
    });
  });

  it("acknowledges tool output without exposing directive internals and resumes with response-scoped instructions", () => {
    const session = new OpenAIRealtimeSession();
    const sent: unknown[] = [];
    (
      session as unknown as {
        dataChannel: { readyState: string; send: (payload: string) => void };
      }
    ).dataChannel = {
      readyState: "open",
      send: (payload: string) => sent.push(JSON.parse(payload)),
    };

    session.submitToolOutput("call_1", {
      directiveId: "directive_1",
      action: "ADVANCE_TOPIC",
      fallbackQuestion: "Bạn đã trực tiếp xây dựng tính năng frontend nào?",
      language: "vi",
    });

    expect(sent[0]).toEqual({
      event_id: expect.any(String),
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: "call_1",
        output: JSON.stringify({
          status: "accepted",
          directiveId: "directive_1",
        }),
      },
    });
    expect(JSON.stringify(sent[0])).not.toMatch(
      /ADVANCE_TOPIC|fallbackQuestion|frontend nào/,
    );
    expect(sent[1]).toEqual({
      event_id: expect.any(String),
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        tool_choice: "none",
        metadata: {
          purpose: "interviewer_turn",
          directiveId: "directive_1",
        },
        instructions: expect.stringContaining(
          "Bạn đã trực tiếp xây dựng tính năng frontend nào?",
        ),
      },
    });
  });

  it("sends at most one active response.create for a directive", () => {
    const session = new OpenAIRealtimeSession();
    const sent: Array<{ type?: string }> = [];
    (
      session as unknown as {
        dataChannel: { readyState: string; send: (payload: string) => void };
      }
    ).dataChannel = {
      readyState: "open",
      send: (payload: string) => sent.push(JSON.parse(payload)),
    };
    const directive = {
      directiveId: "directive_once",
      action: "FOLLOW_UP" as const,
      fallbackQuestion: "B?n ?? tr?c ti?p quy?t ??nh ph?n k? thu?t n?o?",
      language: "vi" as const,
    };

    session.submitToolOutput("call_1", directive);
    session.submitToolOutput("call_1", directive);

    expect(
      sent.filter((event) => event.type === "response.create"),
    ).toHaveLength(1);
  });

  it("maps response creation, transcript response ids, and every response.done status", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);
    const handleEvent = (value: unknown) =>
      (session as unknown as { handleEvent(raw: unknown): void }).handleEvent(
        JSON.stringify(value),
      );

    handleEvent({
      type: "response.created",
      response: {
        id: "response_1",
        status: "in_progress",
        metadata: { directiveId: "directive_1" },
      },
    });
    handleEvent({
      type: "response.output_audio_transcript.delta",
      response_id: "response_1",
      delta: "Xin chào",
    });
    for (const status of [
      "completed",
      "cancelled",
      "failed",
      "incomplete",
    ] as const) {
      handleEvent({
        type: "response.done",
        response: {
          id: `response_${status}`,
          status,
          metadata: { directiveId: `directive_${status}` },
        },
      });
    }

    expect(events[0]).toEqual({
      type: "response_created",
      responseId: "response_1",
      directiveId: "directive_1",
      responseStatus: "in_progress",
    });
    expect(events[1]).toEqual({
      type: "ai_transcript",
      data: "Xin chào",
      responseId: "response_1",
    });
    expect(events.slice(2)).toEqual(
      ["completed", "cancelled", "failed", "incomplete"].map((status) => ({
        type: "response_done",
        responseId: `response_${status}`,
        directiveId: `directive_${status}`,
        responseStatus: status,
      })),
    );
  });
  it("never retries an active response and retries once only after terminal failure", () => {
    vi.useFakeTimers();
    const slow = vi.fn();
    const retry = vi.fn();
    const fallback = vi.fn();
    const watchdog = new RealtimeResponseWatchdog(4_000);

    watchdog.start("directive_1", { slow, retry, fallback });
    watchdog.markResponseCreated("directive_1");
    vi.advanceTimersByTime(4_000);
    expect(slow).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();

    watchdog.markResponseTerminal("directive_1", "failed");
    expect(retry).toHaveBeenCalledOnce();
    expect(fallback).not.toHaveBeenCalled();

    watchdog.markResponseCreated("directive_1");
    watchdog.markResponseTerminal("directive_1", "incomplete");
    expect(retry).toHaveBeenCalledOnce();
    expect(fallback).toHaveBeenCalledOnce();

    watchdog.start("directive_2", { slow, retry, fallback });
    watchdog.clearAll();
    vi.advanceTimersByTime(4_000);
    expect(retry).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("does not emit a lost-connection event for intentional cleanup", () => {
    const session = new OpenAIRealtimeSession();
    const events = collectEvents(session);

    session.disconnect();

    expect(events).toEqual([]);
  });
  it("cancels and truncates active output for barge-in, then clears handlers on disconnect", () => {
    const session = new OpenAIRealtimeSession();
    const sent: unknown[] = [];
    const dataChannel = {
      readyState: "open",
      send: (payload: string) => sent.push(JSON.parse(payload)),
      close: vi.fn(),
      onopen: vi.fn(),
      onmessage: vi.fn(),
      onerror: vi.fn(),
    };
    const peerConnection = {
      close: vi.fn(),
      ontrack: vi.fn(),
      onconnectionstatechange: vi.fn(),
    };
    (session as unknown as { dataChannel: typeof dataChannel }).dataChannel =
      dataChannel;
    (
      session as unknown as { peerConnection: typeof peerConnection }
    ).peerConnection = peerConnection;
    (
      session as unknown as { activeAssistantItemId: string }
    ).activeAssistantItemId = "item_1";
    (
      session as unknown as { activeAudioStartedAt: number }
    ).activeAudioStartedAt = performance.now() - 500;

    (
      session as unknown as {
        activeResponse: { responseId: string; waitForPlayback: boolean; generationDone: boolean };
      }
    ).activeResponse = {
      responseId: "response_1", waitForPlayback: true, generationDone: false,
    };
    session.cancelResponse();
    session.cancelResponse();
    session.disconnect();

    expect(sent).toEqual([
      { event_id: expect.any(String), type: "response.cancel" },
      { event_id: expect.any(String), type: "output_audio_buffer.clear" },
      {
        event_id: expect.any(String),
        type: "conversation.item.truncate",
        item_id: "item_1",
        content_index: 0,
        audio_end_ms: expect.any(Number),
      },
    ]);
    expect(dataChannel.onopen).toBeNull();
    expect(dataChannel.onmessage).toBeNull();
    expect(dataChannel.onerror).toBeNull();
    expect(peerConnection.ontrack).toBeNull();
    expect(peerConnection.onconnectionstatechange).toBeNull();
    expect(dataChannel.close).toHaveBeenCalledOnce();
    expect(peerConnection.close).toHaveBeenCalledOnce();
  });
});
