import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUERY_KEYS } from "@/constants/app";
import { formatDate, formatVnd, StatusBadge } from "@/lib/billing-ui";
import { getAdminMentorBookings, type AdminMentorBookingsQuery } from "@/services/admin-billing.service";

export default function AdminBillingMentorBookings() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState({ status: "", studentId: "", mentorId: "" });
  const query = useMemo<AdminMentorBookingsQuery>(
    () => ({
      page: 1,
      limit: 20,
      status: filters.status ? (filters.status as AdminMentorBookingsQuery["status"]) : undefined,
      studentId: filters.studentId || undefined,
      mentorId: filters.mentorId || undefined,
    }),
    [filters],
  );

  const bookingsQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_BILLING_MENTOR_BOOKINGS(query),
    queryFn: () => getAdminMentorBookings(query),
  });

  const bookings = bookingsQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-primary">{t("billing.admin.eyebrow")}</p>
        <h1 className="text-3xl font-black text-slate-950 dark:text-white">{t("billing.admin.mentorBookings.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("billing.admin.mentorBookings.subtitle")}</p>
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader><CardTitle>{t("billing.admin.common.filters")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Filter label={t("billing.admin.table.status")} value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status }))} placeholder="AWAITING_REMAINING" />
          <Filter label={t("billing.admin.table.studentId")} value={filters.studentId} onChange={(studentId) => setFilters((prev) => ({ ...prev, studentId }))} />
          <Filter label={t("billing.admin.table.mentorId")} value={filters.mentorId} onChange={(mentorId) => setFilters((prev) => ({ ...prev, mentorId }))} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-3">{t("billing.admin.table.booking")}</th>
                <th>{t("billing.admin.table.student")}</th>
                <th>{t("billing.admin.table.mentor")}</th>
                <th>{t("billing.admin.table.status")}</th>
                <th>{t("billing.admin.table.amount")}</th>
                <th>{t("billing.admin.table.depositOrder")}</th>
                <th>{t("billing.admin.table.remainingOrder")}</th>
                <th>{t("billing.admin.table.created")}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-5 py-3 font-mono text-xs">{booking.id}</td>
                  <td>{booking.studentEmail || booking.studentId || "-"}</td>
                  <td>{booking.mentorEmail || booking.mentorId || "-"}</td>
                  <td><StatusBadge status={booking.status} /></td>
                  <td>{formatVnd(booking.amountVnd)}</td>
                  <td>{booking.depositOrderCode ?? "-"}</td>
                  <td>{booking.remainingOrderCode ?? "-"}</td>
                  <td>{formatDate(booking.createdAt)}</td>
                </tr>
              ))}
              {!bookings.length ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    {bookingsQuery.isLoading ? t("billing.common.loading") : t("billing.admin.mentorBookings.empty")}
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
