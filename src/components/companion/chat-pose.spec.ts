// @vitest-environment jsdom
// Wave 1: the chat skills' mascot pose is a pure function of two store facts —
// busy (a reply in flight) and the latest gate verdict. LLM never in the loop.
import { describe, expect, it } from "vitest";
import { chatPose } from "./CompanionShell";

describe("chatPose — mascot emotion for the chat skills", () => {
  it("busy wins: thinking while a reply is in flight, whatever the last verdict", () => {
    expect(chatPose(true, "grounded")).toBe("thinking");
    expect(chatPose(true, "refusal")).toBe("thinking");
    expect(chatPose(true, null)).toBe("thinking");
  });

  it("refusal → sheepish, grounded → confident, canned/null → tip (default advisor pose)", () => {
    expect(chatPose(false, "refusal")).toBe("sheepish");
    expect(chatPose(false, "grounded")).toBe("confident");
    expect(chatPose(false, "canned")).toBe("tip");
    expect(chatPose(false, null)).toBe("tip");
  });
});
