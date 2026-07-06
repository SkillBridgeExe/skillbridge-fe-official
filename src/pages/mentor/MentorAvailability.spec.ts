import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./MentorAvailability.tsx", import.meta.url), "utf8");

describe("MentorAvailability source", () => {
  it("keeps weekly template workflow and generated slot actions wired", () => {
    expect(source).toContain("useMyMentorAvailabilityTemplate");
    expect(source).toContain("useSaveMentorAvailabilityTemplate");
    expect(source).toContain("useBlockMentorSlot");
    expect(source).toContain("useUnblockMentorSlot");
    expect(source).toContain('source === "TEMPLATE" && slot.status === "OPEN"');
    expect(source).toContain('source === "MANUAL" && slot.status === "OPEN"');
  });

  it("does not include demo availability handlers", () => {
    expect(source).not.toMatch(/demo|fake|mock/i);
  });
});
