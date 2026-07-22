import { describe, expect, it } from "vitest";
import type { WeekPlan } from "./types";
import { getLearningSidebarProgress } from "./LearningSidebar";

describe("LearningSidebar progress", () => {
  it("uses persisted V2 session dates instead of a synthetic seven-day module", () => {
    const weeks = [
      {
        weekNumber: 1,
        moduleId: "module-1",
        moduleTitle: "TypeScript",
        sessions: [
          session("session-1", "2026-07-22T12:00:00.000Z", "completed", 3),
          session("session-2", "2026-07-22T13:00:00.000Z", "completed", 2),
          session("session-3", "2026-07-25T12:00:00.000Z", "locked", 0),
        ],
      },
    ] satisfies WeekPlan[];

    expect(getLearningSidebarProgress(weeks)).toEqual({
      completedDays: 1,
      earnedStars: 5,
      qualifiedUnits: 2,
      remainingUnits: 1,
      starQualifiedPct: 67,
      streakDays: 1,
      totalDays: 2,
      totalStars: 9,
      totalUnits: 3,
    });
  });
});

function session(
  id: string,
  scheduledStartAt: string,
  status: "completed" | "in-progress" | "locked",
  stars: number,
): WeekPlan["sessions"][number] {
  return {
    id,
    moduleId: "module-1",
    skillCanonical: "typescript",
    sessionNumber: 1,
    title: id,
    skill: "TypeScript",
    dayOfWeek: new Date(scheduledStartAt).getDay(),
    scheduledStartAt,
    estimatedMinutes: 60,
    status,
    stars,
    maxStars: 3,
    sections: [],
    resources: [],
  };
}
