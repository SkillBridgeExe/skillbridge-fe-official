import { describe, expect, it } from "vitest";
import { formatSessionSchedule } from "./ListRoadmapView";

describe("ListRoadmapView", () => {
  it("formats the exact persisted V2 session occurrence", () => {
    const formatted = formatSessionSchedule(
      "2026-07-25T12:30:00.000Z",
      "en-US",
      "UTC",
    );

    expect(formatted).toContain("Jul 25, 2026");
    expect(formatted).toContain("12:30 PM");
  });
});
