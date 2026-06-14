import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/constants/app";
import { getApiErrorMessage } from "@/lib/api-error";
import { createCheckout, getBillingPlans, getMySubscription } from "@/services/billing.service";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/use-toast";
import { useHasApiSession } from "@/hooks/use-api-session";

export default function Pricing() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasApiSession = useHasApiSession();

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
    mutationFn: (planCode: string) => createCheckout({ purpose: "SUBSCRIPTION", planCode }),
    onSuccess: (checkout) => {
      if (checkout.checkoutUrl) {
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      navigate(`/billing/checkout/${checkout.orderCode}`);
    },
    onError: (error) => {
      toast({
        title: t("billing.pricing.checkoutFailedTitle"),
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const plans = plansQuery.data ?? [];
  const currentPlanCode = subscriptionQuery.data?.planCode?.toLowerCase();

  const handlePlanAction = (planCode: string, isFreePlan: boolean, isCurrentPlan: boolean) => {
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

    checkoutMutation.mutate(planCode);
  };

  return (
    <Layout hideFooter>
      <div className="mx-auto max-w-[1260px] px-4 py-10 lg:py-12">
        <div className="mb-9">
          <h1 className="font-poppins text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">
            {t("billing.pricing.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{t("billing.pricing.subtitle")}</p>
        </div>

        {plansQuery.isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-2xl border bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-[#00AEEF]" />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const isFreePlan = plan.priceVnd === 0 || plan.code.toLowerCase() === "free";
              const isCurrentPlan = Boolean(currentPlanCode && plan.code.toLowerCase() === currentPlanCode);
              const isPopular = plan.code.toLowerCase().includes("premium") || plan.name.toLowerCase().includes("premium");
              const topLabel = isCurrentPlan
                ? t("billing.pricing.inUse")
                : isPopular
                  ? t("billing.pricing.popular")
                  : "";
              const isBusy = checkoutMutation.isPending && checkoutMutation.variables === plan.code;
              const buttonLabel = isCurrentPlan
                ? t("billing.pricing.inUse")
                : isFreePlan
                  ? t("billing.pricing.useNow")
                  : t("billing.pricing.buyPlan");
              const planKey = getPlanTranslationKey(plan.code, plan.name);

              return (
                <article
                  key={plan.code}
                  className={`relative rounded-[28px] bg-[#EAF7FF] p-3 pt-7 transition duration-200 hover:-translate-y-0.5 ${
                    isCurrentPlan
                      ? "shadow-[0_18px_46px_rgba(0,174,239,0.22)] ring-2 ring-[#00AEEF]"
                      : "shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  }`}
                >
                  {topLabel && (
                    <div
                      className={`absolute left-5 right-5 top-2 text-center text-[10px] font-black ${
                        isCurrentPlan ? "text-[#0077A8]" : "text-slate-500"
                      }`}
                    >
                      {topLabel}
                    </div>
                  )}

                  <div className="flex min-h-[500px] flex-col rounded-2xl bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-poppins text-xl font-black leading-tight text-slate-950">
                          {t(`billing.pricing.planNames.${planKey}`, { defaultValue: plan.name })}
                        </h2>
                        <p className="mt-2 min-h-[38px] text-xs font-medium leading-5 text-slate-500">
                          {t(`billing.pricing.planDescriptions.${planKey}`, {
                            defaultValue: plan.description || t("billing.pricing.defaultPlanDescription"),
                          })}
                        </p>
                      </div>
                      {isCurrentPlan && (
                        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 rounded-full fill-[#00AEEF] text-white" />
                      )}
                    </div>

                    <div className="mt-5 flex flex-nowrap items-baseline gap-1 whitespace-nowrap">
                      <span className="font-poppins text-[28px] font-black leading-none text-slate-950 xl:text-[26px] 2xl:text-[28px]">
                        {formatPriceAmount(plan.priceVnd)}
                      </span>
                      <span className="font-poppins text-[22px] font-black leading-none text-slate-950 xl:text-xl 2xl:text-[22px]">
                        {t("billing.pricing.currencyVnd")}
                      </span>
                      <span className="text-xs font-bold lowercase text-slate-500 xl:text-[11px] 2xl:text-xs">
                        /{t(`billing.pricing.intervals.${plan.interval}`)}
                      </span>
                    </div>

                    <div className="mt-6 flex-1">
                      <p className="mb-3 text-xs font-black text-slate-950">{t("billing.pricing.included")}</p>
                      <ul className="space-y-2.5">
                        {plan.features?.slice(0, 6).map((feature) => (
                          <li key={feature.featureKey} className="flex items-start gap-2 text-xs font-medium leading-5 text-slate-600">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00AEEF]" />
                            <span>
                              {t(`billing.pricing.features.${feature.featureKey}`, {
                                defaultValue: formatFeatureName(feature.featureKey),
                              })}:{" "}
                              <b className="font-black text-slate-800">
                                {feature.limit === -1 ? t("billing.common.unlimited") : feature.limit}
                              </b>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      className="mt-6 h-11 w-full rounded-full bg-[#00AEEF] font-bold text-white shadow-[0_8px_18px_rgba(0,174,239,0.24)] hover:bg-[#049bd7] disabled:opacity-80"
                      disabled={isBusy}
                      onClick={() => handlePlanAction(plan.code, isFreePlan, isCurrentPlan)}
                    >
                      {isBusy ? t("billing.common.creating") : buttonLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
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
