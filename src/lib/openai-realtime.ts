export type RealtimeEventType =
  | "connected"
  | "disconnected"
  | "user_transcript"
  | "ai_transcript"
  | "ai_speaking"
  | "ai_stopped"
  | "error";

export interface RealtimeEvent {
  type: RealtimeEventType;
  data?: string;
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

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
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
    this.emit({ type: "disconnected" });
  }

  get isConnected(): boolean {
    return this.connected;
  }

  private handleEvent(raw: unknown): void {
    if (typeof raw !== "string") return;

    let event: { type?: string; transcript?: string; delta?: string; error?: { message?: string } };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    if (event.type === "error") {
      this.emit({
        type: "error",
        data: (event.error?.message ?? "Realtime API error.").normalize("NFC"),
      });
      return;
    }

    if (event.type === "conversation.item.input_audio_transcription.failed") {
      this.emit({
        type: "error",
        data: (event.error?.message ?? "Realtime transcription failed.").normalize("NFC"),
      });
      return;
    }

    if (event.type === "conversation.item.input_audio_transcription.completed") {
      this.emit({ type: "user_transcript", data: event.transcript?.normalize("NFC") });
      return;
    }

    if (
      event.type === "response.output_audio_transcript.delta" ||
      event.type === "response.audio_transcript.delta"
    ) {
      this.emit({ type: "ai_transcript", data: event.delta?.normalize("NFC") });
      return;
    }

    if (event.type === "response.output_audio.delta" || event.type === "response.audio.delta") {
      this.emit({ type: "ai_speaking" });
      return;
    }

    if (event.type === "response.output_audio.done" || event.type === "response.audio.done") {
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
