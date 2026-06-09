import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUERY_KEYS } from "@/constants/app";
import { formatDate, StatusBadge } from "@/lib/billing-ui";
import { getAdminSubscriptions, type AdminSubscriptionsQuery } from "@/services/admin-billing.service";

export default function AdminBillingSubscriptions() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState({ status: "", planCode: "", userId: "" });
  const query = useMemo<AdminSubscriptionsQuery>(
    () => ({
      page: 1,
      limit: 20,
      status: filters.status ? (filters.status as AdminSubscriptionsQuery["status"]) : undefined,
      planCode: filters.planCode || undefined,
      userId: filters.userId || undefined,
    }),
    [filters],
  );

  const subscriptionsQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_BILLING_SUBSCRIPTIONS(query),
    queryFn: () => getAdminSubscriptions(query),
  });

  const subscriptions = subscriptionsQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-primary">{t("billing.admin.eyebrow")}</p>
        <h1 className="text-3xl font-black text-slate-950 dark:text-white">{t("billing.admin.subscriptions.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("billing.admin.subscriptions.subtitle")}</p>
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader><CardTitle>{t("billing.admin.common.filters")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Filter label={t("billing.admin.table.status")} value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status }))} placeholder="ACTIVE" />
          <Filter label={t("billing.admin.table.planCode")} value={filters.planCode} onChange={(planCode) => setFilters((prev) => ({ ...prev, planCode }))} placeholder="PRO" />
          <Filter label={t("billing.admin.table.userId")} value={filters.userId} onChange={(userId) => setFilters((prev) => ({ ...prev, userId }))} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-3">{t("billing.admin.table.id")}</th>
                <th>{t("billing.admin.table.user")}</th>
                <th>{t("billing.admin.table.plan")}</th>
                <th>{t("billing.admin.table.status")}</th>
                <th>{t("billing.admin.table.periodStart")}</th>
                <th>{t("billing.admin.table.periodEnd")}</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-5 py-3 font-mono text-xs">{item.id}</td>
                  <td>{item.userEmail || item.userId || "-"}</td>
                  <td className="font-bold">{item.planCode}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{formatDate(item.currentPeriodStart)}</td>
                  <td>{formatDate(item.currentPeriodEnd)}</td>
                </tr>
              ))}
              {!subscriptions.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    {subscriptionsQuery.isLoading ? t("billing.common.loading") : t("billing.admin.subscriptions.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Filter({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 h-11 rounded-xl" />
    </div>
  );
}
