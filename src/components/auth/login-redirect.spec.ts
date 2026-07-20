import { describe, expect, it } from "vitest";
import { postLoginPath } from "./login-redirect";

describe("postLoginPath", () => {
  it("keeps the existing role dashboard as the default destination", () => {
    expect(postLoginPath("user")).toBe("/dashboard");
  });

  it("uses an explicit same-origin application return URL", () => {
    expect(postLoginPath("user", "/jobs/frontend-engineer?ref=list")).toBe("/jobs/frontend-engineer?ref=list");
  });

  it("rejects an absolute return URL", () => {
    expect(postLoginPath("user", "https://attacker.example")).toBe("/dashboard");
  });
});
