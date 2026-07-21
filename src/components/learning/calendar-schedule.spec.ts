import { describe, expect, it } from "vitest";
import {
  getSessionsForIsoWeekday,
  getSessionsForRoadmapWeek,
  toIsoWeekday,
} from "./calendar-schedule";
import type { WeekPlan } from "./types";

const weeks: WeekPlan[] = [
  {
    weekNumber: 1,
    moduleId: "react",
    moduleTitle: "React",
    sessions: [
      {
        id: "week-1-monday",
        moduleId: "react",
        sessionNumber: 1,
        title: "React basics",
        skill: "React",
        dayOfWeek: 1,
        estimatedMinutes: 60,
        status: "in-progress",
        stars: 0,
        maxStars: 5,
        sections: [],
        resources: [],
      },
    ],
  },
  {
    weekNumber: 2,
    moduleId: "typescript",
    moduleTitle: "TypeScript",
    sessions: [
      {
        id: "week-2-monday",
        moduleId: "typescript",
        sessionNumber: 2,
        title: "TypeScript basics",
        skill: "TypeScript",
        dayOfWeek: 1,
        estimatedMinutes: 60,
        status: "locked",
        stars: 0,
        maxStars: 5,
        sections: [],
        resources: [],
      },
    ],
  },
];

describe("learning calendar schedule", () => {
  it("uses ISO weekdays where Monday is 1 and Sunday is 7", () => {
    expect(toIsoWeekday(1)).toBe(1);
    expect(toIsoWeekday(0)).toBe(7);
  });

  it("shows sessions only in their roadmap week", () => {
    expect(getSessionsForRoadmapWeek(weeks, 0).map((session) => session.id)).toEqual([
      "week-1-monday",
    ]);
    expect(getSessionsForRoadmapWeek(weeks, 1).map((session) => session.id)).toEqual([
      "week-2-monday",
    ]);
    expect(getSessionsForRoadmapWeek(weeks, -1)).toEqual([]);
  });

  it("matches calendar columns with ISO weekday values", () => {
    const sessions = weeks.flatMap((week) => week.sessions);
    expect(getSessionsForIsoWeekday(1, sessions).map((session) => session.id)).toEqual([
      "week-1-monday",
      "week-2-monday",
    ]);
    expect(getSessionsForIsoWeekday(7, sessions)).toEqual([]);
  });

  it("uses persisted dates for V2 sessions instead of repeating a module every week", () => {
    const datedWeeks: WeekPlan[] = [
      {
        ...weeks[0],
        sessions: [
          { ...weeks[0].sessions[0], id: "dated-current", scheduledStartAt: "2026-07-21T12:00:00.000Z" },
          { ...weeks[0].sessions[0], id: "dated-next", scheduledStartAt: "2026-07-28T12:00:00.000Z" },
        ],
      },
    ];
    const now = new Date("2026-07-21T03:00:00.000Z");

    expect(getSessionsForRoadmapWeek(datedWeeks, 0, now).map((session) => session.id)).toEqual([
      "dated-current",
    ]);
    expect(getSessionsForRoadmapWeek(datedWeeks, 1, now).map((session) => session.id)).toEqual([
      "dated-next",
    ]);
  });
});
