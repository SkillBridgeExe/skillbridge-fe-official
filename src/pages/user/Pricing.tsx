import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QUERY_KEYS } from "@/constants/app";
import { formatVnd } from "@/lib/billing-ui";
import { getApiErrorMessage } from "@/lib/api-error";
import { createCheckout, getBillingPlans } from "@/services/billing.service";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/use-toast";

export default function Pricing() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();

  const plansQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_PLANS,
    queryFn: getBillingPlans,
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

  return (
    <Layout hideFooter>
      <div className="mx-auto max-w-[1160px] px-4 py-10">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#00AEEF]">{t("billing.common.billing")}</p>
            <h1 className="mt-2 font-poppins text-3xl font-black text-slate-950">{t("billing.pricing.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {t("billing.pricing.subtitle")}
            </p>
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => navigate("/billing/me")}>
            {t("billing.pricing.currentPlan")}
          </Button>
        </div>

        {plansQuery.isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-2xl border bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-[#00AEEF]" />
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {plans.map((plan) => (
              <Card key={plan.code} className="w-full sm:w-[364px] rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="min-w-0 flex-1 font-poppins text-xl font-extrabold leading-tight">
                      {plan.name}
                    </CardTitle>
                    <span className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                      {plan.interval.replace("_", " ")}
                    </span>
                  </div>
                  <CardDescription>{plan.description || t("billing.pricing.defaultPlanDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-5">
                    <span className="text-3xl font-black text-slate-950">{formatVnd(plan.priceVnd)}</span>
                    <span className="ml-2 text-sm text-slate-500">{plan.currency}</span>
                  </div>
                  <div className="space-y-2">
                    {plan.features?.slice(0, 6).map((feature) => (
                      <div key={feature.featureKey} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#00AEEF]" />
                        <span>
                          <b className="text-slate-900">{feature.featureKey}</b>:{" "}
                          {feature.limit === -1 ? t("billing.common.unlimited") : feature.limit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="mt-6 h-12 w-full rounded-full bg-[#00AEEF] font-bold text-white hover:bg-[#049bd7]"
                    disabled={checkoutMutation.isPending}
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate("/?auth=login");
                        return;
                      }
                      checkoutMutation.mutate(plan.code);
                    }}
                  >
                    {checkoutMutation.isPending ? t("billing.common.creating") : t("billing.pricing.buyPlan")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
