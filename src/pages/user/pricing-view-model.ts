import type { BillingPlanDto } from "@/services/billing.service";

export type PricingPlanPresentation = {
  isFreePlan: boolean;
  isCurrentPlan: boolean;
  isPopular: boolean;
  badgeKey: "billing.pricing.inUse" | "billing.pricing.popular" | null;
  buttonKey:
    | "billing.pricing.inUse"
    | "billing.pricing.useNow"
    | "billing.pricing.buyPlan";
};

export function getPricingPlanPresentation(
  plan: BillingPlanDto,
  currentPlanCode?: string | null,
): PricingPlanPresentation {
  const normalizedCode = plan.code.toLowerCase();
  const searchablePlan = `${plan.code} ${plan.name}`.toLowerCase();
  const isFreePlan = plan.priceVnd === 0 || normalizedCode === "free";
  const isCurrentPlan = Boolean(
    currentPlanCode && normalizedCode === currentPlanCode,
  );
  const isPopular = searchablePlan.includes("premium");

  return {
    isFreePlan,
    isCurrentPlan,
    isPopular,
    badgeKey: isCurrentPlan
      ? "billing.pricing.inUse"
      : isPopular
        ? "billing.pricing.popular"
        : null,
    buttonKey: isCurrentPlan
      ? "billing.pricing.inUse"
      : isFreePlan
        ? "billing.pricing.useNow"
        : "billing.pricing.buyPlan",
  };
}

export type PricingBenefit = {
  key:
    | "upload"
    | "reviewMatch"
    | "create"
    | "rewrite"
    | "editExport"
    | "roadmap"
    | "jobRecommendations"
    | "interview"
    | "interviewEntry"
    | "interviewExit";
  limit: number;
};

export function getPricingBenefits(plan: BillingPlanDto): PricingBenefit[] {
  const limits = new Map(
    plan.features.map((feature) => [feature.featureKey, feature.limit]),
  );
  const benefit = (
    key: PricingBenefit["key"],
    featureKey: string,
  ): PricingBenefit | null => {
    const limit = limits.get(featureKey) ?? 0;
    return limit === 0 ? null : { key, limit };
  };
  const normalizedCode = plan.code.toUpperCase();
  if (normalizedCode === "FREE") {
    return [
      benefit("upload", "cv_upload"),
      benefit("reviewMatch", "cv_review"),
      benefit("interview", "interview_session"),
    ].filter((item): item is PricingBenefit => item !== null);
  }
  if (normalizedCode !== "PREMIUM") return [];

  const interviewLimit = limits.get("interview_session") ?? 0;
  const interviewEntry = Math.floor(interviewLimit / 2);
  return [
    benefit("upload", "cv_upload"),
    benefit("reviewMatch", "cv_review"),
    benefit("create", "cv_builder_create"),
    benefit("rewrite", "cv_builder_rewrite"),
    benefit("editExport", "cv_builder_render_pdf"),
    benefit("roadmap", "roadmap_generate"),
    benefit("jobRecommendations", "job_recommendation"),
    interviewEntry > 0
      ? { key: "interviewEntry" as const, limit: interviewEntry }
      : null,
    interviewLimit - interviewEntry > 0
      ? {
          key: "interviewExit" as const,
          limit: interviewLimit - interviewEntry,
        }
      : null,
  ].filter((item): item is PricingBenefit => item !== null);
}

export function getVisiblePricingPlans(plans: BillingPlanDto[] | undefined) {
  return (plans ?? []).filter(
    (plan) =>
      plan.category === "SUBSCRIPTION" &&
      plan.isActive !== false &&
      ["FREE", "PREMIUM"].includes(plan.code.toUpperCase()),
  );
}
