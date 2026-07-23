import { describe, expect, it } from "vitest";
import { applySessionCompletionToWeekPlans } from "./roadmap-store";
import type { LearningSession, WeekPlan } from "./types";

describe("roadmap completion status patch", () => {
  it("completes the target and unlocks every server-returned session only", () => {
    const plans = [
      week(1, [
        session("current-1", "completed"),
        session("current-2", "in-progress"),
      ]),
      week(2, [
        session("next-1", "locked"),
        session("next-2", "locked"),
      ]),
      week(3, [session("future-1", "locked")]),
    ];

    const result = applySessionCompletionToWeekPlans(plans, "current-2", [
      "next-1",
      "next-2",
    ]);

    expect(
      result.flatMap((weekPlan) =>
        weekPlan.sessions.map(({ id, status }) => [id, status]),
      ),
    ).toEqual([
      ["current-1", "completed"],
      ["current-2", "completed"],
      ["next-1", "in-progress"],
      ["next-2", "in-progress"],
      ["future-1", "locked"],
    ]);
  });
});

function week(weekNumber: number, sessions: LearningSession[]): WeekPlan {
  return {
    weekNumber,
    moduleId: `module-${weekNumber}`,
    moduleTitle: `Module ${weekNumber}`,
    sessions,
  };
}

function session(
  id: string,
  status: LearningSession["status"],
): LearningSession {
  return {
    id,
    moduleId: id,
    sessionNumber: 1,
    title: id,
    skill: "HTML",
    dayOfWeek: 1,
    estimatedMinutes: 60,
    status,
    stars: 0,
    maxStars: 5,
    sections: [],
    resources: [],
  };
}
