import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarCheck2,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  MessageSquareText,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useMentorOwnedBookings,
  useSetMeetingLink,
  useCompleteBooking,
  useMentorCancelBooking,
} from "@/hooks/use-mentor-bookings";
import { useToast } from "@/hooks/use-toast";
import { formatVnd } from "@/components/ecosystem/MentorCard";
import type { MentorBookingDto } from "@/services/mentor-bookings.service";

const STATUS_STYLES: Record<string, string> = {
  PENDING_DEPOSIT: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  AWAITING_REMAINING: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  EXPIRED: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
};

export default function MentorRequests() {
  const { t } = useTranslation("common");
  const bookingsQuery = useMentorOwnedBookings();

  if (bookingsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-60" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  const bookings = bookingsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {t("mentor.requests.title", "Yêu cầu đặt lịch")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("mentor.requests.subtitle", "Quản lý các buổi mentoring được đặt cho bạn")}
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-950">
          <CalendarCheck2 className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-4 font-bold text-slate-500 dark:text-slate-400">
            {t("mentor.requests.noBookings", "Chưa có booking nào")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking }: { booking: MentorBookingDto }) {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const setMeetingLink = useSetMeetingLink();
  const complete = useCompleteBooking();
  const cancel = useMentorCancelBooking();

  const [meetingUrl, setMeetingUrl] = useState(booking.meetingUrl ?? "");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const isPastSlotEnd = booking.slotEnd ? new Date(booking.slotEnd) < new Date() : false;

  const handleSetLink = async () => {
    if (!meetingUrl.trim()) return;
    try {
      await setMeetingLink.mutateAsync({
        bookingId: booking.id,
        payload: { meetingUrl: meetingUrl.trim() },
      });
      toast({ title: t("mentor.requests.linkSet", "Meeting link đã cập nhật") });
    } catch (error) {
      toast({
        title: t("mentor.requests.linkFailed", "Lỗi cập nhật link"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    try {
      await complete.mutateAsync(booking.id);
      toast({ title: t("mentor.requests.completed", "Đã hoàn thành buổi mentoring") });
    } catch (error) {
      toast({
        title: t("mentor.requests.completeFailed", "Lỗi"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (cancelReason.trim().length < 3) return;
    try {
      await cancel.mutateAsync({
        bookingId: booking.id,
        payload: { reason: cancelReason.trim() },
      });
      toast({ title: t("mentor.requests.cancelled", "Đã hủy booking") });
      setShowCancel(false);
    } catch (error) {
      toast({
        title: t("mentor.requests.cancelFailed", "Lỗi hủy booking"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[booking.status] ?? ""}`}>
              {booking.status.replace(/_/g, " ")}
            </Badge>
            {booking.refundStatus !== "NOT_REQUIRED" ? (
              <Badge variant="outline" className="rounded-full text-xs">
                Refund: {booking.refundStatus}
              </Badge>
            ) : null}
          </div>
          {booking.slotStart ? (
            <p className="mt-2 font-bold text-slate-950 dark:text-white">
              {new Date(booking.slotStart).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
              {" • "}
              {new Date(booking.slotStart).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              {" – "}
              {booking.slotEnd ? new Date(booking.slotEnd).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("mentor.requests.amount", "Tổng")}: {formatVnd(booking.totalAmountVnd)}
          </p>
        </div>

        {/* Meeting link for CONFIRMED bookings */}
        {booking.meetingUrl ? (
          <a
            href={booking.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/20"
          >
            <ExternalLink className="h-4 w-4" /> Meeting
          </a>
        ) : null}
      </div>

      {/* Actions by status */}
      {booking.status === "CONFIRMED" ? (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          {/* Set meeting link */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px] flex-1">
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                <Link2 className="mr-1 inline h-3.5 w-3.5" />
                {t("mentor.requests.meetingLink", "Meeting URL")}
              </label>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="h-10 rounded-xl"
              />
            </div>
            <Button
              onClick={handleSetLink}
              disabled={setMeetingLink.isPending || !meetingUrl.trim()}
              size="sm"
              className="h-10 rounded-xl font-bold"
            >
              {setMeetingLink.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Link2 className="mr-1 h-4 w-4" />}
              {t("mentor.requests.setLink", "Lưu link")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {isPastSlotEnd ? (
              <Button
                onClick={handleComplete}
                disabled={complete.isPending}
                className="h-10 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              >
                {complete.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                {t("mentor.requests.markComplete", "Hoàn thành")}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => setShowCancel(!showCancel)}
              className="h-10 rounded-xl font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <XCircle className="mr-1 h-4 w-4" />
              {t("mentor.requests.cancel", "Hủy")}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Cancel button for non-confirmed cancellable statuses */}
      {["PENDING_DEPOSIT", "AWAITING_REMAINING"].includes(booking.status) ? (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button
            variant="outline"
            onClick={() => setShowCancel(!showCancel)}
            className="h-10 rounded-xl font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <XCircle className="mr-1 h-4 w-4" />
            {t("mentor.requests.cancel", "Hủy")}
          </Button>
        </div>
      ) : null}

      {/* Cancellation reason input (for CONFIRMED/AWAITING_REMAINING) */}
      {showCancel && ["CONFIRMED", "AWAITING_REMAINING", "PENDING_DEPOSIT"].includes(booking.status) ? (
        <div className="mt-3 space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={t("mentor.requests.cancelReasonPlaceholder", "Lý do hủy (tối thiểu 3 ký tự)...")}
            className="rounded-xl"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              disabled={cancel.isPending || cancelReason.trim().length < 3}
              size="sm"
              className="rounded-xl bg-red-600 font-bold text-white hover:bg-red-700"
            >
              {cancel.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {t("mentor.requests.confirmCancel", "Xác nhận hủy")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)} className="rounded-xl font-bold">
              {t("common.cancel", "Đóng")}
            </Button>
          </div>
        </div>
      ) : null}

      {booking.cancellationReason ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{booking.cancellationReason}</p>
        </div>
      ) : null}
    </div>
  );
}
