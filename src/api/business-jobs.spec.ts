import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { getBusinessApplicationsApi, getBusinessDashboardApi } from "./business-jobs";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("business hiring api", () => {
  it("loads the business dashboard from the canonical route", async () => {
    const dashboard = {
      company: null,
      metrics: {
        activeJobs: 0,
        totalApplications: 0,
        submitted: 0,
        inReview: 0,
        shortlisted: 0,
      },
      recentApplications: [],
    };
    vi.mocked(httpClient.get).mockReturnValueOnce(ok(dashboard) as never);

    await expect(getBusinessDashboardApi()).resolves.toEqual(dashboard);
    expect(httpClient.get).toHaveBeenCalledWith(API_ROUTES.BUSINESS_DASHBOARD.GET);
  });

  it("passes the active pipeline and match sort to applicant listing", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(
      ok({ items: [], total: 0, page: 1, limit: 20 }) as never,
    );

    await getBusinessApplicationsApi("job-1", {
      pipeline: "ACTIVE",
      sort: "MATCH_DESC",
      page: 1,
      limit: 20,
    });

    expect(httpClient.get).toHaveBeenCalledWith(API_ROUTES.BUSINESS_JOBS.APPLICATIONS("job-1"), {
      params: { pipeline: "ACTIVE", sort: "MATCH_DESC", page: 1, limit: 20 },
    });
  });
});
