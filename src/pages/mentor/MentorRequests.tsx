import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarCheck2,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  UserCircle2,
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
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  EXPIRED: "bg-slate-100 text-slate-600",
};

export default function MentorRequests() {
  const { t } = useTranslation("common");
  const bookingsQuery = useMentorOwnedBookings();
  const [selectedBooking, setSelectedBooking] = useState<MentorBookingDto | null>(null);

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
      {selectedBooking && (
        <BookingDetailDrawer
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">
          {t("mentor.requests.title", "Mentoring Requests")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("mentor.requests.subtitle", "Manage your upcoming and past mentoring sessions.")}
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <CalendarCheck2 className="h-12 w-12 text-slate-300" />
          <p className="mt-4 font-bold text-slate-500">
            {t("mentor.requests.noBookings", "No bookings yet")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onClick={() => setSelectedBooking(booking)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking, onClick }: { booking: MentorBookingDto; onClick: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-sky-200 cursor-pointer"
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          <UserCircle2 size={24} className="text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">
              User #{booking.studentId.substring(0, 8)}
            </h3>
            <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-bold border-none ${STATUS_STYLES[booking.status] ?? ""}`}>
              {t(`mentor.requests.statusLabels.${booking.status}`, {
                defaultValue: booking.status.replace(/_/g, " "),
              })}
            </Badge>
          </div>

          {booking.slotStart && (
            <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                {new Date(booking.slotStart).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                {new Date(booking.slotStart).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
          <p className="mt-2 text-sm font-medium text-primary">
            {formatVnd(booking.totalAmountVnd)}
          </p>
        </div>
      </div>
    </div>
  );
}

function BookingDetailDrawer({ booking, onClose }: { booking: MentorBookingDto; onClose: () => void }) {
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
      toast({ title: t("mentor.requests.linkSet", "Meeting link updated") });
    } catch (error) {
      toast({
        title: t("mentor.requests.linkFailed", "Failed to update link"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    try {
      await complete.mutateAsync(booking.id);
      toast({ title: t("mentor.requests.completed", "Session marked as completed") });
    } catch (error) {
      toast({
        title: t("mentor.requests.completeFailed", "Failed to complete"),
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
      toast({ title: t("mentor.requests.cancelled", "Booking cancelled") });
      setShowCancel(false);
    } catch (error) {
      toast({
        title: t("mentor.requests.cancelFailed", "Failed to cancel"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <h2 className="text-lg font-bold text-slate-900">{t("mentor.requests.bookingDetails")}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <XCircle size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Header */}
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <UserCircle2 size={32} className="text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">User #{booking.studentId.substring(0, 8)}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-bold border-none ${STATUS_STYLES[booking.status] ?? ""}`}>
                  {t(`mentor.requests.statusLabels.${booking.status}`, {
                    defaultValue: booking.status.replace(/_/g, " "),
                  })}
                </Badge>
                {booking.refundStatus !== "NOT_REQUIRED" && (
                  <Badge variant="outline" className="rounded-full text-xs">
                    {t("mentor.requests.refundLabel")}:{" "}
                    {t(`mentor.requests.refundStatusLabels.${booking.refundStatus}`, {
                      defaultValue: booking.refundStatus.replace(/_/g, " "),
                    })}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Calendar size={16} className="text-slate-400" />
              <span className="font-medium">
                {booking.slotStart ? new Date(booking.slotStart).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }) : "TBD"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Clock size={16} className="text-slate-400" />
              <span className="font-medium">
                {booking.slotStart ? new Date(booking.slotStart).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
                {" - "}
                {booking.slotEnd ? new Date(booking.slotEnd).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <AlertCircle size={16} className="text-slate-400" />
              <span className="font-medium text-primary">{formatVnd(booking.totalAmountVnd)}</span>
            </div>
          </div>

          {/* Message / Purpose */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              {t("mentor.requests.requestNotes")}
            </h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 italic">
              {booking.studentGoal || t("mentor.requests.noStudentGoal", "No goal note was provided for this booking.")}
            </div>
          </div>

          {/* Meeting Link Section */}
          {booking.status === "CONFIRMED" && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Link2 size={16} className="text-slate-400" />
                {t("mentor.requests.meetingLink")}
              </h4>
              <div className="flex gap-2">
                <Input
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="bg-slate-50"
                />
                <Button
                  onClick={handleSetLink}
                  disabled={setMeetingLink.isPending || !meetingUrl.trim()}
                  className="shrink-0"
                >
                  {setMeetingLink.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t("mentor.requests.saveLink")}
                </Button>
              </div>
              {booking.meetingUrl && (
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline mt-2"
                >
                  <ExternalLink size={14} /> {t("mentor.requests.openMeetingRoom")}
                </a>
              )}
            </div>
          )}

          {booking.cancellationReason && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
              <span className="font-semibold block mb-1">{t("mentor.requests.cancellationReason")}</span>
              {booking.cancellationReason}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
          {booking.status === "PENDING_PAYMENT" ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {t("mentor.requests.waitingPayment", "Student selected your slot and is completing payment. No accept action is needed.")}
            </p>
          ) : null}

          {/* Real Actions */}
          {["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status) && (
            <div className="flex gap-3">
              {booking.status === "CONFIRMED" && isPastSlotEnd && (
                <Button
                  onClick={handleComplete}
                  disabled={complete.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {complete.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {t("mentor.requests.markCompleted")}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowCancel(!showCancel)}
                className="flex-1 text-red-600 hover:bg-red-50 font-bold"
              >
                {t("mentor.requests.cancelSession")}
              </Button>
            </div>
          )}

          {showCancel && ["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status) && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 mt-4 animate-in fade-in zoom-in-95">
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t("mentor.requests.cancelReasonPlaceholder")}
                className="bg-white mb-3"
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)}>
                  {t("mentor.requests.abort")}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={cancel.isPending || cancelReason.trim().length < 3}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {cancel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("mentor.requests.confirmCancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
