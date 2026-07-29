import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@posthog/react";
import Layout from "@/components/layout/Layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutPriceSummary } from "@/components/billing/CheckoutPriceSummary";
import { PricingBenefitList } from "@/components/billing/PricingBenefitList";
import { QUERY_KEYS } from "@/constants/app";
import { useToast } from "@/hooks/use-toast";
import { useHasApiSession } from "@/hooks/use-api-session";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api-error";
import { getBillingCheckoutPath } from "@/lib/billing-checkout";
import { cn } from "@/lib/utils";
import {
  createCheckout,
  getBillingPlans,
  getMySubscription,
  validateVoucher,
  type BillingPlanDto,
} from "@/services/billing.service";
import { useAuthStore } from "@/store/useAuthStore";
import { getPricingBenefits, getPricingPlanPresentation, getVisiblePricingPlans } from "./pricing-view-model";

export default function Pricing() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasApiSession = useHasApiSession();
  const posthog = usePostHog();
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanDto | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_PLANS,
    queryFn: getBillingPlans,
  });
  const subscriptionQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_SUBSCRIPTION,
    queryFn: getMySubscription,
    enabled: hasApiSession,
  });

  const voucherMutation = useMutation({
    mutationFn: ({ planCode, code }: { planCode: string; code: string }) =>
      validateVoucher({ planCode, voucherCode: code }),
    onSuccess: (quote) => setAppliedVoucherCode(quote.voucherCode),
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ planCode, code }: { planCode: string; code?: string }) =>
      createCheckout({
        purpose: "SUBSCRIPTION",
        planCode,
        voucherCode: code,
      }),
    onSuccess: (checkout, variables) => {
      posthog?.capture("checkout_created", {
        plan_code: variables.planCode,
        order_id: checkout.orderId,
        order_code: checkout.orderCode,
        status: checkout.status,
        voucher_code: checkout.pricing.voucherCode,
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
    onError: (error, variables) => {
      posthog?.capture("checkout_failed", {
        plan_code: variables.planCode,
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

  const openCheckout = (plan: BillingPlanDto) => {
    const presentation = getPricingPlanPresentation(plan, currentPlanCode);
    if (presentation.isCurrentPlan) {
      navigate("/billing/me");
      return;
    }
    if (presentation.isFreePlan) {
      navigate(isAuthenticated ? "/billing/me" : "/?auth=login");
      return;
    }
    if (!hasApiSession) {
      navigate("/?auth=login");
      return;
    }
    posthog?.capture("checkout_initiated", { plan_code: plan.code });
    setVoucherCode("");
    setAppliedVoucherCode(null);
    voucherMutation.reset();
    setSelectedPlan(plan);
  };

  const applyVoucher = () => {
    if (!selectedPlan) return;
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;
    voucherMutation.mutate({ planCode: selectedPlan.code, code });
  };

  const quote = voucherMutation.data;
  const originalAmount = quote?.originalAmountVnd ?? selectedPlan?.priceVnd ?? 0;
  const discountAmount = quote?.discountAmountVnd ?? 0;
  const finalAmount = quote?.finalAmountVnd ?? originalAmount;
  const selectedPlanKey = selectedPlan?.code.toLowerCase() ?? "";
  const selectedPlanName = selectedPlan
    ? t(`billing.pricing.planNames.${selectedPlanKey}`, {
        defaultValue: selectedPlan.name,
      })
    : "";

  return (
    <Layout hideFooter>
      <section className="relative isolate overflow-hidden bg-slate-50/70">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <header className="mx-auto mb-8 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              {t("billing.common.billing")}
            </span>
            <h1 className="mt-3 font-poppins text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              {t("billing.pricing.title")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
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
            <div className="grid items-start gap-6 md:grid-cols-[0.82fr_1.18fr]">
              {plans.map((plan) => {
                const presentation = getPricingPlanPresentation(plan, currentPlanCode);
                const benefits = getPricingBenefits(plan);
                const planKey = plan.code.toLowerCase();
                const isBusy = checkoutMutation.isPending && checkoutMutation.variables?.planCode === plan.code;
                const benefitItems = benefits.map((benefit) => ({
                  key: benefit.key,
                  label: t(`billing.pricing.benefits.${benefit.key}`),
                  value:
                    benefit.limit === -1
                      ? t("billing.common.unlimited")
                      : t("billing.pricing.uses", { count: benefit.limit }),
                }));

                return (
                  <Card
                    key={plan.code}
                    data-testid="pricing-plan-card"
                    data-plan-code={plan.code}
                    className={cn(
                      "relative overflow-hidden rounded-[1.75rem] border-slate-200/80 bg-white shadow-sm",
                      presentation.isPopular && "border-primary/35 shadow-xl shadow-primary/10 ring-1 ring-primary/15",
                      presentation.isCurrentPlan && "border-emerald-300 ring-1 ring-emerald-200",
                    )}
                  >
                    {presentation.isPopular ? (
                      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-primary" />
                    ) : null}
                    <CardHeader className="space-y-5 p-6 pb-5 sm:p-7 sm:pb-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="font-poppins text-2xl font-black text-slate-950">
                            {t(`billing.pricing.planNames.${planKey}`, {
                              defaultValue: plan.name,
                            })}
                          </CardTitle>
                          <CardDescription className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                            {t(`billing.pricing.planDescriptions.${planKey}`, {
                              defaultValue: plan.description ?? "",
                            })}
                          </CardDescription>
                        </div>
                        {presentation.badgeKey ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-extrabold text-primary",
                              presentation.isCurrentPlan && "border-emerald-200 bg-emerald-50 text-emerald-700",
                            )}
                          >
                            {t(presentation.badgeKey)}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                        <span className="font-poppins text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                          {formatVnd(plan.priceVnd)}
                        </span>
                        <span className="pb-1 font-poppins text-lg font-black text-slate-950">
                          {t("billing.pricing.currencyVnd")}
                        </span>
                        <span className="pb-1.5 text-sm font-semibold text-slate-500">
                          /{t(`billing.pricing.intervals.${plan.interval}`)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-6 pt-0 sm:px-5">
                      <div
                        className={cn(
                          "rounded-2xl border border-slate-100 bg-slate-50/80 p-2",
                          presentation.isPopular && "border-primary/10 bg-primary/[0.035]",
                        )}
                      >
                        <p className="px-3 pb-1 pt-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          {t("billing.pricing.included")}
                        </p>
                        <PricingBenefitList items={benefitItems} premium={presentation.isPopular} />
                      </div>
                    </CardContent>
                    <CardFooter className="p-6 pt-0 sm:p-7 sm:pt-0">
                      <Button
                        variant={presentation.isCurrentPlan ? "outline" : "default"}
                        className={cn(
                          "h-12 w-full rounded-xl font-black",
                          !presentation.isPopular &&
                            !presentation.isCurrentPlan &&
                            "bg-slate-900 text-white hover:bg-slate-800",
                        )}
                        disabled={isBusy}
                        onClick={() => openCheckout(plan)}
                      >
                        {isBusy ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t(presentation.buttonKey)}
                        {!isBusy && !presentation.isCurrentPlan ? (
                          <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                        ) : null}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Dialog
        open={selectedPlan !== null}
        onOpenChange={(open) => {
          if (!open && !checkoutMutation.isPending) setSelectedPlan(null);
        }}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 text-left">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="font-poppins text-xl font-black text-slate-950">
                  {t("billing.pricing.voucher.title")}
                </DialogTitle>
                <DialogDescription className="mt-1.5 leading-5">
                  {t("billing.pricing.voucher.description")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            <CheckoutPriceSummary
              planName={selectedPlanName}
              originalAmountVnd={originalAmount}
              discountAmountVnd={discountAmount}
              finalAmountVnd={finalAmount}
              labels={{
                plan: t("billing.pricing.voucher.plan"),
                originalPrice: t("billing.pricing.voucher.originalPrice"),
                discount: t("billing.pricing.voucher.discount", {
                  percent: quote?.discountPercent ?? 0,
                }),
                total: t("billing.pricing.voucher.total"),
              }}
            />
            <div className="space-y-2">
              <Label htmlFor="voucher-code" className="flex items-center gap-2 font-bold text-slate-800">
                <Tag aria-hidden="true" className="h-4 w-4 text-primary" />
                {t("billing.pricing.voucher.label")}
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="voucher-code"
                  value={voucherCode}
                  className="h-11 font-mono uppercase tracking-wide"
                  placeholder={t("billing.pricing.voucher.placeholder")}
                  autoComplete="off"
                  disabled={voucherMutation.isPending || checkoutMutation.isPending}
                  onChange={(event) => {
                    setVoucherCode(event.target.value.toUpperCase());
                    setAppliedVoucherCode(null);
                    voucherMutation.reset();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyVoucher();
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 font-bold"
                  disabled={!voucherCode.trim() || voucherMutation.isPending || checkoutMutation.isPending}
                  onClick={applyVoucher}
                >
                  {voucherMutation.isPending ? (
                    <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t("billing.pricing.voucher.apply")}
                </Button>
              </div>
              <div aria-live="polite" className="min-h-5">
                {voucherMutation.isError ? (
                  <p role="alert" className="flex items-start gap-2 text-sm font-medium text-destructive">
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    {getApiErrorMessage(voucherMutation.error)}
                  </p>
                ) : null}
                {appliedVoucherCode ? (
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {t("billing.pricing.voucher.applied", {
                      code: appliedVoucherCode,
                    })}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="flex items-center gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-600" />
              {t("billing.pricing.voucher.secureHint")}
            </p>
          </div>
          <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <Button
              variant="outline"
              className="h-11"
              disabled={checkoutMutation.isPending}
              onClick={() => setSelectedPlan(null)}
            >
              {t("billing.pricing.voucher.cancel")}
            </Button>
            <Button
              className="h-11 font-black"
              disabled={!selectedPlan || checkoutMutation.isPending}
              onClick={() => {
                if (!selectedPlan) return;
                checkoutMutation.mutate({
                  planCode: selectedPlan.code,
                  code: appliedVoucherCode ?? undefined,
                });
              }}
            >
              {checkoutMutation.isPending ? (
                <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard aria-hidden="true" className="mr-2 h-4 w-4" />
              )}
              {t("billing.pricing.voucher.pay")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <Alert variant={destructive ? "destructive" : "default"} className="border-slate-200 bg-white shadow-sm">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-poppins font-black">{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>{description}</span>
        <Button variant="outline" className="h-9 rounded-full font-bold" onClick={onAction}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function PricingSkeleton() {
  return (
    <div className="grid items-start gap-6 md:grid-cols-[0.82fr_1.18fr]">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index} className="rounded-[1.75rem] border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-4 p-7 pb-5">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-14 w-40" />
          </CardHeader>
          <CardContent className="px-5 pb-6 pt-0">
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
              <Skeleton className="h-3 w-24" />
              {Array.from({ length: index === 0 ? 3 : 8 }).map((__, row) => (
                <div key={row} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="p-7 pt-0">
            <Skeleton className="h-12 w-full rounded-xl" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value);
}
