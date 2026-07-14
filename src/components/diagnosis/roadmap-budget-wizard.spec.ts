import { describe, expect, it } from "vitest";
import { createRoadmapBudgetInput } from "./roadmap-budget-wizard";

describe("createRoadmapBudgetInput", () => {
  it("builds the roadmap API body from mascot wizard answers", () => {
    expect(
      createRoadmapBudgetInput({
        availableDays: 60,
        hoursPerWeek: 12,
        studyHoursPerDay: 6,
        studyDaysPerWeek: 4,
        languagePref: "en",
        selectedSkillOrder: ["react", "docker"],
        excludedSkills: ["seo"],
        selectedResources: {
          react: ["react-video"],
          docker: ["docker-doc"],
        },
      }),
    ).toEqual({
      available_days: 60,
      hours_per_week: 24,
      minutes_per_session: 120,
      sessions_per_week: 12,
      study_days_per_week: 4,
      language_pref: "en",
      selected_skill_order: ["react", "docker"],
      excluded_skills: ["seo"],
      selected_resources: {
        react: ["react-video"],
        docker: ["docker-doc"],
      },
      translate_display: false,
    });
  });
});
