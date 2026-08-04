import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Gauge, Loader2, TicketCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { QUERY_KEYS } from "@/constants/app";
import { getVoucherErrorMessage } from "@/lib/billing-error";
import { EmptyState, formatDate, StatusBadge } from "@/lib/billing-ui";
import {
  claimVoucher,
  getMyEntitlements,
  getMyCredits,
  getMySubscription,
  type CreditBalanceDto,
  type MeEntitlementDto,
} from "@/services/billing.service";
import { useHasApiSession } from "@/hooks/use-api-session";

export default function BillingMe() {
  const { t, i18n } = useTranslation("common");
  const hasApiSession = useHasApiSession();
  const subscriptionQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_SUBSCRIPTION,
    queryFn: getMySubscription,
    enabled: hasApiSession,
  });
  // W16: nguồn quota hợp nhất /api/me/entitlements (BE #49) — có period + resets_at,
  // thay /billing/me/usage (shape cũ không phân biệt DAILY/MONTHLY → cv_review hiển thị sai chu kỳ).
  const entitlementsQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_ENTITLEMENTS,
    queryFn: getMyEntitlements,
    enabled: hasApiSession,
  });
  const creditsQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_CREDITS,
    queryFn: getMyCredits,
    enabled: hasApiSession,
  });

  const subscription = subscriptionQuery.data;
  const features = entitlementsQuery.data ?? [];

  return (
    <Layout hideFooter>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#00AEEF]">{t("billing.me.eyebrow")}</p>
            <h1 className="mt-1 font-poppins text-2xl font-extrabold leading-tight text-slate-950 sm:text-3xl">
              {t("billing.me.title")}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{t("billing.me.subtitle")}</p>
          </div>
          <Button asChild className="h-10 rounded-full bg-[#00AEEF] px-5 font-bold text-white hover:bg-[#049bd7]">
            <Link to="/pricing">
              {t("billing.me.upgrade")}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {subscriptionQuery.isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-2xl border bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-[#00AEEF]" />
          </div>
        ) : subscription ? (
          <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-poppins text-2xl font-extrabold leading-none">
                      {subscription.planCode}
                    </CardTitle>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5 text-[#00AEEF]" />
                      {formatDate(subscription.currentPeriodStart)}
                    </p>
                    <p className="mt-1 pl-5 text-xs font-medium text-slate-500">
                      {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                  <StatusBadge status={subscription.status} />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                  {t("billing.me.periodNote")}
                </p>
              </CardContent>
            </Card>

            <CreditsCard
              credits={creditsQuery.data}
              isError={creditsQuery.isError}
              isLoading={creditsQuery.isLoading}
              onRetry={() => void creditsQuery.refetch()}
              t={t}
            />

            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
                <div>
                  <CardTitle className="font-poppins text-2xl font-extrabold leading-none">
                    {t("billing.me.usageTitle")}
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-500">{t("billing.me.featuresCount", { count: features.length })}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-[#00AEEF]">
                  <Gauge className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {entitlementsQuery.isLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[#00AEEF]" />
                  </div>
                ) : entitlementsQuery.isError ? (
                  <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                    {t("billing.me.usageError")}
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {features.map((feature) => (
                      <EntitlementCell
                        key={feature.feature}
                        feature={feature}
                        t={t}
                        locale={i18n.language}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <EmptyState title={t("billing.me.emptyTitle")} description={t("billing.me.emptyDesc")} />
            <CreditsCard
              credits={creditsQuery.data}
              isError={creditsQuery.isError}
              isLoading={creditsQuery.isLoading}
              onRetry={() => void creditsQuery.refetch()}
              t={t}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}

function CreditsCard({
  credits,
  isError,
  isLoading,
  onRetry,
  t,
}: {
  credits: CreditBalanceDto[] | undefined;
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="font-poppins text-xl font-extrabold leading-none">
          {t("billing.me.creditsTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="flex flex-col gap-5">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#00AEEF]" />
          ) : isError ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-800">{t("billing.me.creditsError")}</p>
              <Button size="sm" variant="outline" onClick={onRetry}>
                {t("billing.me.retry")}
              </Button>
            </div>
          ) : credits?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {credits.map((credit) => (
                <div
                  key={credit.creditType}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <p className="text-xs font-bold text-slate-700">
                    {t(`billing.me.creditTypes.${credit.creditType}`)}
                  </p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">
                    {credit.balance}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("billing.me.noCredits")}</p>
          )}
          <Separator />
          <CreditVoucherClaimForm />
        </div>
      </CardContent>
    </Card>
  );
}

function CreditVoucherClaimForm() {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const [voucherCode, setVoucherCode] = useState("");
  const claimMutation = useMutation({
    mutationFn: (code: string) => claimVoucher(code),
    onSuccess: async () => {
      setVoucherCode("");
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING_CREDITS });
    },
  });
  const errorMessage = getVoucherErrorMessage(claimMutation.error, t, "CREDIT_CLAIM");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = voucherCode.trim().toUpperCase();
    if (code && !claimMutation.isPending) claimMutation.mutate(code);
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <div className="flex items-center gap-2">
        <TicketCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-slate-900">{t("billing.me.voucherTitle")}</p>
          <p className="text-xs text-slate-500">{t("billing.me.voucherDescription")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="credit-voucher-code">{t("billing.me.voucherLabel")}</Label>
          <Input
            id="credit-voucher-code"
            value={voucherCode}
            autoComplete="off"
            disabled={claimMutation.isPending}
            placeholder={t("billing.me.voucherPlaceholder")}
            onChange={(event) => {
              setVoucherCode(event.target.value.toUpperCase());
              claimMutation.reset();
            }}
          />
        </div>
        <Button
          type="submit"
          disabled={!voucherCode.trim() || claimMutation.isPending}
        >
          {claimMutation.isPending ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : null}
          {t("billing.me.claimVoucher")}
        </Button>
      </div>
      {claimMutation.isSuccess ? (
        <Alert role="status" aria-live="polite">
          <AlertDescription>
            {t("billing.me.voucherClaimed", {
              count: claimMutation.data.creditUnits,
              type: t(`billing.me.creditTypes.${claimMutation.data.creditType}`),
            })}
          </AlertDescription>
        </Alert>
      ) : null}
      {claimMutation.isError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}

function getUsagePercent(feature: { limit: number; used: number; unlimited: boolean }) {
  if (feature.unlimited) return 100;
  if (feature.limit <= 0) return 0;
  return Math.min(100, Math.round((feature.used / feature.limit) * 100));
}

/** Fallback cho key chưa có trong map i18n — tên thật lấy từ billing.entitlements.names. */
function formatFeatureName(value: string) {
  return value
    .replace(/^cv_/, "CV ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatResetsAt(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale.startsWith("vi") ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * 1 ô hạn mức — 3 trạng thái (W16):
 *   limit=0  → "Không có trong gói" + CTA nâng cấp (KHÔNG hiện "0/0" như lỗi)
 *   unlimited→ "Không giới hạn", ẩn progress
 *   thường   → progress used/limit + còn lại + chu kỳ reset (số là số thật BE đếm)
 */
function EntitlementCell({
  feature,
  t,
  locale,
}: {
  feature: MeEntitlementDto;
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
}) {
  const name = t(`billing.entitlements.names.${feature.feature}`, {
    defaultValue: formatFeatureName(feature.feature),
  });
  const notInPlan = !feature.unlimited && feature.limit === 0;
  const resetsAt = formatResetsAt(feature.resets_at, locale);

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-bold text-slate-900" title={feature.feature}>
          {name}
        </p>
        <StatusDot active={feature.allowed} />
      </div>

      {notInPlan ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">{t("billing.entitlements.notInPlan")}</p>
          <Link to="/pricing" className="text-xs font-bold text-[#00AEEF] hover:underline">
            {t("billing.entitlements.upgrade")}
          </Link>
        </div>
      ) : feature.unlimited ? (
        <p className="mt-3 text-xs font-semibold text-emerald-600">
          {t("billing.entitlements.unlimited")}
        </p>
      ) : (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#00AEEF]"
              style={{ width: `${getUsagePercent(feature)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              {t("billing.me.used")} <b className="text-slate-900">{feature.used}</b>
            </span>
            <span className="font-semibold text-slate-700">
              {feature.used}/{feature.limit}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {t("billing.me.remaining")}: {feature.remaining ?? feature.limit - feature.used}
          </p>
        </>
      )}

      <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
        {t(
          feature.period === "DAILY"
            ? "billing.entitlements.periodDaily"
            : "billing.entitlements.periodMonthly",
        )}
        {resetsAt && !feature.unlimited && !notInPlan && (
          <> · {t("billing.entitlements.resetsAt", { date: resetsAt })}</>
        )}
      </p>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
          : "h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300"
      }
    />
  );
}
