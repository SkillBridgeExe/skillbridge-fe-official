import { useMemo, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CreditCard, FileText, SearchCheck, Users } from "lucide-react";
import {
  AdminDonutChartCard,
  AdminFunnelChartCard,
  AdminLineChartCard,
} from "@/components/admin/AdminCharts";
import AdminKpiCard from "@/components/admin/AdminKpiCard";
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

function rangeLabel(rangeDays: number) {
  return `${rangeDays} days`;
}

export default function AdminOverview() {
  const [rangeDays, setRangeDays] = useState(30);
  const summaryQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_USER_SUMMARY({ rangeDays }),
    queryFn: () => getAdminUserSummary({ rangeDays }),
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
            User, CV, interview, and paid-revenue activity for the last {rangeLabel(rangeDays)}.
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
