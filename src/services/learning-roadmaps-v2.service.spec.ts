import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  createLearningRoadmapDraft,
  generateLearningRoadmap,
  roadmapV2ToWeekPlans,
  updateLearningRoadmapDraft,
  type ActiveLearningRoadmap,
} from "./learning-roadmaps-v2.service";

vi.mock("@/api/core/http-client", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
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

  it("maps persisted session UUIDs and exact scheduled dates into the existing learning UI", () => {
    const roadmap: ActiveLearningRoadmap = {
      id: "roadmap-1",
      intent: "CAREER_ROLE",
      status: "ACTIVE",
      revision: 3,
      target_role: "frontend_developer",
      target_level: "fresher",
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
          sessions: [
            {
              id: "session-uuid-1",
              sequence: 1,
              title: "TypeScript · Session 1",
              scheduled_start_at: "2026-07-27T12:00:00.000Z",
              duration_minutes: 60,
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
      }),
    );
  });
});
