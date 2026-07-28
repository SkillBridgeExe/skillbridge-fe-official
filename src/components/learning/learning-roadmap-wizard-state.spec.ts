import { describe, expect, it } from "vitest";
import {
  buildCadenceDraft,
  buildPrioritySelection,
} from "./learning-roadmap-wizard-state";

const candidates = [
  {
    skill_canonical: "react",
    display_name: "React",
    system_priority: 0.9,
    rationale: "",
    prerequisites: [],
  },
  {
    skill_canonical: "typescript",
    display_name: "TypeScript",
    system_priority: 0.8,
    rationale: "",
    prerequisites: [],
  },
];

describe("learning roadmap wizard state", () => {
  it("ranks only unique server candidates in the user's order", () => {
    expect(
      buildPrioritySelection(candidates, [
        "typescript",
        "unknown",
        "react",
        "typescript",
      ]),
    ).toEqual([
      { skill_canonical: "typescript", rank: 1 },
      { skill_canonical: "react", rank: 2 },
    ]);
  });

  it("builds a deadline-free cadence and rejects an invalid frequency", () => {
    expect(
      buildCadenceDraft({
        timezone: "Asia/Ho_Chi_Minh",
        startDate: "2026-09-01",
        studyDaysPerWeek: 3,
      }),
    ).toEqual({
      timezone: "Asia/Ho_Chi_Minh",
      start_date: "2026-09-01",
      study_days_per_week: 3,
      session_minutes: 60,
    });
    expect(() =>
      buildCadenceDraft({
        timezone: "Asia/Ho_Chi_Minh",
        startDate: "2026-09-01",
        studyDaysPerWeek: 0,
      }),
    ).toThrow("Choose between 1 and 7 learning days");
  });
});
