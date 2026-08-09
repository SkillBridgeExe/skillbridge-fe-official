import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  archiveActiveLearningRoadmap,
  createLearningRoadmapDraft,
  generateLearningRoadmap,
  getCurrentActiveLearningRoadmap,
  hydrateActiveLearningRoadmap,
  rescheduleLearningRoadmap,
  roadmapV2ToLearningRoadmap,
  roadmapV2ToWeekPlans,
  translateLearningDisplay,
  updateLearningRoadmapDraft,
  type ActiveLearningRoadmap,
} from "./learning-roadmaps-v2.service";
import * as learningRoadmapsV2 from "./learning-roadmaps-v2.service";

vi.mock("@/api/core/http-client", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/services/auth-session.service", () => ({
  hasApiAuthSession: () => true,
}));

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

describe("Learning Roadmaps V2 service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates and updates a server-owned draft using the V2 endpoints", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({ id: "roadmap-1", revision: 0 }) as never,
    );
    vi.mocked(httpClient.patch).mockReturnValueOnce(
      ok({ id: "roadmap-1", revision: 1 }) as never,
    );

    await createLearningRoadmapDraft({
      intent: "CAREER_ROLE",
      cv_id: "cv-1",
      target_role: "frontend_developer",
      target_level: "fresher",
      language_pref: "both",
    });
    await updateLearningRoadmapDraft("roadmap-1", {
      expected_revision: 0,
      selected_priorities: [{ skill_canonical: "typescript", rank: 1 }],
    });

    expect(httpClient.post).toHaveBeenCalledWith(API_ROUTES.LEARNING.ROADMAPS, {
      intent: "CAREER_ROLE",
      cv_id: "cv-1",
      target_role: "frontend_developer",
      target_level: "fresher",
      language_pref: "both",
    });
    expect(httpClient.patch).toHaveBeenCalledWith(
      API_ROUTES.LEARNING.ROADMAP_DRAFT("roadmap-1"),
      expect.objectContaining({ expected_revision: 0 }),
    );
  });

  it("generates with optimistic revision instead of resending client-owned roadmap content", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({
        roadmap_id: "roadmap-1",
        version_id: "version-1",
        status: "ACTIVE",
      }) as never,
    );

    await generateLearningRoadmap("roadmap-1", 4);

    expect(httpClient.post).toHaveBeenCalledWith(
      API_ROUTES.LEARNING.ROADMAP_GENERATE("roadmap-1"),
      { expected_revision: 4 },
    );
  });

  it("reschedules pending units and translates display text through typed routes", async () => {
    vi.mocked(httpClient.post)
      .mockReturnValueOnce(ok({ id: "roadmap-1", revision: 5 }) as never)
      .mockReturnValueOnce(
        ok([{ id: "session-title", locale: "vi", title: "Tiêu đề" }]) as never,
      );

    await rescheduleLearningRoadmap("roadmap-1", {
      expected_revision: 4,
      start_date: "2026-08-03",
      study_days_per_week: 3,
    });
    await translateLearningDisplay({
      locale: "vi",
      items: [{ id: "session-title", title: "Title" }],
    });

    expect(httpClient.post).toHaveBeenNthCalledWith(
      1,
      API_ROUTES.LEARNING.ROADMAP_RESCHEDULE("roadmap-1"),
      {
        expected_revision: 4,
        start_date: "2026-08-03",
        study_days_per_week: 3,
      },
    );
    expect(httpClient.post).toHaveBeenNthCalledWith(
      2,
      API_ROUTES.LEARNING.TRANSLATE_DISPLAY,
      {
        locale: "vi",
        items: [{ id: "session-title", title: "Title" }],
      },
    );
  });

  it("archives the active roadmap on the server instead of clearing only local state", async () => {
    vi.mocked(httpClient.delete).mockReturnValueOnce(
      ok({ archived: 1 }) as never,
    );

    await expect(archiveActiveLearningRoadmap()).resolves.toEqual({ archived: 1 });
    expect(httpClient.delete).toHaveBeenCalledWith(
      API_ROUTES.LEARNING.ACTIVE_ROADMAP,
    );
    expect(
      typeof (learningRoadmapsV2 as unknown as { archiveActiveLearningRoadmap?: unknown })
        .archiveActiveLearningRoadmap,
    ).toBe("function");
    expect(
      (API_ROUTES.LEARNING as unknown as { ACTIVE_ROADMAP?: string }).ACTIVE_ROADMAP,
    ).toBe("/api/learning/roadmaps/active");
  });

  it("loads the current active roadmap directly without listing every draft", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(
      ok({ id: "roadmap-active", status: "ACTIVE" }) as never,
    );

    await expect(getCurrentActiveLearningRoadmap()).resolves.toEqual({
      id: "roadmap-active",
      status: "ACTIVE",
    });
    expect(httpClient.get).toHaveBeenCalledWith(
      API_ROUTES.LEARNING.ACTIVE_ROADMAP,
    );
  });

  it("hydrates or clears the roadmap store from the server result", async () => {
    const setActive = vi.fn();
    const clear = vi.fn();
    const roadmap = { id: "roadmap-active", status: "ACTIVE" } as ActiveLearningRoadmap;

    await hydrateActiveLearningRoadmap(
      () => Promise.resolve(roadmap),
      setActive,
      clear,
    );
    await hydrateActiveLearningRoadmap(
      () => Promise.resolve(null),
      setActive,
      clear,
    );

    expect(setActive).toHaveBeenCalledWith(roadmap);
    expect(clear).toHaveBeenCalledOnce();
  });

  it("maps persisted session UUIDs and exact scheduled dates into the existing learning UI", () => {
    const roadmap: ActiveLearningRoadmap = {
      id: "roadmap-1",
      intent: "CAREER_ROLE",
      status: "ACTIVE",
      revision: 3,
      target_role: "frontend_developer",
      target_level: "fresher",
      learning_track: "FOUNDATION",
      content_source: "AI_ENHANCED",
      coverage_percentage: 100,
      projection: {
        start_date: "2026-07-26",
        estimated_completion_date: "2026-07-29",
        study_days_per_week: 3,
        session_minutes: 60,
        total_units: 3,
        completed_units: 1,
        planned_units_by_today: 2,
        missed_units: 0,
        pace_percentage: 100,
        days_remaining: 2,
      },
      version: {
        id: "version-1",
        version_no: 1,
        resource_catalog_version: "catalog-v1",
        content_version: "content-v1",
        created_at: "2026-07-21T00:00:00.000Z",
      },
      modules: [
        {
          id: "module-1",
          skill_canonical: "typescript",
          display_name: "TypeScript",
          rank: 1,
          estimated_minutes: 120,
          feasibility: "FEASIBLE",
          prerequisite_warnings: [],
          sessions: [
            {
              id: "session-uuid-1",
              sequence: 1,
              title: "TypeScript · Session 1",
              scheduled_start_at: "2026-07-27T12:00:00.000Z",
              duration_minutes: 60,
              status: "AVAILABLE",
              required_tasks: [],
            },
            {
              id: "session-uuid-2",
              sequence: 2,
              title: "TypeScript · Session 2",
              scheduled_start_at: "2026-07-26T12:00:00.000Z",
              duration_minutes: 60,
              status: "COMPLETED",
              required_tasks: [],
            },
            {
              id: "session-uuid-3",
              sequence: 3,
              title: "TypeScript · Session 3",
              scheduled_start_at: "2026-07-29T12:00:00.000Z",
              duration_minutes: 60,
              status: "AVAILABLE",
              required_tasks: [],
            },
          ],
        },
      ],
    };

    const weeks = roadmapV2ToWeekPlans(roadmap);

    expect(weeks[0].sessions[0]).toEqual(
      expect.objectContaining({
        id: "session-uuid-1",
        moduleId: "module-1",
        skillCanonical: "typescript",
        scheduledStartAt: "2026-07-27T12:00:00.000Z",
        dayOfWeek: 1,
        status: "in-progress",
      }),
    );
    expect(weeks[0].sessions.map((session) => session.status)).toEqual([
      "in-progress",
      "completed",
      "in-progress",
    ]);
  });


  it("groups sessions by persisted calendar week instead of module rank", () => {
    const roadmap = {
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
              id: "session-react",
              sequence: 1,
              title: "React session",
              scheduled_start_at: "2026-08-03T01:00:00.000Z",
              week_number: 1,
              duration_minutes: 60,
              status: "AVAILABLE",
              required_tasks: [],
            },
          ],
        },
        {
          id: "module-4",
          skill_canonical: "typescript",
          display_name: "TypeScript",
          rank: 4,
          estimated_minutes: 60,
          feasibility: "FEASIBLE",
          prerequisite_warnings: [],
          sessions: [
            {
              id: "session-typescript-week-1",
              sequence: 1,
              title: "TypeScript week 1",
              scheduled_start_at: "2026-08-04T01:00:00.000Z",
              week_number: 1,
              duration_minutes: 60,
              status: "AVAILABLE",
              required_tasks: [],
            },
            {
              id: "session-typescript-week-2",
              sequence: 2,
              title: "TypeScript week 2",
              scheduled_start_at: "2026-08-11T01:00:00.000Z",
              week_number: 2,
              duration_minutes: 60,
              status: "AVAILABLE",
              required_tasks: [],
            },
          ],
        },
      ],
    } as ActiveLearningRoadmap;

    const weeks = roadmapV2ToWeekPlans(roadmap);

    expect(weeks.map((week) => week.weekNumber)).toEqual([1, 2]);
    expect(weeks[0].sessions.map((session) => session.id)).toEqual([
      "session-react",
      "session-typescript-week-1",
    ]);
    expect(weeks[1].sessions[0]).toEqual(
      expect.objectContaining({
        id: "session-typescript-week-2",
        moduleId: "module-4",
        skillCanonical: "typescript",
      }),
    );
  });
  it("does not mark a deferred module with no sessions as completed", () => {
    const roadmap = {
      id: "roadmap-empty-module",
      intent: "CAREER_ROLE",
      status: "ACTIVE",
      revision: 1,
      target_role: null,
      target_level: null,
      learning_track: "FOUNDATION",
      content_source: "DETERMINISTIC",
      coverage_percentage: 100,
      projection: {
        start_date: "2026-07-28",
        estimated_completion_date: null,
        study_days_per_week: 3,
        session_minutes: 60,
        total_units: 0,
        completed_units: 0,
        planned_units_by_today: 0,
        missed_units: 0,
        pace_percentage: 100,
        days_remaining: 0,
      },
      version: {
        id: "version-empty",
        version_no: 1,
        resource_catalog_version: "catalog-v1",
        content_version: "content-v1",
        created_at: "2026-07-28T00:00:00.000Z",
      },
      modules: [
        {
          id: "module-deferred",
          skill_canonical: "advanced-react",
          display_name: "Advanced React",
          rank: 1,
          estimated_minutes: 0,
          feasibility: "DEFERRED",
          prerequisite_warnings: [],
          sessions: [],
        },
      ],
    } satisfies ActiveLearningRoadmap;

    expect(roadmapV2ToLearningRoadmap(roadmap).modules[0].status).toBe(
      "in-progress",
    );
  });
});
