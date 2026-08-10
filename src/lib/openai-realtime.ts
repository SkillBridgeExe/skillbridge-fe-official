export type RealtimeEventType =
  | "connected"
  | "disconnected"
  | "user_transcript"
  | "ai_transcript"
  | "ai_transcript_done"
  | "ai_speaking"
  | "ai_stopped"
  | "speech_started"
  | "speech_stopped"
  | "tool_call"
  | "transcript_failed"
  | "error";

export interface RealtimeToolCall {
  callId: string;
  name: string;
  arguments: string;
}

export interface RealtimeEvent {
  type: RealtimeEventType;
  data?: string;
  responseId?: string;
  itemId?: string;
  toolCall?: RealtimeToolCall;
}

export type RealtimeEventCallback = (event: RealtimeEvent) => void;

interface ConnectRealtimeOptions {
  clientSecret: string;
  stream: MediaStream;
  initialMicEnabled?: boolean;
}

export class OpenAIRealtimeSession {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private localStream: MediaStream | null = null;
  private listeners: RealtimeEventCallback[] = [];
  private pendingPayloads: unknown[] = [];
  private connected = false;
  private connectAbortController: AbortController | null = null;
  private handledToolCallIds = new Set<string>();
  private activeAssistantItemId: string | null = null;
  private activeAudioStartedAt: number | null = null;

  on(callback: RealtimeEventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback);
    };
  }

  async connect({ clientSecret, stream, initialMicEnabled = true }: ConnectRealtimeOptions): Promise<void> {
    this.disconnect();

    const pc = new RTCPeerConnection();
    const dc = pc.createDataChannel("oai-events");
    this.peerConnection = pc;
    this.connectAbortController = new AbortController();
    this.dataChannel = dc;
    this.localStream = stream;

    this.remoteAudio = document.createElement("audio");
    this.remoteAudio.autoplay = true;

    pc.ontrack = (event) => {
      if (this.remoteAudio && event.streams[0]) {
        this.remoteAudio.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        this.connected = true;
        this.emit({ type: "connected" });
      }

      if (["closed", "disconnected", "failed"].includes(pc.connectionState)) {
        this.connected = false;
        this.emit({ type: "disconnected" });
      }
    };

    dc.onopen = () => {
      this.flushPendingPayloads();
    };

    dc.onmessage = (event) => {
      this.handleEvent(event.data);
    };

    dc.onerror = () => {
      this.emit({ type: "error", data: "Realtime data channel error." });
    };

    for (const track of stream.getAudioTracks()) {
      track.enabled = initialMicEnabled;
      pc.addTrack(track, stream);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp,
      signal: this.connectAbortController.signal,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || "Failed to connect OpenAI Realtime.");
    }

    await pc.setRemoteDescription({
      type: "answer",
      sdp: await response.text(),
    });
  }

  setMicEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  submitToolOutput(callId: string, output: unknown): void {
    this.send({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output: JSON.stringify(output) },
    });
    this.send({ type: "response.create" });
  }

  cancelResponse(): void {
    this.send({ type: "response.cancel" });
    this.send({ type: "output_audio_buffer.clear" });
    if (this.activeAssistantItemId) {
      const elapsedMs = this.activeAudioStartedAt === null
        ? 0
        : Math.max(0, Math.round(performance.now() - this.activeAudioStartedAt));
      this.send({
        type: "conversation.item.truncate",
        item_id: this.activeAssistantItemId,
        content_index: 0,
        audio_end_ms: elapsedMs,
      });
    }
    this.activeAssistantItemId = null;
    this.activeAudioStartedAt = null;
  }

  sendText(text: string): void {
    const normalized = text.trim().normalize("NFC");
    if (!normalized) return;
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: normalized }],
      },
    });
    this.send({ type: "response.create" });
  }

  requestLiveInterviewClosing(language: "vi" | "en"): void {
    this.send({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        instructions:
          language === "vi"
            ? "Cảm ơn ứng viên bằng tiếng Việt trong 2-3 câu ngắn, nói buổi phỏng vấn sắp kết thúc, không hỏi thêm câu mới, và không đưa điểm số hoặc đáp án mẫu."
            : "Thank the candidate in 2-3 short English sentences, say the interview is ending soon, ask no new questions, and do not provide scores or model answers.",
      },
    });
  }

  /**
   * W120: nudge the candidate to land THIS answer — not to end the interview.
   *
   * Deliberately separate from `requestLiveInterviewClosing`, which announces the whole session
   * is wrapping up. Firing that at a per-question budget would tell a candidate 90 seconds into
   * question one that the interview is over.
   *
   * The line invites, never accuses: running long is not a rule the candidate broke.
   */
  requestAnswerPaceNudge(language: "vi" | "en"): void {
    this.send({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        instructions:
          language === "vi"
            ? "Nói MỘT câu tiếng Việt ngắn, thân thiện, mời ứng viên chốt lại ý chính của câu trả lời đang dở. Không hỏi câu mới, không nhận xét, không nói gì về thời gian hay việc họ nói dài."
            : "Say ONE short, warm English sentence inviting the candidate to land the main point of the answer they are already giving. Ask no new question, give no assessment, and say nothing about time or about them talking long.",
      },
    });
  }

  speakOfficialQuestion(question: string, language: "vi" | "en"): void {
    const trimmed = question.trim().normalize("NFC");
    if (!trimmed) return;

    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              language === "vi"
                ? `Hãy đọc lượt phỏng vấn chính thức sau bằng tiếng Việt tự nhiên. Chỉ đọc đúng nội dung này, không thêm điểm số, coaching hoặc lời giải thích: ${trimmed}`
                : `Read this official interviewer turn in natural English. Read only this content; do not add scoring, coaching, or explanation: ${trimmed}`,
          },
        ],
      },
    });
    this.send({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
      },
    });
  }

  explainOfficialQuestion(question: string, language: "vi" | "en"): void {
    const trimmed = question.trim().normalize("NFC");
    if (!trimmed) return;

    this.send({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        instructions:
          language === "vi"
            ? `Giải thích thật ngắn bằng tiếng Việt câu hỏi phỏng vấn hiện tại sau đây, không trả lời thay ứng viên và không hỏi câu mới: ${trimmed}`
            : `Briefly clarify this current interview question in English. Do not answer for the candidate and do not ask a new question: ${trimmed}`,
      },
    });
  }

  disconnect(): void {
    this.connected = false;
    this.connectAbortController?.abort();
    this.connectAbortController = null;

    if (this.dataChannel) {
      this.dataChannel.onopen = null;
      this.dataChannel.onmessage = null;
      this.dataChannel.onerror = null;
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteAudio) {
      this.remoteAudio.pause();
      this.remoteAudio.srcObject = null;
      this.remoteAudio = null;
    }

    this.localStream = null;
    this.pendingPayloads = [];
    this.handledToolCallIds.clear();
    this.activeAssistantItemId = null;
    this.activeAudioStartedAt = null;
    this.emit({ type: "disconnected" });
  }

  destroy(): void {
    this.disconnect();
    this.listeners = [];
  }

  get isConnected(): boolean {
    return this.connected;
  }

  private handleEvent(raw: unknown): void {
    if (typeof raw !== "string") return;

    let event: {
      type?: string;
      transcript?: string;
      delta?: string;
      response_id?: string;
      item_id?: string;
      call_id?: string;
      name?: string;
      arguments?: string;
      item?: { id?: string; role?: string };
      error?: { message?: string };
    };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    if (event.type === "error") {
      this.emit({ type: "error", data: (event.error?.message ?? "Realtime API error.").normalize("NFC") });
      return;
    }
    if (event.type === "conversation.item.input_audio_transcription.failed") {
      this.emit({ type: "transcript_failed", data: (event.error?.message ?? "Realtime transcription failed.").normalize("NFC") });
      return;
    }
    if (event.type === "conversation.item.input_audio_transcription.completed") {
      this.emit({ type: "user_transcript", data: event.transcript?.normalize("NFC") });
      return;
    }
    if (event.type === "input_audio_buffer.speech_started") {
      this.emit({ type: "speech_started" });
      return;
    }
    if (event.type === "input_audio_buffer.speech_stopped") {
      this.emit({ type: "speech_stopped" });
      return;
    }
    if (
      event.type === "response.function_call_arguments.done" &&
      event.call_id &&
      event.name &&
      !this.handledToolCallIds.has(event.call_id)
    ) {
      this.handledToolCallIds.add(event.call_id);
      this.emit({
        type: "tool_call",
        toolCall: { callId: event.call_id, name: event.name, arguments: event.arguments ?? "{}" },
      });
      return;
    }
    if (event.type === "response.output_item.added" && event.item?.role === "assistant") {
      this.activeAssistantItemId = event.item.id ?? null;
      return;
    }
    if (
      event.type === "response.output_audio_transcript.delta" ||
      event.type === "response.audio_transcript.delta"
    ) {
      this.emit({ type: "ai_transcript", data: event.delta?.normalize("NFC") });
      return;
    }
    if (
      event.type === "response.output_audio_transcript.done" ||
      event.type === "response.audio_transcript.done"
    ) {
      this.emit({
        type: "ai_transcript_done",
        data: event.transcript?.normalize("NFC"),
        responseId: event.response_id,
        itemId: event.item_id,
      });
      return;
    }
    if (event.type === "response.output_audio.delta" || event.type === "response.audio.delta") {
      if (this.activeAudioStartedAt === null) this.activeAudioStartedAt = performance.now();
      this.emit({ type: "ai_speaking" });
      return;
    }
    if (event.type === "response.output_audio.done" || event.type === "response.audio.done") {
      this.activeAssistantItemId = null;
      this.activeAudioStartedAt = null;
      this.emit({ type: "ai_stopped" });
    }
  }

  private send(payload: unknown): void {
    if (this.dataChannel?.readyState === "open") {
      this.dataChannel.send(JSON.stringify(payload));
      return;
    }
    this.pendingPayloads.push(payload);
  }

  private flushPendingPayloads(): void {
    const pending = [...this.pendingPayloads];
    this.pendingPayloads = [];
    for (const payload of pending) this.send(payload);
  }

  private emit(event: RealtimeEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
