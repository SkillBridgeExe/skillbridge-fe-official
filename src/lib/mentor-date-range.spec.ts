import { describe, expect, it } from "vitest";
import {
  MAX_MENTOR_RANGE_DAYS,
  getMentorDateRangeErrorCode,
  mentorDateRangeToIso,
  validateMentorDateRange,
} from "./mentor-date-range";

describe("mentor date range", () => {
  it("uses local day boundaries and includes the selected end date", () => {
    const result = mentorDateRangeToIso("2026-06-25", "2026-06-30");

    const from = new Date(result.from);
    const to = new Date(result.to);
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
    expect(to.getHours()).toBe(0);
    expect(to.getDate()).toBe(new Date(2026, 5, 31).getDate());
  });

  it("rejects reversed and overlong ranges", () => {
    expect(validateMentorDateRange("2026-06-30", "2026-06-25")).toBe(
      "End date must be on or after start date.",
    );
    expect(MAX_MENTOR_RANGE_DAYS).toBe(60);
    expect(validateMentorDateRange("2026-01-01", "2026-03-03")).toBe(
      "Date range cannot exceed 60 days.",
    );
    expect(getMentorDateRangeErrorCode("2026-06-30", "2026-06-25")).toBe("reversed");
    expect(getMentorDateRangeErrorCode("2026-01-01", "2026-03-03")).toBe("tooLong");
  });
});
