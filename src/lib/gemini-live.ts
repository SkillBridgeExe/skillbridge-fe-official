// ─── Gemini Live Session Manager ─────────────────────────
// Manages WebSocket connection to Gemini Live API for real-time voice

import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { createMicCapture, PCMPlayer } from "./audio-utils";

export type LiveEventType =
  | "connected"
  | "disconnected"
  | "ai_speaking"
  | "ai_stopped"
  | "user_transcript"
  | "ai_transcript"
  | "error"
  | "interrupted";

export interface LiveEvent {
  type: LiveEventType;
  data?: string;
}

export type LiveEventCallback = (event: LiveEvent) => void;

interface LiveTokenResponse {
  token: string;
  wsUrl: string;
  model: string;
  authType: "ephemeral" | "apikey";
}

interface LiveApiPart {
  inlineData?: { data?: string };
}

interface LiveApiResponse {
  serverContent?: {
    modelTurn?: { parts?: LiveApiPart[] };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private micCapture: { stop: () => void; stream: MediaStream } | null = null;
  private pcmPlayer: PCMPlayer | null = null;
  private listeners: LiveEventCallback[] = [];
  private isConnected = false;
  private isMicActive = false;

  /** Subscribe to events */
  on(callback: LiveEventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private emit(event: LiveEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  /** Start a live interview session */
  async connect(topic: string, language: string, screeningQuestions?: string[]): Promise<void> {
    const { data: tokenData } = await httpClient.get<LiveTokenResponse>(
      API_ROUTES.INTERVIEW.LIVE_TOKEN,
    );

    // 2. Build WebSocket URL
    const authParam = tokenData.authType === "ephemeral"
      ? `access_token=${tokenData.token}`
      : `key=${tokenData.token}`;
    const wsUrl = `${tokenData.wsUrl}?${authParam}`;

    // 3. Connect WebSocket
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // 4. Build system instruction
        let systemText: string;

        if (screeningQuestions && screeningQuestions.length > 0) {
          // Screening mode — use company-provided questions
          const questionsFormatted = screeningQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n");
          if (language === "vi") {
            systemText = [
              `Bạn là một nhà tuyển dụng HR chuyên nghiệp đang thực hiện một buổi phỏng vấn sàng lọc.`,
              `NGÔN NGỮ: Bạn PHẢI nói HOÀN TOÀN bằng tiếng Việt. TUYỆT ĐỐI KHÔNG được dùng tiếng Anh trong bất kỳ câu nào, kể cả câu hỏi.`,
              `Nếu câu hỏi gốc bằng tiếng Anh, hãy dịch sang tiếng Việt rồi hỏi.`,
              "",
              "CÂU HỎI SÀNG LỌC (hỏi từng câu một, theo thứ tự):",
              questionsFormatted,
              "",
              "QUY TẮC:",
              "1. Bắt đầu bằng lời chào thân thiện, giới thiệu bản thân.",
              "2. Hỏi từng câu một, theo thứ tự.",
              "3. Sau mỗi câu trả lời, ghi nhận ngắn gọn rồi chuyển sang câu tiếp.",
              "4. Nếu câu trả lời chưa rõ, hỏi thêm trước khi chuyển câu.",
              `5. Sau khi hết ${screeningQuestions.length} câu, cảm ơn ứng viên và tóm tắt ngắn.`,
              "6. Thái độ ấm áp, chuyên nghiệp, động viên.",
              "7. Trả lời ngắn gọn, súc tích.",
            ].join("\n");
          } else {
            systemText = [
              `You are a professional HR interviewer conducting a screening interview.`,
              `LANGUAGE: You MUST speak entirely in English.`,
              "",
              "SCREENING QUESTIONS (ask these EXACT questions, one at a time):",
              questionsFormatted,
              "",
              "RULES:",
              "1. Start with a brief friendly greeting, introduce yourself.",
              "2. Ask each screening question one at a time, in order.",
              "3. After each answer, give a brief acknowledgment, then move to the next question.",
              "4. If an answer is unclear, ask a short follow-up before moving on.",
              `5. After all ${screeningQuestions.length} questions, thank the candidate and give a brief summary.`,
              "6. Be warm, professional, and encouraging.",
              "7. Keep responses concise.",
            ].join("\n");
          }
        } else {
          // Domain expert mode — 4-Phase Structured Interview (Mercor-style)
          if (language === "vi") {
            systemText = [
              `Bạn là "Minh", một người phỏng vấn kỹ thuật cấp cao tại một công ty công nghệ hàng đầu. Bạn đang thực hiện buổi phỏng vấn mô phỏng về: ${topic}.`,
              `NGÔN NGỮ: Bạn PHẢI nói HOÀN TOÀN bằng tiếng Việt. TUYỆT ĐỐI KHÔNG được dùng tiếng Anh trong bất kỳ câu nào. Thuật ngữ kỹ thuật có thể giữ nguyên (React, API, database) nhưng câu phải bằng tiếng Việt.`,
              "",
              "CẤU TRÚC PHỎNG VẤN (4 GIAI ĐOẠN):",
              "",
              "GIAI ĐOẠN 1 — GIỚI THIỆU (2 câu hỏi):",
              "- Bắt đầu bằng: 'Xin chào, tôi là Minh, phỏng vấn viên kỹ thuật. Hôm nay chúng ta sẽ trao đổi về [topic]. Buổi phỏng vấn gồm 4 phần. Sẵn sàng chưa?'",
              "- Câu 1: Hỏi về background/kinh nghiệm tổng quan của ứng viên",
              "- Câu 2: Hỏi về một dự án gần đây liên quan đến topic, vai trò cụ thể",
              "",
              "GIAI ĐOẠN 2 — CHUYÊN SÂU KỸ THUẬT (3 câu hỏi):",
              "- Câu 3-5: Hỏi sâu về kiến thức chuyên môn, khái niệm core, best practices",
              "- Tăng dần độ khó từ cơ bản → nâng cao",
              "",
              "GIAI ĐOẠN 3 — TÌNH HUỐNG THỰC TẾ (1 câu hỏi):",
              "- Câu 6: Đưa ra một scenario/problem thực tế, yêu cầu ứng viên giải quyết",
              "",
              "GIAI ĐOẠN 4 — HÀNH VI & ĐÁNH GIÁ (1 câu hỏi + tổng kết):",
              "- Câu 7: Hỏi về soft skills (teamwork, conflict, learning)",
              "- Sau câu 7: Tóm tắt đánh giá tổng thể, cho điểm trên thang 10, nêu điểm mạnh và cần cải thiện",
              "",
              "QUY TẮC QUAN TRỌNG:",
              "1. Hỏi từng câu một, KHÔNG gộp nhiều câu.",
              "2. KHÔNG BAO GIỜ nói quá 30 giây liên tục — trả lời ngắn gọn, súc tích.",
              "3. Sau mỗi câu trả lời, nhận xét ngắn (1-2 câu) rồi hỏi câu tiếp.",
              "4. Nếu ứng viên ngập ngừng, hỏi nhẹ: 'Bạn đã xong chưa?' trước khi chuyển câu.",
              "5. Nếu câu trả lời mơ hồ, hỏi follow-up trước khi chuyển sang câu tiếp.",
              "6. Khích lệ nhưng thẳng thắn — như cuộc trò chuyện tự nhiên.",
              "7. Khi chuyển giai đoạn, thông báo ngắn: 'Tốt, giờ chúng ta chuyển sang phần tiếp theo nhé.'",
            ].join("\n");
          } else {
            systemText = [
              `You are "Alex", a senior technical interviewer at a leading tech company. You are conducting a mock interview about: ${topic}.`,
              `LANGUAGE: You MUST speak entirely in English.`,
              "",
              "INTERVIEW STRUCTURE (4 PHASES):",
              "",
              "PHASE 1 — INTRODUCTION (2 questions):",
              "- Start with: 'Hi, I'm Alex, your technical interviewer today. We'll be discussing [topic] across 4 sections. Ready to begin?'",
              "- Q1: Ask about candidate's background and general experience",
              "- Q2: Ask about a recent project related to the topic, their specific role",
              "",
              "PHASE 2 — TECHNICAL DEEP-DIVE (3 questions):",
              "- Q3-Q5: Deep technical questions about core concepts, best practices",
              "- Progressively increase difficulty from basic → advanced",
              "",
              "PHASE 3 — SCENARIO/PROBLEM-SOLVING (1 question):",
              "- Q6: Present a real-world scenario/problem, ask candidate to solve it",
              "",
              "PHASE 4 — BEHAVIORAL & EVALUATION (1 question + wrap-up):",
              "- Q7: Ask about soft skills (teamwork, conflict resolution, learning)",
              "- After Q7: Give overall evaluation, score out of 10, strengths and areas for improvement",
              "",
              "CRITICAL RULES:",
              "1. Ask ONE question at a time, NEVER combine multiple questions.",
              "2. NEVER speak for more than 30 seconds continuously — keep responses concise.",
              "3. After each answer, give brief feedback (1-2 sentences), then ask next question.",
              "4. If candidate hesitates, gently ask: 'Take your time. Are you finished?' before moving on.",
              "5. If an answer is vague, ask a follow-up before moving to the next question.",
              "6. Be encouraging but honest — make it feel like a natural conversation.",
              "7. When transitioning phases, briefly announce: 'Great, let's move on to the next section.'",
            ].join("\n");
          }
        }

        const config = {
          setup: {
            model: tokenData.model,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Charon",
                  },
                },
              },
            },
            // VAD config — tuned for interview: give user time to think
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
                endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
                prefixPaddingMs: 200,
                silenceDurationMs: 1200,
              },
            },
            systemInstruction: {
              parts: [{ text: systemText }],
            },
            // Context window compression for long sessions (audio = ~25 tokens/sec)
            contextWindowCompression: {
              slidingWindow: {
                targetTokens: 10000,
              },
            },
            // Transcription — no languageCode field supported at setup level
            // Language is enforced via systemInstruction instead
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
        };

        this.ws!.send(JSON.stringify(config));
      };

      this.ws.onmessage = async (event) => {
        try {
          const text = event.data instanceof Blob
            ? await event.data.text()
            : event.data;
          const response = JSON.parse(text);

          // Check for error responses from the API
          if (response.error) {
            console.error("[live] API Error:", JSON.stringify(response.error));
            this.emit({ type: "error", data: response.error.message || JSON.stringify(response.error) });
            return;
          }

          // Setup complete — session is ready!
          if (response.setupComplete) {
            this.isConnected = true;

            // Create PCM player for AI audio output
            this.pcmPlayer = new PCMPlayer(24000, (playing: boolean) => {
              this.emit({ type: playing ? "ai_speaking" : "ai_stopped" });
            });

            this.emit({ type: "connected" });

            // Send initial trigger to make AI start talking
            const trigger = {
              clientContent: {
                turns: [{
                  role: "user",
                  parts: [{ text: "Hello, please begin the interview." }],
                }],
                turnComplete: true,
              },
            };
            this.ws!.send(JSON.stringify(trigger));

            resolve();
            return;
          }

          this.handleResponse(response);
        } catch (err) {
          console.error("[live] Failed to parse message:", err, "Raw:", event.data?.toString().substring(0, 200));
        }
      };

      this.ws.onerror = (error) => {
        console.error("[live] WebSocket error:", error);
        this.emit({ type: "error", data: "WebSocket connection error. Check console (F12) for details." });
        reject(new Error("WebSocket connection failed"));
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        if (event.code !== 1000) {
          this.emit({ type: "error", data: `Connection closed (code ${event.code}): ${event.reason || "Unknown reason"}` });
        }
        this.emit({ type: "disconnected" });
      };
    });
  }

  // Transcript buffering — accumulate chunks until turnComplete
  private userTranscriptBuffer = "";
  private aiTranscriptBuffer = "";
  private userFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private aiFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly FLUSH_DELAY = 800; // ms of silence before flushing

  private flushUserTranscript(): void {
    if (this.userTranscriptBuffer.trim()) {
      this.emit({ type: "user_transcript", data: this.userTranscriptBuffer.trim() });
      this.userTranscriptBuffer = "";
    }
    if (this.userFlushTimer) { clearTimeout(this.userFlushTimer); this.userFlushTimer = null; }
  }

  private flushAiTranscript(): void {
    if (this.aiTranscriptBuffer.trim()) {
      this.emit({ type: "ai_transcript", data: this.aiTranscriptBuffer.trim() });
      this.aiTranscriptBuffer = "";
    }
    if (this.aiFlushTimer) { clearTimeout(this.aiFlushTimer); this.aiFlushTimer = null; }
  }

  /** Handle incoming WebSocket messages */
  private handleResponse(response: LiveApiResponse): void {
    // Audio data from AI
    if (response.serverContent?.modelTurn?.parts) {
      for (const part of response.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.pcmPlayer?.playChunk(part.inlineData.data);
        }
      }
    }

    // User speech transcription — buffer it
    if (response.serverContent?.inputTranscription?.text) {
      this.userTranscriptBuffer += response.serverContent.inputTranscription.text;
      // Reset debounce timer
      if (this.userFlushTimer) clearTimeout(this.userFlushTimer);
      this.userFlushTimer = setTimeout(() => this.flushUserTranscript(), this.FLUSH_DELAY);
    }

    // AI speech transcription — buffer it
    if (response.serverContent?.outputTranscription?.text) {
      this.aiTranscriptBuffer += response.serverContent.outputTranscription.text;
      // Reset debounce timer
      if (this.aiFlushTimer) clearTimeout(this.aiFlushTimer);
      this.aiFlushTimer = setTimeout(() => this.flushAiTranscript(), this.FLUSH_DELAY);
    }

    // Turn complete — flush all buffered transcripts
    if (response.serverContent?.turnComplete) {
      this.flushUserTranscript();
      this.flushAiTranscript();
    }

    // Interruption (user spoke while AI was speaking)
    if (response.serverContent?.interrupted) {
      this.flushAiTranscript(); // flush what AI said so far
      this.pcmPlayer?.stop();
      this.emit({ type: "interrupted" });
    }
  }

  /** Start microphone capture and stream to Gemini */
  async startMic(): Promise<void> {
    if (this.isMicActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.micCapture = await createMicCapture((pcmBase64) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Check for WebSocket backpressure
        if (this.ws.bufferedAmount > 50000) {
          console.warn(`[live] ⚠️ WebSocket backpressure: ${this.ws.bufferedAmount} bytes queued, skipping chunk`);
          return; // Skip this chunk to prevent queue buildup
        }

        const msg = {
          realtimeInput: {
            audio: {
              data: pcmBase64,
              mimeType: "audio/pcm;rate=16000",
            },
          },
        };
        this.ws.send(JSON.stringify(msg));
      }
    });

    this.isMicActive = true;
  }

  /** Stop microphone capture */
  stopMic(): void {
    if (this.micCapture) {
      this.micCapture.stop();
      this.micCapture = null;
    }
    this.isMicActive = false;
  }

  /** Send text message (alternative to speaking) */
  sendText(text: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg = {
        realtimeInput: {
          text: text,
        },
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** Disconnect and cleanup */
  disconnect(): void {
    this.stopMic();
    this.pcmPlayer?.destroy();
    this.pcmPlayer = null;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.listeners = [];
  }

  /** Check if connected */
  get connected(): boolean {
    return this.isConnected;
  }

  /** Check if mic is active */
  get micActive(): boolean {
    return this.isMicActive;
  }
}
