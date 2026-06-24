import { describe, it, expect } from "vitest";
import { isGibberish, checkRolePosition } from "./input-quality";

describe("isGibberish", () => {
  it("flags repeated-char mash", () => {
    expect(isGibberish("sssssssss")).toBe(true);
    expect(isGibberish("aaaaa")).toBe(true);
  });
  it("flags a long no-vowel token", () => {
    expect(isGibberish("qwrtpsdfg")).toBe(true);
  });
  it("does NOT flag real text", () => {
    expect(isGibberish("Frontend Developer")).toBe(false);
    expect(isGibberish("Công nghệ thông tin")).toBe(false);
    expect(isGibberish("AI")).toBe(false); // too short to judge
    expect(isGibberish("Fintech")).toBe(false);
  });
});

describe("checkRolePosition", () => {
  it("accepts an empty string (presence handled elsewhere)", () => {
    expect(checkRolePosition("")).toEqual({ ok: true });
  });
  it("accepts a catalog role", () => {
    expect(checkRolePosition("Frontend Developer").ok).toBe(true);
  });
  it("accepts a free-form role not in the catalog", () => {
    expect(checkRolePosition("Security Researcher").ok).toBe(true);
  });
  it("flags gibberish", () => {
    expect(checkRolePosition("sssss").ok).toBe(false);
  });
  it("flags a near-miss typo of a role word and suggests the fix", () => {
    const r = checkRolePosition("AI Enginer");
    expect(r.ok).toBe(false);
    expect(r.suspectedTypo?.toLowerCase()).toContain("engineer");
  });
  it("does NOT flag legitimate plurals or derived words", () => {
    expect(checkRolePosition("Backend Developers").ok).toBe(true); // plural, not a typo
    expect(checkRolePosition("Team Leader").ok).toBe(true); // "leader" ≠ typo of "lead"
    expect(checkRolePosition("Software Engineers").ok).toBe(true); // plural
  });
});
