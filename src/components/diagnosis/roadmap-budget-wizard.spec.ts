import { describe, expect, it } from "vitest";
import { createRoadmapBudgetInput } from "./roadmap-budget-wizard";

describe("createRoadmapBudgetInput", () => {
  it("builds the roadmap API body from mascot wizard answers", () => {
    expect(
      createRoadmapBudgetInput({
        availableDays: 60,
        hoursPerWeek: 12,
        languagePref: "en",
      }),
    ).toEqual({
      available_days: 60,
      hours_per_week: 12,
      language_pref: "en",
    });
  });
});
