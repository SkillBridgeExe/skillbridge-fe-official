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
import { DetailItem, formatDate, StatusBadge } from "@/lib/billing-ui";
import {
  getAdminSubscriptions,
  type AdminSubscriptionDto,
  type AdminSubscriptionsQuery,
} from "@/services/admin-billing.service";

export default function AdminBillingSubscriptions() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState({ status: "", planCode: "", userId: "" });
  const [selectedSubscription, setSelectedSubscription] = useState<AdminSubscriptionDto | null>(null);
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
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-normal text-primary">{t("billing.admin.eyebrow")}</p>
        <h1 className="text-3xl font-bold tracking-normal text-foreground">{t("billing.admin.subscriptions.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("billing.admin.subscriptions.subtitle")}</p>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader><CardTitle>{t("billing.admin.common.filters")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Filter label={t("billing.admin.table.status")} value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status }))} placeholder="ACTIVE" />
          <Filter label={t("billing.admin.table.planCode")} value={filters.planCode} onChange={(planCode) => setFilters((prev) => ({ ...prev, planCode }))} placeholder="PRO" />
          <Filter label={t("billing.admin.table.userId")} value={filters.userId} onChange={(userId) => setFilters((prev) => ({ ...prev, userId }))} />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">{t("billing.admin.table.id")}</th>
                <th>{t("billing.admin.table.user")}</th>
                <th>{t("billing.admin.table.plan")}</th>
                <th>{t("billing.admin.table.status")}</th>
                <th>{t("billing.admin.table.periodStart")}</th>
                <th>{t("billing.admin.table.periodEnd")}</th>
                <th className="w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono text-xs">{item.id}</td>
                  <td>{item.userEmail || item.userId || "-"}</td>
                  <td className="font-semibold">{item.planCode}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{formatDate(item.currentPeriodStart)}</td>
                  <td>{formatDate(item.currentPeriodEnd)}</td>
                  <td className="text-center">
                    <AdminIconActionButton label="View subscription details" variant="outline" onClick={() => setSelectedSubscription(item)}>
                      <Eye data-icon="inline-start" />
                    </AdminIconActionButton>
                  </td>
                </tr>
              ))}
              {!subscriptions.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    {subscriptionsQuery.isLoading ? t("billing.common.loading") : t("billing.admin.subscriptions.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedSubscription)} onOpenChange={(open) => !open && setSelectedSubscription(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription {selectedSubscription?.planCode}</DialogTitle>
            <DialogDescription>{selectedSubscription?.userEmail || selectedSubscription?.userId || "No user attached"}</DialogDescription>
          </DialogHeader>
          {selectedSubscription ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Subscription ID" value={selectedSubscription.id} />
              <DetailItem label="User" value={selectedSubscription.userEmail || selectedSubscription.userId || "-"} />
              <DetailItem label="Plan code" value={selectedSubscription.planCode} />
              <DetailItem label="Status" value={<StatusBadge status={selectedSubscription.status} />} />
              <DetailItem label="Period start" value={formatDate(selectedSubscription.currentPeriodStart)} />
              <DetailItem label="Period end" value={formatDate(selectedSubscription.currentPeriodEnd)} />
              <DetailItem label="Created" value={formatDate(selectedSubscription.createdAt)} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Filter({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 h-11" />
    </div>
  );
}
