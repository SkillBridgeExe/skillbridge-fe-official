import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PlaceholderPage public info template", () => {
  const source = readFileSync(resolve(__dirname, "PlaceholderPage.tsx"), "utf8");

  it("does not present published info pages as unfinished work", () => {
    expect(source).not.toContain("Under Construction");
    expect(source).not.toContain("Hammer");
    expect(source).not.toContain("Go to Dashboard");
  });

  it("uses mobile-first CTA and content layout guardrails", () => {
    expect(source).toContain("flex-col gap-3 sm:flex-row");
    expect(source).toContain("w-full");
    expect(source).toContain("sm:w-auto");
    expect(source).toContain("min-w-0");
    expect(source).toContain("break-words");
  });
});
