import { describe, expect, it } from "vitest";
import { OpenAIRealtimeSession, type RealtimeEvent } from "./openai-realtime";

describe("OpenAIRealtimeSession", () => {
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

    expect(sent[1]).toEqual({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
      },
    });
  });
});
