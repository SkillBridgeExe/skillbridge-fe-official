import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUERY_KEYS } from "@/constants/app";
import { formatDate, formatVnd, StatusBadge } from "@/lib/billing-ui";
import { getAdminPaymentOrders } from "@/services/admin-billing.service";
import type { AdminOrdersQuery } from "@/services/admin-billing.service";

export default function AdminBillingOrders() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState({ status: "", purpose: "", userId: "" });
  const query = useMemo<AdminOrdersQuery>(
    () => ({
      page: 1,
      limit: 20,
      status: filters.status ? (filters.status as AdminOrdersQuery["status"]) : undefined,
      purpose: filters.purpose ? (filters.purpose as AdminOrdersQuery["purpose"]) : undefined,
      userId: filters.userId || undefined,
    }),
    [filters],
  );

  const ordersQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_BILLING_ORDERS(query),
    queryFn: () => getAdminPaymentOrders(query),
  });

  const orders = ordersQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <Header title={t("billing.admin.orders.title")} subtitle={t("billing.admin.orders.subtitle")} eyebrow={t("billing.admin.eyebrow")} />
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle>{t("billing.admin.common.filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Filter label={t("billing.admin.table.status")} value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status }))} placeholder="PAID" />
          <Filter label={t("billing.admin.table.purpose")} value={filters.purpose} onChange={(purpose) => setFilters((prev) => ({ ...prev, purpose }))} placeholder="SUBSCRIPTION" />
          <Filter label={t("billing.admin.table.userId")} value={filters.userId} onChange={(userId) => setFilters((prev) => ({ ...prev, userId }))} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-3">{t("billing.admin.table.order")}</th>
                <th>{t("billing.admin.table.user")}</th>
                <th>{t("billing.admin.table.purpose")}</th>
                <th>{t("billing.admin.table.status")}</th>
                <th>{t("billing.admin.table.amount")}</th>
                <th>{t("billing.admin.table.created")}</th>
                <th>{t("billing.admin.table.paid")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-5 py-3 font-bold">{order.orderCode}</td>
                  <td>{order.userEmail || order.userId || "-"}</td>
                  <td>{order.purpose.replace(/_/g, " ")}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>{formatVnd(order.amountVnd)}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{formatDate(order.paidAt)}</td>
                </tr>
              ))}
              {!orders.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    {ordersQuery.isLoading ? t("billing.common.loading") : t("billing.admin.orders.empty")}
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

function Header({ title, subtitle, eyebrow }: { title: string; subtitle: string; eyebrow: string }) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h1 className="text-3xl font-black text-slate-950 dark:text-white">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 h-11 rounded-xl" />
    </div>
  );
}
