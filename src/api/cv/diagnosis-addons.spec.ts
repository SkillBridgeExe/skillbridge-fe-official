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

  it("generateRoadmapFromMatchApi posts budget and language preferences for the composed roadmap", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({
        budget_hours: 32,
        steps: [],
        not_feasible_items: [],
        ai_summary: "",
        no_learning_gaps: true,
      }) as never,
    );

    await generateRoadmapFromMatchApi("match-1", {
      available_days: 30,
      hours_per_week: 8,
      language_pref: "vi",
    });

    expect(httpClient.post).toHaveBeenCalledWith(API_ROUTES.CV_MATCHES.ROADMAP("match-1"), {
      available_days: 30,
      hours_per_week: 8,
      language_pref: "vi",
    });
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
