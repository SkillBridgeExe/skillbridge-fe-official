import { describe, it, expect } from "vitest";
import {
  AiGateError,
  assessAiInput,
  extractAiGateCode,
  getAiGateCode,
} from "./ai-input-gate";

describe("assessAiInput — FE mirror of the BE text-quality gate", () => {
  // Same failure cases as the BE suite.
  it.each(["", "   ", "aa", "AAA", "test test test", "asdf asdf"])(
    "fails %j with INSUFFICIENT_CONTEXT",
    (text) => {
      expect(assessAiInput(text)).toEqual({
        ok: false,
        reason: "INSUFFICIENT_CONTEXT",
      });
    },
  );

  it("fails blocklisted placeholder words", () => {
    expect(assessAiInput("lorem ipsum foo bar").ok).toBe(false);
  });

  it("fails single-character keyboard mash", () => {
    expect(assessAiInput("a b c d e f g").ok).toBe(false);
  });

  it("fails short repetitive input (unique/tokens ≤ 0.34)", () => {
    // 4 meaningful tokens (passes rule 1) but 1 unique out of 4 (fails rule 2).
    expect(assessAiInput("dev dev dev dev").ok).toBe(false);
  });

  it("fails digit-only tokens (no letter)", () => {
    expect(assessAiInput("123 456 789 012").ok).toBe(false);
  });

  it("passes a real English bullet", () => {
    expect(assessAiInput("Built admin dashboard with React")).toEqual({ ok: true });
  });

  it("passes a real Vietnamese sentence (unicode letters count)", () => {
    expect(
      assessAiInput("Tôi đã xây dựng hệ thống quản lý sinh viên bằng React và NodeJS"),
    ).toEqual({ ok: true });
  });

  it("passes 3 long meaningful tokens via the 25-char branch", () => {
    // 3 meaningful tokens (<4) but 34 letter chars (≥25) → rule 1 passes.
    expect(assessAiInput("Kubernetes administration experience").ok).toBe(true);
  });

  it("passes longer repetitive-ish text once tokens > 12", () => {
    expect(
      assessAiInput(
        "Phát triển API thanh toán, viết unit test, tối ưu truy vấn SQL và triển khai CI/CD cho hệ thống bán hàng",
      ).ok,
    ).toBe(true);
  });
});

describe("extractAiGateCode — defensive BE payload scan", () => {
  it("reads a top-level code field", () => {
    expect(extractAiGateCode({ code: "INSUFFICIENT_CONTEXT" })).toBe(
      "INSUFFICIENT_CONTEXT",
    );
  });

  it("reads an errorCode field", () => {
    expect(extractAiGateCode({ errorCode: "OFF_TOPIC" })).toBe("OFF_TOPIC");
  });

  it("reads a code nested in the envelope errors block", () => {
    expect(
      extractAiGateCode({
        success: false,
        message: "Input rejected",
        data: null,
        errors: { code: "OFF_TOPIC" },
      }),
    ).toBe("OFF_TOPIC");
  });

  it("falls back to scanning the message text", () => {
    expect(
      extractAiGateCode({ message: "INSUFFICIENT_CONTEXT: add real CV content" }),
    ).toBe("INSUFFICIENT_CONTEXT");
  });

  it("returns null for unrelated payloads", () => {
    expect(extractAiGateCode({ message: "Internal server error" })).toBeNull();
    expect(extractAiGateCode(null)).toBeNull();
  });
});

describe("getAiGateCode — code from a thrown error", () => {
  it("reads the code from an AiGateError", () => {
    expect(getAiGateCode(new AiGateError("OFF_TOPIC", "rejected"))).toBe("OFF_TOPIC");
  });

  it("scans plain Error messages (post-unwrapEnvelope)", () => {
    expect(getAiGateCode(new Error("Bad request: INSUFFICIENT_CONTEXT"))).toBe(
      "INSUFFICIENT_CONTEXT",
    );
  });

  it("returns null for ordinary errors", () => {
    expect(getAiGateCode(new Error("Network Error"))).toBeNull();
    expect(getAiGateCode(undefined)).toBeNull();
  });
});
