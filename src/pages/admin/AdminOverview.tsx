import { useMemo, useState, type ElementType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CreditCard, FileText, Loader2, RefreshCw, SearchCheck, Users } from "lucide-react";
import type { AdminRevenuePeriod, AdminUserSummaryQuery } from "@/api/admin-users";
import {
  AdminDonutChartCard,
  AdminFunnelChartCard,
  AdminLineChartCard,
} from "@/components/admin/AdminCharts";
import AdminKpiCard from "@/components/admin/AdminKpiCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_KEYS } from "@/constants/app";
import {
  reconcileAdminPaymentOrders,
  type AdminPaymentReconciliationResponse,
} from "@/services/admin-billing.service";
import { getAdminUserSummary } from "@/services/admin-users.service";

const ROLE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "hsl(var(--chart-2))",
  UNVERIFIED: "hsl(var(--chart-3))",
  SUSPENDED: "hsl(var(--muted-foreground))",
};

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatCompactVnd(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1_000_000)}M ₫`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value / 1_000)}K ₫`;
  }
  return `${value} ₫`;
}

const REVENUE_PERIOD_OPTIONS: Array<{ value: AdminRevenuePeriod; label: string }> = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "THIS_YEAR", label: "This year" },
  { value: "LAST_YEAR", label: "Last year" },
  { value: "CUSTOM", label: "Custom" },
];

function periodLabel(period: AdminRevenuePeriod) {
  return REVENUE_PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? period;
}

function formatWindowLabel(window: { from: string; to: string } | undefined) {
  return window ? `${window.from} to ${window.to}` : "the selected calendar window";
}

function formatSyncMessage(result: AdminPaymentReconciliationResponse) {
  const verificationResults = result.paidVerificationResults ?? [];
  const notFound = verificationResults.filter((item) => item.status === "NOT_FOUND").length;
  const verificationFailed = verificationResults.filter(
    (item) => item.status === "FAILED_RECONCILIATION" || item.status === "ERROR",
  ).length;
  const verifiedPaid = result.verifiedPaid ?? 0;
  const unverifiedPaid = result.unverifiedPaid ?? 0;
  if (notFound > 0 || verificationFailed > 0 || unverifiedPaid > 0) {
    const notFoundMessage = notFound > 0 ? ` ${notFound} local paid orders were not found in PayOS.` : "";
    const failedMessage = verificationFailed > 0
      ? ` ${verificationFailed} paid orders could not be verified and need review.`
      : "";
    return `PayOS sync completed: ${verifiedPaid} paid orders verified.${notFoundMessage}${failedMessage}`;
  }

  if (result.failed === 0 && result.pending === 0) {
    const orderLabel = result.settled === 1 ? "order" : "orders";
    return `PayOS sync complete: ${result.settled} paid ${orderLabel} settled.`;
  }

  return `PayOS sync completed with ${result.pending} pending and ${result.failed} failed orders.`;
}

export default function AdminOverview() {
  const [period, setPeriod] = useState<AdminRevenuePeriod>("THIS_YEAR");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [syncResult, setSyncResult] = useState<AdminPaymentReconciliationResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const summaryParams = useMemo<AdminUserSummaryQuery>(() => {
    if (period !== "CUSTOM") {
      return { period };
    }

    return {
      period,
      ...(customFrom && customTo ? { from: customFrom, to: customTo } : {}),
    };
  }, [customFrom, customTo, period]);
  const hasValidPeriod = period !== "CUSTOM" || Boolean(customFrom && customTo);
  const summaryQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_USER_SUMMARY(summaryParams),
    queryFn: () => getAdminUserSummary(summaryParams),
    enabled: hasValidPeriod,
  });
  const reconcileMutation = useMutation({
    mutationFn: () => reconcileAdminPaymentOrders(summaryParams),
    onMutate: () => {
      setSyncResult(null);
      setSyncError(null);
    },
    onSuccess: (result) => {
      setSyncResult(result);
      void queryClient.invalidateQueries({ queryKey: ["admin", "users", "summary"] });
    },
    onError: (error) => {
      setSyncError(error instanceof Error ? error.message : "PayOS sync failed.");
    },
  });

  const summary = summaryQuery.data;
  const totals = summary?.totals;
  const activeRate = totals?.totalUsers ? (totals.activeUsers / totals.totalUsers) * 100 : 0;
  const conversionRate = totals?.cvCount ? (totals.interviewCount / totals.cvCount) * 100 : 0;

  const roleDonut = useMemo(
    () =>
      (summary?.roleDistribution ?? []).map((item, index) => ({
        name: item.role,
        value: item.count,
        color: ROLE_COLORS[index % ROLE_COLORS.length],
      })),
    [summary?.roleDistribution],
  );

  const statusDonut = useMemo(
    () =>
      (summary?.statusDistribution ?? []).map((item) => ({
        name: item.status,
        value: item.count,
        color: STATUS_COLORS[item.status] ?? "#6366F1",
      })),
    [summary?.statusDistribution],
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">Admin overview</p>
          <h1 className="text-3xl font-bold tracking-normal text-foreground">User Growth & Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            User, CV, interview, and verified paid-revenue activity for {periodLabel(period).toLowerCase()}.
          </p>
          {summary?.window ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Calendar window: {formatWindowLabel(summary.window)} ({summary.window.timezone}).
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          <div className="w-44">
            <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-muted-foreground">Revenue period</div>
            <Select
              value={period}
              onValueChange={(value: AdminRevenuePeriod) => {
                setPeriod(value);
                setSyncResult(null);
                setSyncError(null);
              }}
            >
              <SelectTrigger aria-label="Revenue period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {REVENUE_PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => reconcileMutation.mutate()}
            disabled={!hasValidPeriod || reconcileMutation.isPending || summaryQuery.isFetching}
          >
            {reconcileMutation.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {reconcileMutation.isPending ? "Syncing..." : "Sync PayOS"}
          </Button>
        </div>
      </div>

      {period === "CUSTOM" ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            From
            <Input
              aria-label="Custom period start"
              type="date"
              value={customFrom}
              onChange={(event) => {
                setCustomFrom(event.target.value);
                setSyncResult(null);
                setSyncError(null);
              }}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            To
            <Input
              aria-label="Custom period end"
              type="date"
              value={customTo}
              onChange={(event) => {
                setCustomTo(event.target.value);
                setSyncResult(null);
                setSyncError(null);
              }}
            />
          </label>
          {!hasValidPeriod ? (
            <p className="pb-2 text-xs text-muted-foreground">Select both dates to load the calendar window.</p>
          ) : null}
        </div>
      ) : null}

      {syncError ? (
        <Alert variant="destructive">
          <AlertDescription>PayOS sync failed: {syncError}</AlertDescription>
        </Alert>
      ) : null}
      {syncResult ? (
        <Alert>
          <AlertDescription>{formatSyncMessage(syncResult)}</AlertDescription>
        </Alert>
      ) : null}

      {summaryQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Total users"
            value={(totals?.totalUsers ?? 0).toLocaleString()}
            valueNumber={totals?.totalUsers ?? 0}
            progress={activeRate}
            progressLabel="active users"
            icon={Users}
            accent={{ ringColorClass: "text-primary", cardClassName: "bg-card" }}
          />
          <AdminKpiCard
            title="New users"
            value={(totals?.newUsers ?? 0).toLocaleString()}
            valueNumber={totals?.newUsers ?? 0}
            icon={Activity}
            accent={{ cardClassName: "bg-card" }}
          />
          <AdminKpiCard
            title="CV uploads"
            value={(totals?.cvCount ?? 0).toLocaleString()}
            valueNumber={totals?.cvCount ?? 0}
            progress={conversionRate}
            progressLabel="reached an interview"
            icon={FileText}
            accent={{ ringColorClass: "text-[hsl(var(--chart-5))]", cardClassName: "bg-card" }}
          />
          <AdminKpiCard
            title="Paid revenue"
            value={formatVnd(totals?.paidRevenueVnd ?? 0)}
            changeLabel={`${(totals?.paidOrderCount ?? 0).toLocaleString()} completed orders`}
            icon={CreditCard}
            accent={{ cardClassName: "bg-card" }}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminLineChartCard
          title="Registrations trend"
          description="New accounts created inside the selected range."
          xKey="date"
          dataKey="count"
          data={(summary?.registrationTrend ?? []) as unknown as Record<string, unknown>[]}
        />
        <AdminLineChartCard
          title="Paid revenue trend"
          description="Revenue from completed payments in the selected range."
          xKey="date"
          dataKey="amountVnd"
          axisValueFormatter={formatCompactVnd}
          valueFormatter={formatVnd}
          data={(summary?.revenueTrend ?? []) as unknown as Record<string, unknown>[]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminDonutChartCard title="Role distribution" description="Accounts grouped by active roles." data={roleDonut} />
        <AdminDonutChartCard title="Status distribution" description="Accounts grouped by current status." data={statusDonut} />
        <AdminFunnelChartCard title="Activity funnel" description="CV, match, and interview progression." items={summary?.activityFunnel ?? []} />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          <SmallMetric label="Active users" value={totals?.activeUsers ?? 0} />
          <SmallMetric label="Unverified users" value={totals?.unverifiedUsers ?? 0} />
          <SmallMetric label="Suspended users" value={totals?.suspendedUsers ?? 0} />
          <SmallMetric label="Interviews" value={totals?.interviewCount ?? 0} icon={SearchCheck} />
        </CardContent>
      </Card>
    </div>
  );
}

function SmallMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon?: ElementType;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {Icon ? <Icon className="size-4" /> : null}
        {label}
      </div>
      <div className="mt-2 font-mono text-2xl font-bold tracking-normal text-foreground tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
