import { describe, expect, it } from "vitest";
import {
  buildPrioritySelection,
  buildScheduleDraft,
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

  it("builds ISO weekday slots and rejects an empty schedule", () => {
    expect(
      buildScheduleDraft({
        timezone: "Asia/Ho_Chi_Minh",
        deadline: "2026-09-01",
        sessionMinutes: 60,
        weekdays: [1, 3, 5],
        startTime: "19:00",
        slotMinutes: 90,
      }).slots,
    ).toEqual([
      { iso_weekday: 1, start_time: "19:00", duration_minutes: 90 },
      { iso_weekday: 3, start_time: "19:00", duration_minutes: 90 },
      { iso_weekday: 5, start_time: "19:00", duration_minutes: 90 },
    ]);
    expect(() =>
      buildScheduleDraft({
        timezone: "Asia/Ho_Chi_Minh",
        deadline: "2026-09-01",
        sessionMinutes: 60,
        weekdays: [],
        startTime: "19:00",
        slotMinutes: 60,
      }),
    ).toThrow("Choose at least one learning day");
  });
});
