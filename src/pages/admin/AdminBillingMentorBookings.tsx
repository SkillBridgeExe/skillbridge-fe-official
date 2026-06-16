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
import {
  getAdminMentorBookings,
  type AdminMentorBookingDto,
  type AdminMentorBookingsQuery,
} from "@/services/admin-billing.service";

export default function AdminBillingMentorBookings() {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState({ status: "", studentId: "", mentorId: "" });
  const [selectedBooking, setSelectedBooking] = useState<AdminMentorBookingDto | null>(null);
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
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-normal text-primary">{t("billing.admin.eyebrow")}</p>
        <h1 className="text-3xl font-bold tracking-normal text-foreground">{t("billing.admin.mentorBookings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("billing.admin.mentorBookings.subtitle")}</p>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader><CardTitle>{t("billing.admin.common.filters")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Filter label={t("billing.admin.table.status")} value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status }))} placeholder="AWAITING_REMAINING" />
          <Filter label={t("billing.admin.table.studentId")} value={filters.studentId} onChange={(studentId) => setFilters((prev) => ({ ...prev, studentId }))} />
          <Filter label={t("billing.admin.table.mentorId")} value={filters.mentorId} onChange={(mentorId) => setFilters((prev) => ({ ...prev, mentorId }))} />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">{t("billing.admin.table.booking")}</th>
                <th>{t("billing.admin.table.student")}</th>
                <th>{t("billing.admin.table.mentor")}</th>
                <th>{t("billing.admin.table.status")}</th>
                <th>{t("billing.admin.table.amount")}</th>
                <th>{t("billing.admin.table.depositOrder")}</th>
                <th>{t("billing.admin.table.remainingOrder")}</th>
                <th>{t("billing.admin.table.created")}</th>
                <th className="w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono text-xs">{booking.id}</td>
                  <td>{booking.studentEmail || booking.studentId || "-"}</td>
                  <td>{booking.mentorEmail || booking.mentorId || "-"}</td>
                  <td><StatusBadge status={booking.status} /></td>
                  <td>{formatVnd(booking.amountVnd)}</td>
                  <td>{booking.depositOrderCode ?? "-"}</td>
                  <td>{booking.remainingOrderCode ?? "-"}</td>
                  <td>{formatDate(booking.createdAt)}</td>
                  <td className="text-center">
                    <AdminIconActionButton label="View booking details" variant="outline" onClick={() => setSelectedBooking(booking)}>
                      <Eye data-icon="inline-start" />
                    </AdminIconActionButton>
                  </td>
                </tr>
              ))}
              {!bookings.length ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                    {bookingsQuery.isLoading ? t("billing.common.loading") : t("billing.admin.mentorBookings.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mentor booking</DialogTitle>
            <DialogDescription>{selectedBooking?.id}</DialogDescription>
          </DialogHeader>
          {selectedBooking ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Booking ID" value={selectedBooking.id} />
              <DetailItem label="Status" value={<StatusBadge status={selectedBooking.status} />} />
              <DetailItem label="Student" value={selectedBooking.studentEmail || selectedBooking.studentId || "-"} />
              <DetailItem label="Mentor" value={selectedBooking.mentorEmail || selectedBooking.mentorId || "-"} />
              <DetailItem label="Amount" value={formatVnd(selectedBooking.amountVnd)} />
              <DetailItem label="Deposit order" value={selectedBooking.depositOrderCode ?? "-"} />
              <DetailItem label="Remaining order" value={selectedBooking.remainingOrderCode ?? "-"} />
              <DetailItem label="Created" value={formatDate(selectedBooking.createdAt)} />
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
