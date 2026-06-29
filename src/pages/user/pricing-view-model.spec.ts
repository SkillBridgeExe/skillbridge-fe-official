import { describe, expect, it } from "vitest";
import type { BillingPlanDto } from "@/services/billing.service";
import {
  getPricingFeatureSummary,
  getPricingPlanPresentation,
  getVisiblePricingPlans,
} from "./pricing-view-model";

function makePlan(overrides: Partial<BillingPlanDto>): BillingPlanDto {
  return {
    code: "FREE",
    name: "Free",
    description: null,
    category: "SUBSCRIPTION",
    interval: "MONTHLY",
    priceVnd: 0,
    currency: "VND",
    features: [],
    ...overrides,
  };
}

describe("pricing view model", () => {
  it("marks current plan before popular and keeps its management CTA", () => {
    const result = getPricingPlanPresentation(
      makePlan({
        code: "PREMIUM",
        name: "Premium",
        priceVnd: 199000,
      }),
      "premium",
    );

    expect(result.isCurrentPlan).toBe(true);
    expect(result.isPopular).toBe(true);
    expect(result.badgeKey).toBe("billing.pricing.inUse");
    expect(result.buttonKey).toBe("billing.pricing.inUse");
  });

  it("detects free and premium paid plan states", () => {
    expect(
      getPricingPlanPresentation(makePlan({ code: "FREE" })).buttonKey,
    ).toBe("billing.pricing.useNow");
    expect(
      getPricingPlanPresentation(
        makePlan({ code: "PRO", name: "Pro", priceVnd: 129000 }),
      ).buttonKey,
    ).toBe("billing.pricing.buyPlan");
    expect(
      getPricingPlanPresentation(
        makePlan({
          code: "PREMIUM_MONTHLY",
          name: "Premium monthly",
          priceVnd: 249000,
        }),
      ).badgeKey,
    ).toBe("billing.pricing.popular");
  });

  it("keeps pricing cards focused by showing four features and summarizing the rest", () => {
    const result = getPricingFeatureSummary([
      { featureKey: "cv_upload", limit: 10 },
      { featureKey: "cv_review", limit: 10 },
      { featureKey: "cv_builder_create", limit: 5 },
      { featureKey: "cv_jd_match", limit: 10 },
      { featureKey: "job_recommendation", limit: 20 },
      { featureKey: "roadmap_generate", limit: 5 },
    ]);

    expect(result.visibleFeatures.map((feature) => feature.featureKey)).toEqual(
      ["cv_upload", "cv_review", "cv_builder_create", "cv_jd_match"],
    );
    expect(result.hiddenFeatureCount).toBe(2);
  });

  it("keeps public pricing focused on active subscription plans", () => {
    const result = getVisiblePricingPlans([
      makePlan({ code: "FREE", category: "SUBSCRIPTION", isActive: true }),
      makePlan({ code: "MENTOR_60", category: "MENTOR_PACKAGE", interval: "ONE_TIME", isActive: true }),
      makePlan({ code: "OLD_PRO", category: "SUBSCRIPTION", isActive: false }),
    ]);

    expect(result.map((plan) => plan.code)).toEqual(["FREE"]);
  });
});
