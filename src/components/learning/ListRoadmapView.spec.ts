import { describe, expect, it } from "vitest";
import { formatSessionSchedule } from "./ListRoadmapView";

describe("ListRoadmapView", () => {
  it("formats the persisted V2 study date without implying a required start time", () => {
    const formatted = formatSessionSchedule(
      "2026-07-25T12:30:00.000Z",
      "en-US",
      "UTC",
    );

    expect(formatted).toContain("Jul 25, 2026");
    expect(formatted).not.toContain("12:30 PM");
  });
});
