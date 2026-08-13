import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assessCandidateCapture,
  CandidateTurnBuffer,
  OpenAIRealtimeSession,
  type CandidateTurn,
  type RealtimeEvent,
} from "./openai-realtime";

function runtime(session: OpenAIRealtimeSession) {
  return session as unknown as {
    dataChannel: { readyState: string; send: ReturnType<typeof vi.fn> } | null;
    handleEvent: (raw: string) => void;
    activeResponse: unknown;
    responseQueue: unknown[];
    pendingPlaybackSpeech: Map<string, unknown>;
    ignoredPlaybackSpeechItemIds: Map<string, unknown>;
  };
}

function openChannel(session: OpenAIRealtimeSession) {
  const send = vi.fn();
  runtime(session).dataChannel = { readyState: "open", send };
  return send;
}

function sentEvents(send: ReturnType<typeof vi.fn>) {
  return send.mock.calls.map(([value]) => JSON.parse(String(value)) as Record<string, unknown>);
}

function candidateTurn(overrides: Partial<CandidateTurn> = {}): CandidateTurn {
  return {
    clientTurnId: "candidate-1",
    transcript: "Tôi phụ trách API auth và quản lý JWT session.",
    itemIds: ["item-1"],
    startedAtMs: 1_000,
    endedAtMs: 4_000,
    durationSeconds: 3,
    transcriptSegments: 1,
    meanLogprob: -0.2,
    ...overrides,
  };
}

describe("CandidateTurnBuffer v3", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("joins Vietnamese speech segments that continue inside the 1100 ms quiet window", () => {
    const completed = vi.fn();
    const buffer = new CandidateTurnBuffer(1_100, completed, 400);
    buffer.speechStarted("item-1", 1_000);
    buffer.addTranscript("Tôi phụ trách API", "item-1", [-0.2]);
    buffer.speechStopped("item-1", 2_000);
    vi.advanceTimersByTime(900);
    buffer.speechStarted("item-2", 2_900);
    buffer.addTranscript("và quản lý session", "item-2", [-0.4]);
    buffer.speechStopped("item-2", 3_600);
    vi.advanceTimersByTime(1_100);

    expect(completed).toHaveBeenCalledTimes(1);
    expect(completed).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript: "Tôi phụ trách API và quản lý session",
        itemIds: ["item-1", "item-2"],
        transcriptSegments: 2,
        meanLogprob: expect.closeTo(-0.3, 5),
      }),
    );
  });

  it("waits up to 400 ms for a late transcript after the quiet window", () => {
    const completed = vi.fn();
    const buffer = new CandidateTurnBuffer(1_100, completed, 400);
    buffer.speechStarted("item-late", 1_000);
    buffer.speechStopped("item-late", 2_000);
    vi.advanceTimersByTime(1_100);
    expect(completed).not.toHaveBeenCalled();
    buffer.addTranscript("Tôi làm JWT.", "item-late", [-0.5]);
    expect(completed).toHaveBeenCalledTimes(1);
  });
});

describe("candidate capture guard", () => {
  const base = {
    language: "vi" as const,
    currentQuestion: "Trong dự án gần nhất, phần nào bạn trực tiếp phụ trách?",
    lastAssistantTranscript: "Bạn phụ trách phần nào trong dự án gần nhất?",
  };

  it("rejects noisy CJK, prompt leaks, echo, and irrelevant short speech", () => {
    expect(assessCandidateCapture({ ...base, transcript: "我們要覺得" }).accepted).toBe(false);
    expect(assessCandidateCapture({ ...base, transcript: "You are English." }).accepted).toBe(false);
    expect(
      assessCandidateCapture({
        ...base,
        transcript: "Bạn phụ trách phần nào trong dự án gần nhất?",
      }).reason,
    ).toBe("echo");
    expect(assessCandidateCapture({ ...base, transcript: "nguyên lý ánh sáng" }).accepted).toBe(false);
  });

  it("accepts a short ownership answer with an API technical term despite low confidence", () => {
    expect(
      assessCandidateCapture({
        ...base,
        transcript: "tôi phụ trách phần nối API authen",
        meanLogprob: -1.4,
      }),
    ).toEqual({ accepted: true, reason: "accepted" });
  });
});

describe("OpenAIRealtimeSession single-loop scheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends exactly one tool-free response.create per candidate turn", () => {
    const session = new OpenAIRealtimeSession();
    const send = openChannel(session);
    const turn = candidateTurn();
    session.requestCandidateResponse(turn);
    session.requestCandidateResponse(turn);

    const creates = sentEvents(send).filter((event) => event.type === "response.create");
    expect(creates).toHaveLength(1);
    expect(creates[0]).toMatchObject({
      response: {
        tool_choice: "none",
        metadata: { purpose: "candidate_turn", clientTurnId: "candidate-1" },
      },
    });
    expect(JSON.stringify(creates[0])).not.toContain("decide_interview_turn");
  });

  it("does not release playback on response.done and starts the next response only after stopped", () => {
    const session = new OpenAIRealtimeSession();
    const send = openChannel(session);
    session.requestCandidateResponse(candidateTurn());
    session.requestControl({
      clientTurnId: "control-1",
      intent: "REPEAT",
      language: "vi",
      currentQuestion: "Câu hỏi hiện tại?",
    });
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.created",
        response: { id: "resp-1", status: "in_progress", metadata: { purpose: "candidate_turn", clientTurnId: "candidate-1" } },
      }),
    );
    runtime(session).handleEvent(
      JSON.stringify({ type: "output_audio_buffer.started", response_id: "resp-1" }),
    );
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.done",
        response: { id: "resp-1", status: "completed", metadata: { purpose: "candidate_turn", clientTurnId: "candidate-1" } },
      }),
    );
    expect(sentEvents(send).filter((event) => event.type === "response.create")).toHaveLength(1);
    runtime(session).handleEvent(
      JSON.stringify({ type: "output_audio_buffer.stopped", response_id: "resp-1" }),
    );
    expect(sentEvents(send).filter((event) => event.type === "response.create")).toHaveLength(2);
  });

  it("retries once only after failed terminal status without audio", () => {
    const session = new OpenAIRealtimeSession();
    const send = openChannel(session);
    session.requestCandidateResponse(candidateTurn());
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.created",
        response: { id: "resp-failed", status: "in_progress", metadata: { purpose: "candidate_turn", clientTurnId: "candidate-1" } },
      }),
    );
    vi.advanceTimersByTime(4_000);
    expect(sentEvents(send).filter((event) => event.type === "response.create")).toHaveLength(1);
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.done",
        response: { id: "resp-failed", status: "failed", metadata: { purpose: "candidate_turn", clientTurnId: "candidate-1" } },
      }),
    );
    expect(sentEvents(send).filter((event) => event.type === "response.create")).toHaveLength(2);
  });

  it("commits completed-without-audio through one synthetic stopped event without a duplicate response", () => {
    const session = new OpenAIRealtimeSession();
    const send = openChannel(session);
    const events: RealtimeEvent[] = [];
    session.on((event) => events.push(event));
    session.requestCandidateResponse(candidateTurn());
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.created",
        response: { id: "resp-text", status: "in_progress", metadata: { purpose: "candidate_turn", clientTurnId: "candidate-1" } },
      }),
    );
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.output_audio_transcript.done",
        response_id: "resp-text",
        transcript: "Bạn quản lý refresh token như thế nào?",
      }),
    );
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.done",
        response: { id: "resp-text", status: "completed", metadata: { purpose: "candidate_turn", clientTurnId: "candidate-1" } },
      }),
    );
    vi.advanceTimersByTime(250);

    expect(events.filter((event) => event.type === "ai_stopped")).toHaveLength(1);
    expect(sentEvents(send).filter((event) => event.type === "response.create")).toHaveLength(1);
  });

  it("ignores a short playback echo without cancelling or surfacing a candidate turn", () => {
    const session = new OpenAIRealtimeSession();
    const send = openChannel(session);
    const events: RealtimeEvent[] = [];
    session.on((event) => events.push(event));
    session.requestCandidateResponse(candidateTurn());
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.created",
        response: { id: "resp-voice", status: "in_progress", metadata: { purpose: "candidate_turn", clientTurnId: "candidate-1" } },
      }),
    );
    runtime(session).handleEvent(
      JSON.stringify({ type: "output_audio_buffer.started", response_id: "resp-voice" }),
    );
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.output_audio_transcript.done",
        response_id: "resp-voice",
        transcript:
          "Khi thiết kế session, bạn chọn HttpOnly, Secure và SameSite như thế nào?",
      }),
    );
    vi.advanceTimersByTime(700);
    runtime(session).handleEvent(
      JSON.stringify({
        type: "input_audio_buffer.speech_started",
        item_id: "echo",
        audio_start_ms: 800,
      }),
    );
    runtime(session).handleEvent(
      JSON.stringify({
        type: "input_audio_buffer.speech_stopped",
        item_id: "echo",
        audio_end_ms: 1_100,
      }),
    );
    runtime(session).handleEvent(
      JSON.stringify({
        type: "conversation.item.input_audio_transcription.completed",
        item_id: "echo",
        transcript: "HttpOnly",
        logprobs: [{ logprob: -0.2 }],
      }),
    );

    expect(sentEvents(send).filter((event) => event.type === "response.cancel")).toHaveLength(0);
    expect(sentEvents(send).filter((event) => event.type === "output_audio_buffer.clear")).toHaveLength(0);
    expect(sentEvents(send).filter((event) => event.type === "conversation.item.truncate")).toHaveLength(0);
    expect(events.filter((event) => event.type === "speech_started")).toHaveLength(0);
    expect(events.filter((event) => event.type === "user_transcript")).toHaveLength(0);
    expect(events.filter((event) => event.type === "speech_stopped")).toHaveLength(0);

    runtime(session).handleEvent(
      JSON.stringify({ type: "output_audio_buffer.stopped", response_id: "resp-voice" }),
    );
    expect(events.filter((event) => event.type === "ai_stopped")).toHaveLength(1);
    expect(runtime(session).ignoredPlaybackSpeechItemIds.size).toBe(1);
    vi.advanceTimersByTime(1_200);
    expect(runtime(session).ignoredPlaybackSpeechItemIds.size).toBe(0);
  });

  it("confirms a meaningful barge-in from its transcript before cancelling playback once", () => {
    const session = new OpenAIRealtimeSession();
    const send = openChannel(session);
    const events: RealtimeEvent[] = [];
    session.on((event) => events.push(event));
    session.requestCandidateResponse(candidateTurn());
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.created",
        response: { id: "resp-barge", status: "in_progress", metadata: { purpose: "candidate_turn", clientTurnId: "candidate-1" } },
      }),
    );
    runtime(session).handleEvent(
      JSON.stringify({ type: "output_audio_buffer.started", response_id: "resp-barge" }),
    );
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.output_item.added",
        response_id: "resp-barge",
        item: { id: "assistant-barge", role: "assistant" },
      }),
    );
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.output_audio_transcript.done",
        response_id: "resp-barge",
        transcript: "Bạn quản lý session và cookie như thế nào?",
      }),
    );
    vi.advanceTimersByTime(700);
    runtime(session).handleEvent(
      JSON.stringify({
        type: "input_audio_buffer.speech_started",
        item_id: "candidate-barge",
        audio_start_ms: 900,
      }),
    );

    expect(sentEvents(send).filter((event) => event.type === "response.cancel")).toHaveLength(0);

    runtime(session).handleEvent(
      JSON.stringify({
        type: "input_audio_buffer.speech_stopped",
        item_id: "candidate-barge",
        audio_end_ms: 1_600,
      }),
    );
    const transcriptEvent = JSON.stringify({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "candidate-barge",
      transcript: "Khoan, cho tôi hỏi lại chỗ session.",
      logprobs: [{ logprob: -0.1 }],
    });
    runtime(session).handleEvent(transcriptEvent);
    runtime(session).handleEvent(transcriptEvent);

    expect(sentEvents(send).filter((event) => event.type === "response.cancel")).toHaveLength(1);
    expect(sentEvents(send).filter((event) => event.type === "output_audio_buffer.clear")).toHaveLength(1);
    expect(sentEvents(send).filter((event) => event.type === "conversation.item.truncate")).toHaveLength(1);
    expect(
      events
        .filter((event) =>
          event.type === "speech_started" ||
          event.type === "user_transcript" ||
          event.type === "speech_stopped",
        )
        .map((event) => event.type),
    ).toEqual(["speech_started", "user_transcript", "speech_stopped"]);
  });

  it("clears buffered playback speech when the session disconnects", () => {
    const session = new OpenAIRealtimeSession();
    openChannel(session);
    session.requestCandidateResponse(candidateTurn());
    runtime(session).handleEvent(
      JSON.stringify({
        type: "response.created",
        response: { id: "resp-cleanup", status: "in_progress", metadata: { purpose: "candidate_turn", clientTurnId: "candidate-1" } },
      }),
    );
    runtime(session).handleEvent(
      JSON.stringify({ type: "output_audio_buffer.started", response_id: "resp-cleanup" }),
    );
    runtime(session).handleEvent(
      JSON.stringify({ type: "input_audio_buffer.speech_started", item_id: "pending-echo" }),
    );

    expect(runtime(session).pendingPlaybackSpeech.size).toBe(1);

    runtime(session).dataChannel = null;
    session.disconnect();

    expect(runtime(session).pendingPlaybackSpeech.size).toBe(0);
  });
});
