import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  getPricingBenefits,
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
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanDto | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(
    null,
  );

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
    mutationFn: ({
      planCode,
      code,
    }: {
      planCode: string;
      code?: string;
    }) =>
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

  return (
    <Layout hideFooter>
      <div className="mx-auto max-w-5xl px-4 py-8 lg:py-10">
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
          <div className="grid items-stretch gap-5 md:grid-cols-2">
            {plans.map((plan) => {
              const presentation = getPricingPlanPresentation(
                plan,
                currentPlanCode,
              );
              const benefits = getPricingBenefits(plan);
              const planKey = plan.code.toLowerCase();
              const isBusy =
                checkoutMutation.isPending &&
                checkoutMutation.variables?.planCode === plan.code;

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
                  <CardHeader className="space-y-3 p-6 pb-4">
                    <div className="flex min-h-6 items-start justify-between gap-3">
                      <CardTitle className="font-poppins text-xl font-black text-slate-950">
                        {t(`billing.pricing.planNames.${planKey}`, {
                          defaultValue: plan.name,
                        })}
                      </CardTitle>
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
                    <CardDescription className="min-h-10 text-sm leading-5">
                      {t(`billing.pricing.planDescriptions.${planKey}`, {
                        defaultValue: plan.description ?? "",
                      })}
                    </CardDescription>
                    <div className="flex flex-wrap items-baseline gap-1 pt-1">
                      <span className="font-poppins text-3xl font-black text-slate-950">
                        {formatVnd(plan.priceVnd)}
                      </span>
                      <span className="font-bold text-slate-950">
                        {t("billing.pricing.currencyVnd")}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        /{t(`billing.pricing.intervals.${plan.interval}`)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col p-6 pt-0">
                    <Separator className="mb-4" />
                    <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-900">
                      {t("billing.pricing.included")}
                    </p>
                    <ul className="space-y-2.5">
                      {benefits.map((benefit) => (
                        <li
                          key={benefit.key}
                          className="flex items-start gap-2 text-sm leading-5 text-slate-600"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>
                            {t(`billing.pricing.benefits.${benefit.key}`)}
                            <span className="font-bold text-slate-800">
                              {" "}
                              -{" "}
                              {benefit.limit === -1
                                ? t("billing.common.unlimited")
                                : benefit.limit}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Button
                      variant={
                        presentation.isCurrentPlan ? "outline" : "default"
                      }
                      className="h-10 w-full rounded-full font-bold"
                      disabled={isBusy}
                      onClick={() => openCheckout(plan)}
                    >
                      {isBusy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {t(presentation.buttonKey)}
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

      <Dialog
        open={selectedPlan !== null}
        onOpenChange={(open) => {
          if (!open && !checkoutMutation.isPending) setSelectedPlan(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("billing.pricing.voucher.title")}</DialogTitle>
            <DialogDescription>
              {t("billing.pricing.voucher.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voucher-code">
                {t("billing.pricing.voucher.label")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="voucher-code"
                  value={voucherCode}
                  placeholder={t("billing.pricing.voucher.placeholder")}
                  disabled={voucherMutation.isPending}
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
                  disabled={!voucherCode.trim() || voucherMutation.isPending}
                  onClick={applyVoucher}
                >
                  {voucherMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t("billing.pricing.voucher.apply")}
                </Button>
              </div>
              {voucherMutation.isError ? (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(voucherMutation.error)}
                </p>
              ) : null}
              {appliedVoucherCode ? (
                <p className="text-sm font-semibold text-emerald-700">
                  {t("billing.pricing.voucher.applied", {
                    code: appliedVoucherCode,
                  })}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <PriceRow
                label={t("billing.pricing.voucher.originalPrice")}
                value={originalAmount}
              />
              {discountAmount > 0 ? (
                <PriceRow
                  label={t("billing.pricing.voucher.discount", {
                    percent: quote?.discountPercent ?? 0,
                  })}
                  value={-discountAmount}
                  discount
                />
              ) : null}
              <Separator />
              <PriceRow
                label={t("billing.pricing.voucher.total")}
                value={finalAmount}
                total
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={checkoutMutation.isPending}
              onClick={() => setSelectedPlan(null)}
            >
              {t("billing.pricing.voucher.cancel")}
            </Button>
            <Button
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("billing.pricing.voucher.pay")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function PriceRow({
  label,
  value,
  discount = false,
  total = false,
}: {
  label: string;
  value: number;
  discount?: boolean;
  total?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        discount && "text-emerald-700",
        total && "font-black text-slate-950",
      )}
    >
      <span>{label}</span>
      <span>
        {value < 0 ? "-" : ""}
        {formatVnd(Math.abs(value))}đ
      </span>
    </div>
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
    <div className="grid gap-5 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index} className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-3 p-6 pb-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-32" />
          </CardHeader>
          <CardContent className="space-y-3 p-6 pt-0">
            <Skeleton className="h-px w-full" />
            {Array.from({ length: 5 }).map((__, row) => (
              <Skeleton key={row} className="h-4 w-full" />
            ))}
          </CardContent>
          <CardFooter className="p-6 pt-0">
            <Skeleton className="h-10 w-full rounded-full" />
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
