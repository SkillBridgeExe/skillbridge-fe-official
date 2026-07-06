import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarCheck2, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminMentorBookings,
  useAdminMentorBookingRefund,
} from "@/hooks/use-mentor-bookings";
import { useToast } from "@/hooks/use-toast";
import { formatVnd } from "@/components/ecosystem/MentorCard";
import {
  MENTOR_BOOKING_REFUND_STATUSES,
  MENTOR_BOOKING_STATUSES,
  type MentorBookingRefundStatus,
  type MentorBookingStatus,
} from "@/services/mentor-bookings.service";
import type { AdminMentorBookingDto } from "@/services/mentor-bookings.service";

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PENDING_DEPOSIT: "bg-amber-100 text-amber-800",
  AWAITING_REMAINING: "bg-orange-100 text-orange-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  EXPIRED: "bg-slate-100 text-slate-600",
};

export default function AdminBillingMentorBookings() {
  const { t } = useTranslation("common");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<MentorBookingStatus | "ALL">("ALL");
  const [refundStatusFilter, setRefundStatusFilter] = useState<MentorBookingRefundStatus | "ALL">("ALL");

  const query = {
    page,
    limit: 20,
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(refundStatusFilter !== "ALL" ? { refundStatus: refundStatusFilter } : {}),
  };

  const bookingsQuery = useAdminMentorBookings(query);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {t("admin.mentorBookings.title", "Mentor Bookings")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("admin.mentorBookings.subtitle", "Quản lý booking mentor và xử lý refund")}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as MentorBookingStatus | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 w-[180px] rounded-xl">
            <SelectValue placeholder={t("admin.mentorBookings.statusFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("admin.mentorBookings.allStatuses")}</SelectItem>
            {MENTOR_BOOKING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={refundStatusFilter}
          onValueChange={(val) => {
            setRefundStatusFilter(val as MentorBookingRefundStatus | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 w-[190px] rounded-xl">
            <SelectValue placeholder={t("admin.mentorBookings.refundStatusFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("admin.mentorBookings.allRefunds")}</SelectItem>
            {MENTOR_BOOKING_REFUND_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`admin.mentorBookings.refundStatusLabels.${s}`, {
                  defaultValue: s.replace(/_/g, " "),
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">
          {bookingsQuery.data
            ? t("admin.mentorBookings.totalBookings", { count: bookingsQuery.data.total })
            : ""}
        </span>
      </div>

      {/* Booking list */}
      {bookingsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : !bookingsQuery.data?.items.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-950">
          <CalendarCheck2 className="h-12 w-12 text-slate-300" />
          <p className="mt-4 font-bold text-slate-500">{t("admin.mentorBookings.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookingsQuery.data.items.map((booking) => (
            <AdminBookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {bookingsQuery.data && bookingsQuery.data.total > 20 ? (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl font-bold"
          >
            {t("admin.mentorBookings.previous")}
          </Button>
          <span className="flex items-center px-3 text-sm text-slate-500">
            {t("admin.mentorBookings.page", {
              page,
              total: Math.ceil(bookingsQuery.data.total / 20),
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(bookingsQuery.data.total / 20)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl font-bold"
          >
            {t("admin.mentorBookings.next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function AdminBookingRow({ booking }: { booking: AdminMentorBookingDto }) {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const refundMutation = useAdminMentorBookingRefund();
  const [showRefund, setShowRefund] = useState(false);
  const [refundStatus, setRefundStatus] = useState<"PROCESSED" | "REJECTED">("PROCESSED");
  const [refundNote, setRefundNote] = useState("");

  const handleRefund = async () => {
    if (!refundNote.trim()) return;
    try {
      await refundMutation.mutateAsync({
        bookingId: booking.id,
        payload: { status: refundStatus, note: refundNote.trim() },
      });
      toast({
        title: t("admin.mentorBookings.refundProcessed", {
          status: t(`admin.mentorBookings.refundStatusLabels.${refundStatus}`),
        }),
      });
      setShowRefund(false);
    } catch (error) {
      toast({
        title: t("admin.mentorBookings.refundFailed"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[booking.status] ?? ""}`}>
              {booking.status.replace(/_/g, " ")}
            </Badge>
            {booking.refundStatus !== "NOT_REQUIRED" ? (
              <Badge
                variant="outline"
                className={`rounded-full text-xs ${booking.refundStatus === "PENDING" ? "border-amber-300 text-amber-700" : ""}`}
              >
                {t("admin.mentorBookings.refundLabel")}:{" "}
                {t(`admin.mentorBookings.refundStatusLabels.${booking.refundStatus}`, {
                  defaultValue: booking.refundStatus.replace(/_/g, " "),
                })}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Booking: <span className="font-mono">{booking.id.slice(0, 8)}</span>
            {" • "}Student: <span className="font-mono">{booking.studentId.slice(0, 8)}</span>
            {" • "}Mentor: <span className="font-mono">{booking.mentorId?.slice(0, 8) ?? "-"}</span>
          </p>
          {booking.slotStart ? (
            <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              {new Date(booking.slotStart).toLocaleDateString("vi-VN")} {new Date(booking.slotStart).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          ) : null}
          {booking.studentGoal ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">{t("admin.mentorBookings.studentGoal")}:</span>{" "}
              {booking.studentGoal}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-950 dark:text-white">{formatVnd(booking.totalAmountVnd)}</p>
          <p className="text-xs text-slate-400">
            {t("admin.mentorBookings.paymentLabel")}: {formatVnd(booking.totalAmountVnd)}
          </p>
        </div>
      </div>

      {/* Refund action for PENDING refund status */}
      {booking.refundStatus === "PENDING" ? (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          {!showRefund ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRefund(true)}
              className="rounded-xl font-bold"
            >
              <RefreshCw className="mr-1 h-4 w-4" /> {t("admin.mentorBookings.processRefund")}
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
              <div className="flex gap-2">
                <Select value={refundStatus} onValueChange={(v) => setRefundStatus(v as "PROCESSED" | "REJECTED")}>
                  <SelectTrigger className="h-9 w-[140px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROCESSED">{t("admin.mentorBookings.processed")}</SelectItem>
                    <SelectItem value="REJECTED">{t("admin.mentorBookings.rejected")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                placeholder={t("admin.mentorBookings.refundNotePlaceholder")}
                className="rounded-lg"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleRefund}
                  disabled={refundMutation.isPending || !refundNote.trim()}
                  className="rounded-lg font-bold"
                >
                  {refundMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  {t("admin.mentorBookings.confirm")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowRefund(false)} className="rounded-lg font-bold">
                  {t("admin.mentorBookings.close")}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {booking.refundNote ? (
        <p className="mt-2 text-xs text-slate-500">
          Refund note: {booking.refundNote}
        </p>
      ) : null}
    </div>
  );
}
