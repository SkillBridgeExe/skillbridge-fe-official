import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@posthog/react";
import Layout from "@/components/layout/Layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_KEYS } from "@/constants/app";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api-error";
import { getBillingCheckoutPath } from "@/lib/billing-checkout";
import { cn } from "@/lib/utils";
import {
  createCheckout,
  getBillingPlans,
  getMySubscription,
} from "@/services/billing.service";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/use-toast";
import { useHasApiSession } from "@/hooks/use-api-session";
import {
  getPricingFeatureSummary,
  getPricingPlanPresentation,
  getVisiblePricingPlans,
} from "./pricing-view-model";

export default function Pricing() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasApiSession = useHasApiSession();
  const posthog = usePostHog();

  const plansQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_PLANS,
    queryFn: getBillingPlans,
  });

  const subscriptionQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_SUBSCRIPTION,
    queryFn: getMySubscription,
    enabled: hasApiSession,
  });

  const checkoutMutation = useMutation({
    mutationFn: (planCode: string) =>
      createCheckout({ purpose: "SUBSCRIPTION", planCode }),
    onSuccess: (checkout, planCode) => {
      posthog?.capture("checkout_created", {
        plan_code: planCode,
        order_id: checkout.orderId,
        order_code: checkout.orderCode,
        status: checkout.status,
      });
      const checkoutPath = getBillingCheckoutPath(checkout);
      if (!checkoutPath) {
        toast({
          title: t("billing.pricing.checkoutFailedTitle"),
          description: t("billing.checkout.linkUnavailableDesc"),
          variant: "destructive",
        });
        return;
      }

      navigate(checkoutPath);
    },
    onError: (error, planCode) => {
      posthog?.capture("checkout_failed", {
        plan_code: planCode,
        status: "create_failed",
        error_code: getApiErrorCode(error) ?? "unknown",
      });
      toast({
        title: t("billing.pricing.checkoutFailedTitle"),
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const plans = getVisiblePricingPlans(plansQuery.data);
  const currentPlanCode = subscriptionQuery.data?.planCode?.toLowerCase();

  const handlePlanAction = (
    planCode: string,
    isFreePlan: boolean,
    isCurrentPlan: boolean,
  ) => {
    if (isCurrentPlan) {
      navigate("/billing/me");
      return;
    }

    if (isFreePlan) {
      if (isAuthenticated) {
        navigate("/billing/me");
        return;
      }

      navigate("/?auth=login");
      return;
    }

    if (!hasApiSession) {
      navigate("/?auth=login");
      return;
    }

    posthog?.capture("checkout_initiated", { plan_code: planCode });
    checkoutMutation.mutate(planCode);
  };

  return (
    <Layout hideFooter>
      <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
        <header className="mb-6 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            {t("billing.common.billing")}
          </p>
          <h1 className="mt-2 font-poppins text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {t("billing.pricing.title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {t("billing.pricing.subtitle")}
          </p>
        </header>

        {plansQuery.isLoading ? (
          <PricingSkeleton />
        ) : plansQuery.isError ? (
          <PricingState
            title={t("billing.pricing.errorTitle")}
            description={t("billing.pricing.errorDesc")}
            actionLabel={t("billing.pricing.retry")}
            onAction={() => void plansQuery.refetch()}
            destructive
          />
        ) : plans.length === 0 ? (
          <PricingState
            title={t("billing.pricing.emptyTitle")}
            description={t("billing.pricing.emptyDesc")}
            actionLabel={t("billing.pricing.retry")}
            onAction={() => void plansQuery.refetch()}
          />
        ) : (
          <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const presentation = getPricingPlanPresentation(
                plan,
                currentPlanCode,
              );
              const { visibleFeatures, hiddenFeatureCount } =
                getPricingFeatureSummary(plan.features);
              const planKey = getPlanTranslationKey(plan.code, plan.name);
              const isBusy =
                checkoutMutation.isPending &&
                checkoutMutation.variables === plan.code;

              return (
                <Card
                  key={plan.code}
                  className={cn(
                    "flex h-full flex-col border-slate-200 bg-white shadow-sm",
                    presentation.isPopular &&
                      "border-primary/50 ring-1 ring-primary/20",
                    presentation.isCurrentPlan &&
                      "border-emerald-200 ring-1 ring-emerald-200",
                  )}
                >
                  <CardHeader className="space-y-3 p-5 pb-4">
                    <div className="flex min-h-6 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="font-poppins text-xl font-black leading-tight text-slate-950">
                          {t(`billing.pricing.planNames.${planKey}`, {
                            defaultValue: plan.name,
                          })}
                        </CardTitle>
                      </div>
                      {presentation.badgeKey ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 border-primary/25 bg-primary/5 text-[11px] text-primary",
                            presentation.isCurrentPlan &&
                              "border-emerald-200 bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {t(presentation.badgeKey)}
                        </Badge>
                      ) : null}
                    </div>

                    <CardDescription className="min-h-[40px] text-sm leading-5 text-slate-500">
                      {t(`billing.pricing.planDescriptions.${planKey}`, {
                        defaultValue:
                          plan.description ||
                          t("billing.pricing.defaultPlanDescription"),
                      })}
                    </CardDescription>

                    <div className="pt-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {t("billing.pricing.priceLabel")}
                      </p>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-1 gap-y-1">
                        <span className="font-poppins text-3xl font-black leading-none text-slate-950">
                          {formatPriceAmount(plan.priceVnd)}
                        </span>
                        <span className="font-poppins text-lg font-black leading-none text-slate-950">
                          {t("billing.pricing.currencyVnd")}
                        </span>
                        <span className="text-xs font-bold lowercase text-slate-500">
                          /{t(`billing.pricing.intervals.${plan.interval}`)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col p-5 pt-0">
                    <Separator className="mb-4" />
                    <div className="flex-1">
                      <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-900">
                        {t("billing.pricing.included")}
                      </p>

                      {visibleFeatures.length > 0 ? (
                        <ul className="space-y-2.5">
                          {visibleFeatures.map((feature) => (
                            <li
                              key={feature.featureKey}
                              className="flex items-start gap-2 text-sm leading-5 text-slate-600"
                            >
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              <span>
                                {t(
                                  `billing.pricing.features.${feature.featureKey}`,
                                  {
                                    defaultValue: formatFeatureName(
                                      feature.featureKey,
                                    ),
                                  },
                                )}
                                <span className="font-bold text-slate-800">
                                  {" "}
                                  -{" "}
                                  {feature.limit === -1
                                    ? t("billing.common.unlimited")
                                    : feature.limit}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                          {t("billing.pricing.noFeatures")}
                        </p>
                      )}

                      {hiddenFeatureCount > 0 ? (
                        <p className="mt-3 text-xs font-bold text-primary">
                          {t("billing.pricing.moreFeatures", {
                            count: hiddenFeatureCount,
                          })}
                        </p>
                      ) : null}
                    </div>
                  </CardContent>

                  <CardFooter className="p-5 pt-0">
                    <Button
                      variant={
                        presentation.isCurrentPlan ? "outline" : "default"
                      }
                      className={cn(
                        "h-10 w-full rounded-full font-bold",
                        presentation.isCurrentPlan &&
                          "border-primary/30 bg-white text-primary hover:bg-primary/5 hover:text-primary",
                        !presentation.isCurrentPlan &&
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                      disabled={isBusy}
                      onClick={() =>
                        handlePlanAction(
                          plan.code,
                          presentation.isFreePlan,
                          presentation.isCurrentPlan,
                        )
                      }
                    >
                      {isBusy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {isBusy
                        ? t("billing.common.creating")
                        : t(presentation.buttonKey)}
                      {!isBusy && !presentation.isCurrentPlan ? (
                        <ArrowRight className="ml-2 h-4 w-4" />
                      ) : null}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

function PricingState({
  title,
  description,
  actionLabel,
  onAction,
  destructive = false,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  destructive?: boolean;
}) {
  return (
    <Alert
      variant={destructive ? "destructive" : "default"}
      className="border-slate-200 bg-white shadow-sm"
    >
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-poppins font-black">{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>{description}</span>
        <Button
          variant="outline"
          className="h-9 rounded-full font-bold"
          onClick={onAction}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function PricingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-3 p-5 pb-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-32" />
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
          <CardFooter className="p-5 pt-0">
            <Skeleton className="h-10 w-full rounded-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function getPlanTranslationKey(code: string, name: string) {
  const value = `${code} ${name}`.toLowerCase();

  if (value.includes("premium")) return "premium";
  if (value.includes("mentor")) return "mentor60";
  if (value.includes("pro")) return "pro";
  if (value.includes("free")) return "free";

  return code.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function formatPriceAmount(value: number | null | undefined) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatFeatureName(value: string) {
  return value
    .replace(/^cv_/, "CV ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
