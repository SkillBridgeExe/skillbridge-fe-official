import { useMemo, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CreditCard, ShieldAlert, UserCheck } from "lucide-react";
import {
  AdminDonutChartCard,
  AdminFunnelChartCard,
  AdminLineChartCard,
} from "@/components/admin/AdminCharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_KEYS } from "@/constants/app";
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

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

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

export default function AdminInsights() {
  const [rangeDays, setRangeDays] = useState(90);
  const summaryQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_USER_SUMMARY({ rangeDays }),
    queryFn: () => getAdminUserSummary({ rangeDays }),
  });
  const summary = summaryQuery.data;
  const totals = summary?.totals;
  const totalUsers = totals?.totalUsers ?? 0;
  const activeRate = percent(totals?.activeUsers ?? 0, totalUsers);
  const unverifiedRate = percent(totals?.unverifiedUsers ?? 0, totalUsers);
  const suspendedRate = percent(totals?.suspendedUsers ?? 0, totalUsers);
  const cvToInterviewRate = percent(totals?.interviewCount ?? 0, totals?.cvCount ?? 0);

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

  const signals = [
    {
      title: "Active account rate",
      value: `${activeRate}%`,
      detail: `${(totals?.activeUsers ?? 0).toLocaleString()} active users`,
      icon: UserCheck,
      tone: "success",
    },
    {
      title: "Unverified email rate",
      value: `${unverifiedRate}%`,
      detail: `${(totals?.unverifiedUsers ?? 0).toLocaleString()} users need verification`,
      icon: AlertTriangle,
      tone: "warning",
    },
    {
      title: "Suspended account rate",
      value: `${suspendedRate}%`,
      detail: `${(totals?.suspendedUsers ?? 0).toLocaleString()} suspended users`,
      icon: ShieldAlert,
      tone: "muted",
    },
    {
      title: "CV to interview",
      value: `${cvToInterviewRate}%`,
      detail: `${(totals?.interviewCount ?? 0).toLocaleString()} interviews from ${(totals?.cvCount ?? 0).toLocaleString()} CVs`,
      icon: BarChart3,
      tone: "primary",
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">Admin insights</p>
          <h1 className="text-3xl font-bold tracking-normal text-foreground">User Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            API-backed user distribution, activation, funnel, and revenue signals. Mock AI decisions were removed.
          </p>
        </div>
        <div className="w-44">
          <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-muted-foreground">Range</div>
          <Select value={String(rangeDays)} onValueChange={(value) => setRangeDays(Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">365 days</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {summaryQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {signals.map((signal) => {
            const Icon = signal.icon;
            return (
              <Card key={signal.title} className="border-border/80 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground">{signal.title}</div>
                      <div className="mt-2 font-mono text-3xl font-bold tracking-normal text-foreground tabular-nums">{signal.value}</div>
                      <div className="mt-2 text-xs font-semibold text-muted-foreground">{signal.detail}</div>
                    </div>
                    <SignalBadge tone={signal.tone} icon={Icon} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminLineChartCard
          title="Registration velocity"
          description="New registrations over the selected time window."
          xKey="date"
          dataKey="count"
          data={(summary?.registrationTrend ?? []) as unknown as Record<string, unknown>[]}
        />
        <AdminLineChartCard
          title="Revenue velocity"
          description="Paid revenue captured over the selected time window."
          xKey="date"
          dataKey="amountVnd"
          axisValueFormatter={formatCompactVnd}
          valueFormatter={formatVnd}
          data={(summary?.revenueTrend ?? []) as unknown as Record<string, unknown>[]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminDonutChartCard title="Role mix" description="Current account role composition." data={roleDonut} />
        <AdminDonutChartCard title="Status mix" description="Active, pending, and restricted accounts." data={statusDonut} />
        <AdminFunnelChartCard title="Activity funnel" description="How users move through CV and interview flows." items={summary?.activityFunnel ?? []} />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
          <InsightLine label="Revenue" value={formatVnd(totals?.paidRevenueVnd ?? 0)} icon={CreditCard} />
          <InsightLine label="Matches" value={(totals?.matchCount ?? 0).toLocaleString()} />
          <InsightLine label="Interviews" value={(totals?.interviewCount ?? 0).toLocaleString()} />
        </CardContent>
      </Card>
    </div>
  );
}

function SignalBadge({ tone, icon: Icon }: { tone: string; icon: ElementType }) {
  const className =
    tone === "success"
      ? "border-[hsl(var(--status-success-border))] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))]"
      : tone === "warning"
        ? "border-[hsl(var(--status-warning-border))] bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))]"
        : tone === "primary"
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-[hsl(var(--status-muted-border))] bg-[hsl(var(--status-muted-bg))] text-[hsl(var(--status-muted-fg))]";

  return (
    <Badge variant="outline" className={`size-11 justify-center p-0 [&_svg]:size-5 ${className}`}>
      <Icon />
    </Badge>
  );
}

function InsightLine({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: ElementType;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {Icon ? <Icon className="size-4" /> : null}
        {label}
      </div>
      <div className="mt-2 font-mono text-2xl font-bold tracking-normal text-foreground tabular-nums">{value}</div>
    </div>
  );
}
