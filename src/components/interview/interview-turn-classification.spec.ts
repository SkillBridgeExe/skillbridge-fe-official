import { describe, expect, it } from "vitest";
import { parseRealtimeTurnClassification } from "./interview-turn-classification";

describe("parseRealtimeTurnClassification", () => {
  it("parses a valid semantic classification from the Realtime tool", () => {
    expect(
      parseRealtimeTurnClassification('{"transcript":"Cho tôi gợi ý","intent":"HINT","answer_signal":"PARTIAL"}'),
    ).toEqual({ transcript: "Cho tôi gợi ý", intent: "HINT", answerSignal: "PARTIAL" });
  });

  it("rejects malformed and unknown classifications", () => {
    expect(parseRealtimeTurnClassification("not-json")).toBeNull();
    expect(
      parseRealtimeTurnClassification('{"intent":"COACH_ME","answer_signal":"COMPLETE"}'),
    ).toBeNull();
  });
});
