import { describe, expect, it } from "vitest";
import { getLearningProjectionView } from "./learning-projection";

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
});
