import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import AdminIconActionButton from "@/components/admin/AdminIconActionButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUERY_KEYS } from "@/constants/app";
import { DetailItem, formatDate, formatVnd, StatusBadge } from "@/lib/billing-ui";
import { getAdminPaymentOrders } from "@/services/admin-billing.service";
import type { AdminOrdersQuery, AdminPaymentOrderDto } from "@/services/admin-billing.service";

export default function AdminBillingOrders() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState({ status: "", purpose: "", userId: "" });
  const [selectedOrder, setSelectedOrder] = useState<AdminPaymentOrderDto | null>(null);
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
    <div className="flex flex-col gap-5">
      <Header title={t("billing.admin.orders.title")} subtitle={t("billing.admin.orders.subtitle")} eyebrow={t("billing.admin.eyebrow")} />
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>{t("billing.admin.common.filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Filter label={t("billing.admin.table.status")} value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status }))} placeholder="PAID" />
          <Filter label={t("billing.admin.table.purpose")} value={filters.purpose} onChange={(purpose) => setFilters((prev) => ({ ...prev, purpose }))} placeholder="SUBSCRIPTION" />
          <Filter label={t("billing.admin.table.userId")} value={filters.userId} onChange={(userId) => setFilters((prev) => ({ ...prev, userId }))} />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">{t("billing.admin.table.order")}</th>
                <th>{t("billing.admin.table.user")}</th>
                <th>{t("billing.admin.table.purpose")}</th>
                <th>{t("billing.admin.table.status")}</th>
                <th>{t("billing.admin.table.amount")}</th>
                <th>{t("billing.admin.table.created")}</th>
                <th>{t("billing.admin.table.paid")}</th>
                <th className="w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono font-semibold">{order.orderCode}</td>
                  <td>{order.userEmail || order.userId || "-"}</td>
                  <td>{order.purpose.replace(/_/g, " ")}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>{formatVnd(order.amountVnd)}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{formatDate(order.paidAt)}</td>
                  <td className="text-center">
                    <AdminIconActionButton label="View order details" variant="outline" onClick={() => setSelectedOrder(order)}>
                      <Eye data-icon="inline-start" />
                    </AdminIconActionButton>
                  </td>
                </tr>
              ))}
              {!orders.length ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                    {ordersQuery.isLoading ? t("billing.common.loading") : t("billing.admin.orders.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.orderCode}</DialogTitle>
            <DialogDescription>{selectedOrder?.userEmail || selectedOrder?.userId || "No user attached"}</DialogDescription>
          </DialogHeader>
          {selectedOrder ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Order ID" value={selectedOrder.orderId} />
              <DetailItem label="Order code" value={selectedOrder.orderCode} />
              <DetailItem label="User" value={selectedOrder.userEmail || selectedOrder.userId || "-"} />
              <DetailItem label="Purpose" value={selectedOrder.purpose.replace(/_/g, " ")} />
              <DetailItem label="Status" value={<StatusBadge status={selectedOrder.status} />} />
              <DetailItem label="Amount" value={formatVnd(selectedOrder.amountVnd)} />
              <DetailItem label="Target type" value={selectedOrder.targetType || "-"} />
              <DetailItem label="Target ID" value={selectedOrder.targetId || "-"} />
              <DetailItem label="Created" value={formatDate(selectedOrder.createdAt)} />
              <DetailItem label="Paid" value={formatDate(selectedOrder.paidAt)} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Header({ title, subtitle, eyebrow }: { title: string; subtitle: string; eyebrow: string }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-normal text-primary">{eyebrow}</p>
      <h1 className="text-3xl font-bold tracking-normal text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
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
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 h-11" />
    </div>
  );
}
