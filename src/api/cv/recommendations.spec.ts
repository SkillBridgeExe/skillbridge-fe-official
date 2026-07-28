import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { getJobRecommendationsApi } from "./recommendations";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

describe("job recommendation explorer query contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes multi-select filters as the CSV values accepted by the backend DTO", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(
      ok({ recommendations: [] }) as never,
    );

    await getJobRecommendationsApi("cv-1", {
      limit: 10,
      offset: 20,
      role: "all",
      cityCodes: ["HCM", "HAN"],
      workModes: ["REMOTE", "HYBRID"],
      employmentTypes: ["FULL_TIME", "FREELANCE"],
      experienceLevels: ["FRESHER", "JUNIOR"],
      fit: ["safe_apply", "stretch"],
      sort: "NEWEST",
      salaryOnly: true,
    });

    expect(httpClient.get).toHaveBeenCalledWith(
      API_ROUTES.CV.JOB_RECOMMENDATIONS("cv-1"),
      {
        params: {
          limit: 10,
          offset: 20,
          role: "all",
          cityCodes: "HCM,HAN",
          workModes: "REMOTE,HYBRID",
          employmentTypes: "FULL_TIME,FREELANCE",
          experienceLevels: "FRESHER,JUNIOR",
          fit: "safe_apply,stretch",
          sort: "NEWEST",
          salaryOnly: true,
        },
      },
    );
  });
});
