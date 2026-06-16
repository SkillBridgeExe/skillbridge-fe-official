import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  generateInterviewPlanFromMatchApi,
  generateRoadmapFromMatchApi,
} from "./diagnosis-addons";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

describe("diagnosis-addons match-scoped POST bodies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generateRoadmapFromMatchApi posts an EMPTY body (BE RoadmapFromMatchDto has no lang; forbidNonWhitelisted would 400)", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({
        ai_request_id: "r1",
        parsed_response: {
          title: "X",
          total_weeks: 0,
          phases: [],
          steps: [],
          ai_summary: "",
          ai_advice: "",
          uncovered_skills: [],
          skills_without_courses: [],
          no_learning_gaps: true,
        },
        retrieval_log_id: null,
        retrieved_chunks_count: 0,
        token_usage: 0,
      }) as never,
    );

    await generateRoadmapFromMatchApi("match-1");

    expect(httpClient.post).toHaveBeenCalledWith(API_ROUTES.CV_MATCHES.ROADMAP("match-1"), {});
  });

  it("generateInterviewPlanFromMatchApi posts { lang } (BE InterviewPlanFromMatchDto accepts lang)", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({
        ai_request_id: "i1",
        target_role: "backend_developer",
        language: "vi",
        items: [],
        llm_enhanced: true,
        token_usage: 0,
        no_focus_areas: true,
      }) as never,
    );

    await generateInterviewPlanFromMatchApi("match-1", "vi");

    expect(httpClient.post).toHaveBeenCalledWith(API_ROUTES.CV_MATCHES.INTERVIEW_PLAN("match-1"), {
      lang: "vi",
    });
  });
});
