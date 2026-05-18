// ─── Audio Utilities for Gemini Live ─────────────────────
// Following Google's official reference implementation:
// - AudioWorklet for capture (separate thread, zero main-thread blocking)
// - PCMPlayer for playback
// Reference: github.com/GoogleCloudPlatform/generative-ai/
//            gemini/multimodal-live-api/native-audio-websocket-demo-apps

/**
 * Capture microphone audio as PCM 16-bit 16kHz.
 * Uses AudioWorklet (Google's recommended approach) with
 * ScriptProcessorNode fallback for older browsers.
 */
export async function createMicCapture(
  onChunk: (pcmBase64: string) => void,
  sampleRate = 16000,
): Promise<{ stop: () => void; stream: MediaStream }> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioContext = new AudioContext({ sampleRate });
  const source = audioContext.createMediaStreamSource(stream);

  let cleanup: () => void;

  // Try AudioWorklet first (Google's official approach — runs on separate thread)
  try {
    await audioContext.audioWorklet.addModule("/audio-processors/capture.worklet.js");

    const workletNode = new AudioWorkletNode(audioContext, "audio-capture-processor");

    workletNode.port.onmessage = (event) => {
      if (event.data.type === "audio") {
        const float32 = event.data.data as Float32Array;
        const pcm16 = floatTo16BitPCM(float32);
        const base64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
        onChunk(base64);
      }
    };

    source.connect(workletNode);
    // AudioWorklet doesn't need to connect to destination
    // eslint-disable-next-line no-console
    console.log("[audio] ✅ Using AudioWorklet (separate thread — zero blocking)");

    cleanup = () => {
      workletNode.port.close();
      workletNode.disconnect();
      source.disconnect();
    };
  } catch (err) {
    // Fallback to ScriptProcessorNode for browsers that don't support AudioWorklet
    console.warn("[audio] ⚠️ AudioWorklet not available, falling back to ScriptProcessor:", err);

    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(float32);
      const base64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
      onChunk(base64);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    cleanup = () => {
      processor.disconnect();
      source.disconnect();
    };
  }

  return {
    stream,
    stop: () => {
      cleanup();
      audioContext.close();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

/**
 * PCM 24kHz player — queues and plays audio chunks smoothly.
 */
export class PCMPlayer {
  private audioContext: AudioContext;
  private scheduledTime = 0;
  private isPlaying = false;
  private onPlayStateChange?: (playing: boolean) => void;

  constructor(sampleRate = 24000, onPlayStateChange?: (playing: boolean) => void) {
    this.audioContext = new AudioContext({ sampleRate });
    this.onPlayStateChange = onPlayStateChange;
  }

  /** Queue a PCM chunk (base64 encoded 16-bit PCM) for playback */
  async playChunk(base64Data: string): Promise<void> {
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const pcm16 = base64ToInt16Array(base64Data);
    const float32 = pcm16BitToFloat(pcm16);

    const buffer = this.audioContext.createBuffer(1, float32.length, this.audioContext.sampleRate);
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    const startTime = Math.max(now, this.scheduledTime);
    this.scheduledTime = startTime + buffer.duration;

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onPlayStateChange?.(true);
    }

    source.onended = () => {
      if (this.audioContext.currentTime >= this.scheduledTime - 0.05) {
        this.isPlaying = false;
        this.onPlayStateChange?.(false);
      }
    };

    source.start(startTime);
  }

  /** Interrupt / stop current playback and clear schedule */
  interrupt(): void {
    this.scheduledTime = 0;
    this.isPlaying = false;
    this.onPlayStateChange?.(false);
    // Recreate context to kill all scheduled sources
    const rate = this.audioContext.sampleRate;
    this.audioContext.close();
    this.audioContext = new AudioContext({ sampleRate: rate });
  }

  /** Stop all audio and clear queue */
  stop(): void {
    this.interrupt();
  }

  /** Clean up */
  destroy(): void {
    this.audioContext.close();
  }
}

// ─── Conversion Utils ────────────────────────────────────

/** Convert Float32Array to 16-bit PCM Int16Array */
export function floatTo16BitPCM(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

/** Convert 16-bit PCM Int16Array to Float32Array */
export function pcm16BitToFloat(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

/** Convert ArrayBuffer to base64 string — optimized batch approach */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

/** Convert base64 string to Int16Array (16-bit PCM) */
export function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}
