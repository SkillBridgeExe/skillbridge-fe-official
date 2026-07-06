import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  MessageSquareText,
  Star,
  XCircle,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useMyBookings,
  usePayBooking,
  useCancelBooking,
  useReviewBooking,
} from "@/hooks/use-mentor-bookings";
import { useToast } from "@/hooks/use-toast";
import { formatVnd } from "@/components/ecosystem/MentorCard";
import { getBillingCheckoutPath } from "@/lib/billing-checkout";
import type { MentorBookingDto } from "@/services/mentor-bookings.service";

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  EXPIRED: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
};

export default function MentorBilling() {
  const { t } = useTranslation("common");
  const bookingsQuery = useMyBookings();
  const bookings = bookingsQuery.data ?? [];
  const activeBookings = bookings.filter((booking) => booking.status === "PENDING_PAYMENT");
  const upcomingBookings = bookings.filter((booking) => booking.status === "CONFIRMED");
  const historyBookings = bookings.filter((booking) =>
    ["COMPLETED", "CANCELLED", "EXPIRED"].includes(booking.status),
  );

  return (
    <Layout>
      <main className="min-h-dvh bg-slate-50/70 pb-20 dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {t("mentor.billing.title", "Booking Mentor")}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("mentor.billing.subtitle", "Quản lý các buổi mentoring đã đặt")}
          </p>

          <div className="mt-8 space-y-6">
            {bookingsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)
            ) : !bookings.length ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-950">
                <CalendarCheck2 className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                <p className="mt-4 font-bold text-slate-500 dark:text-slate-400">
                  {t("mentor.billing.noBookings", "Chưa có booking nào")}
                </p>
                <Button asChild className="mt-4 rounded-xl font-bold">
                  <Link to="/ecosystem">{t("mentor.billing.browse", "Tìm mentor")}</Link>
                </Button>
              </div>
            ) : (
              <>
                <BookingSection
                  title={t("mentor.billing.activeTitle", "Đang cần xử lý")}
                  bookings={activeBookings}
                />
                <BookingSection
                  title={t("mentor.billing.upcomingTitle", "Sắp tới")}
                  bookings={upcomingBookings}
                />
                <BookingSection
                  title={t("mentor.billing.historyTitle", "Lịch sử")}
                  bookings={historyBookings}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}

function BookingSection({ title, bookings }: { title: string; bookings: MentorBookingDto[] }) {
  if (bookings.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      {bookings.map((booking) => (
        <StudentBookingCard key={booking.id} booking={booking} />
      ))}
    </section>
  );
}

function StudentBookingCard({ booking }: { booking: MentorBookingDto }) {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const navigate = useNavigate();
  const payBooking = usePayBooking();
  const cancelBooking = useCancelBooking();
  const reviewBooking = useReviewBooking();

  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState("");

  const handlePayBooking = async () => {
    try {
      const checkout = await payBooking.mutateAsync(booking.id);
      const checkoutPath = getBillingCheckoutPath(checkout);
      if (!checkoutPath) {
        toast({
          title: t("mentor.billing.payFailed", "Payment error"),
          description: t("mentor.billing.checkoutUnavailable", "Checkout is not available for this booking yet."),
          variant: "destructive",
        });
        return;
      }

      navigate(checkoutPath);
    } catch (error) {
      toast({
        title: t("mentor.billing.payFailed", "Lỗi thanh toán"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (cancelReason.trim().length < 3) return;
    try {
      await cancelBooking.mutateAsync({
        bookingId: booking.id,
        payload: { reason: cancelReason.trim() },
      });
      toast({ title: t("mentor.billing.cancelled", "Đã hủy booking") });
      setShowCancel(false);
    } catch (error) {
      toast({
        title: t("mentor.billing.cancelFailed", "Lỗi hủy booking"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleReview = async () => {
    try {
      await reviewBooking.mutateAsync({
        bookingId: booking.id,
        payload: { rating, comment: comment.trim() || undefined },
      });
      toast({ title: t("mentor.billing.reviewed", "Đã gửi đánh giá") });
      setShowReview(false);
    } catch (error) {
      toast({
        title: t("mentor.billing.reviewFailed", "Lỗi gửi đánh giá"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[booking.status] ?? ""}`}>
              {t(`mentor.billing.statusLabels.${booking.status}`, {
                defaultValue: booking.status.replace(/_/g, " "),
              })}
            </Badge>
            {booking.refundStatus !== "NOT_REQUIRED" ? (
              <Badge variant="outline" className="rounded-full text-xs">
                {t("mentor.billing.refundLabel")}:{" "}
                {t(`mentor.billing.refundStatusLabels.${booking.refundStatus}`, {
                  defaultValue: booking.refundStatus.replace(/_/g, " "),
                })}
              </Badge>
            ) : null}
          </div>
          {booking.package ? (
            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              {booking.package.headline ?? booking.package.mentorSlug}
            </p>
          ) : null}
          {booking.slotStart ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {new Date(booking.slotStart).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
              {" • "}
              {new Date(booking.slotStart).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          ) : null}
          {booking.studentGoal ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
              {booking.studentGoal}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-slate-950 dark:text-white">{formatVnd(booking.totalAmountVnd)}</p>
        </div>
      </div>

      <BookingTimeline booking={booking} />

      {/* Status-based actions */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        {booking.status === "PENDING_PAYMENT" ? (
          <Button
            onClick={handlePayBooking}
            disabled={payBooking.isPending}
            className="h-10 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90"
          >
            {payBooking.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CreditCard className="mr-1 h-4 w-4" />}
            {t("mentor.billing.payBooking", "Thanh toán để xác nhận")}
          </Button>
        ) : null}

        {booking.status === "CONFIRMED" && booking.meetingUrl ? (
          <a
            href={booking.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" /> {t("mentor.billing.joinMeeting", "Vào meeting")}
          </a>
        ) : null}

        {booking.status === "CONFIRMED" && !booking.meetingUrl ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <Clock3 className="h-4 w-4" />
            {t("mentor.billing.waitingMeetingLink", "Mentor sẽ cập nhật link meeting trước buổi học.")}
          </p>
        ) : null}

        {booking.status === "COMPLETED" ? (
          <Button
            variant="outline"
            onClick={() => setShowReview(!showReview)}
            className="h-10 rounded-xl font-bold"
          >
            <Star className="mr-1 h-4 w-4" />
            {t("mentor.billing.review", "Đánh giá")}
          </Button>
        ) : null}

        {["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status) ? (
          <Button
            variant="outline"
            onClick={() => setShowCancel(!showCancel)}
            className="h-10 rounded-xl font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <XCircle className="mr-1 h-4 w-4" />
            {t("mentor.billing.cancel", "Hủy")}
          </Button>
        ) : null}
      </div>

      {/* Cancel form */}
      {showCancel ? (
        <div className="mt-3 space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={t("mentor.billing.cancelReasonPlaceholder", "Lý do hủy (tối thiểu 3 ký tự)...")}
            className="rounded-xl"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              disabled={cancelBooking.isPending || cancelReason.trim().length < 3}
              size="sm"
              className="rounded-xl bg-red-600 font-bold text-white hover:bg-red-700"
            >
              {cancelBooking.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {t("mentor.billing.confirmCancel", "Xác nhận hủy")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)} className="rounded-xl font-bold">
              {t("common.close", "Đóng")}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Review form */}
      {showReview ? (
        <div className="mt-3 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
              {t("mentor.billing.rating")}
            </label>
            <div className="flex gap-1">
              {([1, 2, 3, 4, 5] as const).map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`h-8 w-8 rounded-lg transition-colors ${star <= rating ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}
                >
                  <Star className="mx-auto h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("mentor.billing.commentPlaceholder", "Nhận xét (tuỳ chọn)...")}
            className="rounded-xl"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleReview}
              disabled={reviewBooking.isPending}
              size="sm"
              className="rounded-xl font-bold"
            >
              {reviewBooking.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {t("mentor.billing.submitReview", "Gửi đánh giá")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowReview(false)} className="rounded-xl font-bold">
              {t("common.close", "Đóng")}
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

function BookingTimeline({ booking }: { booking: MentorBookingDto }) {
  const { t } = useTranslation("common");
  const paid = ["CONFIRMED", "COMPLETED"].includes(booking.status);
  const completed = booking.status === "COMPLETED";
  const cancelled = ["CANCELLED", "EXPIRED"].includes(booking.status);

  return (
    <div className="mt-4 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-3">
      <TimelineStep done={paid} label={t("mentor.billing.timeline.paid")} />
      <TimelineStep done={paid} label={t("mentor.billing.timeline.confirmed")} />
      <TimelineStep
        done={completed}
        muted={cancelled}
        label={cancelled ? t("mentor.billing.timeline.closed") : t("mentor.billing.timeline.completed")}
      />
    </div>
  );
}

function TimelineStep({ done, label, muted }: { done: boolean; label: string; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-xs font-bold ${done ? "text-emerald-700 dark:text-emerald-300" : muted ? "text-slate-400" : "text-slate-500"}`}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
      {label}
    </div>
  );
}
