import { describe, expect, it } from "vitest";
import {
  applySessionCompletionToActiveRoadmap,
  applySessionCompletionToWeekPlans,
} from "./roadmap-store";
import type { ActiveLearningRoadmap } from "@/services/learning-roadmaps-v2.service";
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

  it("patches the server roadmap projection and unlocked statuses together", () => {
    const roadmap = {
      id: "roadmap-1",
      status: "ACTIVE",
      revision: 1,
      intent: "CAREER_ROLE",
      target_role: null,
      target_level: null,
      learning_track: "FOUNDATION",
      content_source: "DETERMINISTIC",
      coverage_percentage: 100,
      projection: {
        start_date: "2026-08-01",
        estimated_completion_date: "2026-08-10",
        study_days_per_week: 3,
        session_minutes: 60,
        total_units: 2,
        completed_units: 0,
        planned_units_by_today: 1,
        missed_units: 1,
        pace_percentage: 0,
        days_remaining: 10,
      },
      version: {
        id: "version-1",
        version_no: 1,
        resource_catalog_version: "v1",
        content_version: "v1",
        created_at: "2026-08-01T00:00:00.000Z",
      },
      modules: [
        {
          id: "module-1",
          skill_canonical: "react",
          display_name: "React",
          rank: 1,
          estimated_minutes: 60,
          feasibility: "FEASIBLE",
          prerequisite_warnings: [],
          sessions: [
            {
              id: "session-1",
              sequence: 1,
              title: "One",
              scheduled_start_at: "2020-01-01T12:00:00.000Z",
              duration_minutes: 60,
              status: "AVAILABLE",
              required_tasks: [],
            },
            {
              id: "session-2",
              sequence: 2,
              title: "Two",
              scheduled_start_at: "2026-08-03T12:00:00.000Z",
              duration_minutes: 60,
              status: "LOCKED",
              required_tasks: [],
            },
          ],
        },
      ],
    } satisfies ActiveLearningRoadmap;

    const updated = applySessionCompletionToActiveRoadmap(
      roadmap,
      "session-1",
      ["session-2"],
    );

    expect(updated.projection.completed_units).toBe(1);
    expect(updated.projection.missed_units).toBe(0);
    expect(updated.modules[0].sessions.map((item) => item.status)).toEqual([
      "COMPLETED",
      "AVAILABLE",
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
