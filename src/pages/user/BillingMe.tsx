import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Gauge, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUERY_KEYS } from "@/constants/app";
import { EmptyState, formatDate, StatusBadge } from "@/lib/billing-ui";
import { getMySubscription, getMyUsage } from "@/services/billing.service";

export default function BillingMe() {
  const { t } = useTranslation("common");
  const subscriptionQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_SUBSCRIPTION,
    queryFn: getMySubscription,
  });
  const usageQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_USAGE,
    queryFn: getMyUsage,
  });

  const subscription = subscriptionQuery.data;
  const usage = usageQuery.data;
  const features = usage?.features ?? subscription?.features ?? [];

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

            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
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
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {features.map((feature) => (
                    <div key={feature.featureKey} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-slate-900" title={feature.featureKey}>
                          {formatFeatureName(feature.featureKey)}
                        </p>
                        <StatusDot active={feature.allowed} />
                      </div>
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
                          {feature.unlimited ? t("billing.common.unlimited") : `${feature.used}/${feature.limit}`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {t("billing.me.remaining")}: {feature.remaining === null ? t("billing.common.unlimited") : feature.remaining}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <EmptyState title={t("billing.me.emptyTitle")} description={t("billing.me.emptyDesc")} />
        )}
      </div>
    </Layout>
  );
}

function getUsagePercent(feature: { limit: number; used: number; unlimited: boolean }) {
  if (feature.unlimited) return 100;
  if (feature.limit <= 0) return 0;
  return Math.min(100, Math.round((feature.used / feature.limit) * 100));
}

function formatFeatureName(value: string) {
  return value
    .replace(/^cv_/, "CV ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
