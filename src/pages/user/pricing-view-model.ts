import type { BillingPlanDto } from "@/services/billing.service";

type BillingPlanFeature = BillingPlanDto["features"][number];

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

export function getPricingFeatureSummary(
  features: BillingPlanFeature[] | undefined,
  visibleLimit = 4,
) {
  const list = features ?? [];
  const visibleFeatures = list.slice(0, visibleLimit);
  return {
    visibleFeatures,
    hiddenFeatureCount: Math.max(0, list.length - visibleFeatures.length),
  };
}

export function getVisiblePricingPlans(plans: BillingPlanDto[] | undefined) {
  return (plans ?? []).filter(
    (plan) => plan.category === "SUBSCRIPTION" && plan.isActive !== false,
  );
}
