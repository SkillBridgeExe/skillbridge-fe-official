import { describe, expect, it } from "vitest";
import {
  clampLearningStartDate,
  getLearningProjectionView,
  toStudyDaysPerWeek,
} from "./learning-projection";

describe("learning projection view", () => {
  it("uses DB projection values and clamps percentages for display", () => {
    expect(
      getLearningProjectionView({
        start_date: "2026-08-01",
        estimated_completion_date: "2026-08-31",
        study_days_per_week: 3,
        session_minutes: 60,
        total_units: 10,
        completed_units: 4,
        planned_units_by_today: 5,
        missed_units: 1,
        pace_percentage: 130,
        days_remaining: 20,
      }),
    ).toEqual({
      completionPercentage: 40,
      pacePercentage: 100,
      paceTone: "ahead",
    });
  });

  it("reports a behind pace without deriving completion from browser cache", () => {
    expect(
      getLearningProjectionView({
        start_date: "2026-08-01",
        estimated_completion_date: null,
        study_days_per_week: 2,
        session_minutes: 60,
        total_units: 0,
        completed_units: 0,
        planned_units_by_today: 0,
        missed_units: 2,
        pace_percentage: 53,
        days_remaining: 0,
      }).paceTone,
    ).toBe("behind");
  });

  it("reports steady pace between 80 and 99 percent", () => {
    expect(
      getLearningProjectionView({
        start_date: "2026-08-01",
        estimated_completion_date: null,
        study_days_per_week: 3,
        session_minutes: 60,
        total_units: 10,
        completed_units: 5,
        planned_units_by_today: 5,
        missed_units: 0,
        pace_percentage: 90,
        days_remaining: 10,
      }).paceTone,
    ).toBe("steady");
  });

  it("normalizes untrusted reschedule inputs before sending them to the server", () => {
    expect(toStudyDaysPerWeek(5)).toBe(5);
    expect(toStudyDaysPerWeek(0)).toBe(3);
    expect(toStudyDaysPerWeek(2.5)).toBe(3);
    expect(clampLearningStartDate("2026-07-01", "2026-07-28")).toBe(
      "2026-07-28",
    );
    expect(clampLearningStartDate("2026-08-01", "2026-07-28")).toBe(
      "2026-08-01",
    );
  });
});
