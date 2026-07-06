import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MentorRequests production copy", () => {
  const source = readFileSync(resolve(__dirname, "MentorRequests.tsx"), "utf8");

  it("does not expose demo accept/reschedule actions in the real request lifecycle", () => {
    expect(source).not.toContain("Demo actions");
    expect(source).not.toContain("handleMockAccept");
    expect(source).not.toContain("handleMockReschedule");
    expect(source).not.toContain("Accept Request");
    expect(source).not.toContain("Reschedule");
  });

  it("renders the real student goal instead of a mock note", () => {
    expect(source).toContain("booking.studentGoal");
    expect(source).not.toContain("Mock Note for Demo");
    expect(source).not.toContain("Looking for guidance on backend architecture");
  });

  it("does not show the removed deposit-then-remaining payment state in the new flow", () => {
    expect(source).not.toContain("deposit paid");
    expect(source).not.toContain("waiting for remaining");
    expect(source).not.toContain("AWAITING_REMAINING");
  });
});
