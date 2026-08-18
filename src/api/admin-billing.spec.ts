import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  reconcileAdminPaymentOrdersApi,
  getAdminBillingFeaturesApi,
  updateAdminPlanFeatureApi,
} from "./admin-billing";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function ok<T>(data: T) {
  return Promise.resolve({
    data: {
      success: true,
      message: "OK",
      data,
      errors: null,
    },
  });
}

describe("admin-billing api", () => {
  it("exposes catalog and single feature quota routes", () => {
    expect(API_ROUTES.ADMIN_BILLING.FEATURES).toBe("/api/admin/billing/features");
    expect(API_ROUTES.ADMIN_BILLING.PLAN_FEATURE("PRO", "cv_review")).toBe(
      "/api/admin/billing/plans/PRO/features/cv_review",
    );
  });

  it("loads the admin feature catalog", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(
      ok([
        {
          featureKey: "cv_review",
          label: "CV diagnosis",
          description: "AI CV analysis, ATS checks, scoring and feedback.",
          allowedPeriods: ["MONTHLY"],
          recommendedLimits: { FREE: 3, PRO: 30 },
        },
      ]) as never,
    );

    const result = await getAdminBillingFeaturesApi();

    expect(httpClient.get).toHaveBeenCalledWith(API_ROUTES.ADMIN_BILLING.FEATURES);
    expect(result[0].label).toBe("CV diagnosis");
  });

  it("updates one feature quota through PATCH without replacing the feature list", async () => {
    vi.mocked(httpClient.patch).mockReturnValueOnce(ok({ code: "PRO" }) as never);

    await updateAdminPlanFeatureApi("PRO", "cv_review", {
      limitValue: -1,
      period: "MONTHLY",
    });

    expect(httpClient.patch).toHaveBeenCalledWith(
      API_ROUTES.ADMIN_BILLING.PLAN_FEATURE("PRO", "cv_review"),
      { limitValue: -1, period: "MONTHLY" },
    );
    expect(httpClient.put).not.toHaveBeenCalled();
  });

  it("reconciles pending payment orders through the Admin PayOS route", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({
        provider: "PAYOS",
        attempted: 2,
        settled: 1,
        terminal: 0,
        pending: 1,
        failed: 0,
        paidChecked: 0,
        verifiedPaid: 0,
        unverifiedPaid: 0,
        verificationFailed: 0,
        results: [],
        paidVerificationResults: [],
      }) as never,
    );

    await reconcileAdminPaymentOrdersApi({ period: "THIS_YEAR" });

    expect(httpClient.post).toHaveBeenCalledWith(
      API_ROUTES.ADMIN_BILLING.RECONCILE_ORDERS,
      { period: "THIS_YEAR" },
      { timeout: 120_000 },
    );
  });
});
