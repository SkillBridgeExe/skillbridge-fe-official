import { describe, expect, it } from "vitest";
import type { BillingPlanDto } from "@/services/billing.service";
import {
  getPricingBenefits,
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

  it("builds the complete Premium benefit list and splits the marketing interview allowance", () => {
    const result = getPricingBenefits(
      makePlan({
        code: "PREMIUM",
        features: [
          { featureKey: "cv_upload", limit: -1 },
          { featureKey: "cv_review", limit: 80 },
          { featureKey: "cv_builder_create", limit: 30 },
          { featureKey: "cv_builder_rewrite", limit: 30 },
          { featureKey: "cv_builder_render_pdf", limit: -1 },
          { featureKey: "roadmap_generate", limit: 10 },
          { featureKey: "job_recommendation", limit: -1 },
          { featureKey: "interview_session", limit: 20 },
        ],
      }),
    );

    expect(result.map((benefit) => [benefit.key, benefit.limit])).toEqual([
      ["upload", -1],
      ["reviewMatch", 80],
      ["create", 30],
      ["rewrite", 30],
      ["editExport", -1],
      ["roadmap", 10],
      ["jobRecommendations", -1],
      ["interviewEntry", 10],
      ["interviewExit", 10],
    ]);
  });

  it("keeps public pricing focused on active subscription plans", () => {
    const result = getVisiblePricingPlans([
      makePlan({ code: "FREE", category: "SUBSCRIPTION", isActive: true }),
      makePlan({ code: "PREMIUM", category: "SUBSCRIPTION", isActive: true }),
      makePlan({ code: "PRO", category: "SUBSCRIPTION", isActive: true }),
      makePlan({ code: "MENTOR_60", category: "MENTOR_PACKAGE", interval: "ONE_TIME", isActive: true }),
      makePlan({ code: "OLD_PRO", category: "SUBSCRIPTION", isActive: false }),
    ]);

    expect(result.map((plan) => plan.code)).toEqual(["FREE", "PREMIUM"]);
  });
});
