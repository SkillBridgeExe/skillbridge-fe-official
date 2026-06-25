import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CalendarPlus, Clock3, Trash2, AlertCircle, CalendarDays, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyMentorProfile, useMyMentorSlots, useCreateMentorSlot, useDeleteMentorSlot } from "@/hooks/use-mentors";
import { useToast } from "@/hooks/use-toast";
import {
  defaultMentorDateRange,
  mentorDateRangeToIso,
  validateMentorDateRange,
} from "@/lib/mentor-date-range";

const SLOT_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  HELD: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  BOOKED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  BLOCKED: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
};

export default function MentorAvailability() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const profileQuery = useMyMentorProfile();
  const profile = profileQuery.data;

  const [dateRange, setDateRange] = useState(defaultMentorDateRange);
  const rangeError = validateMentorDateRange(dateRange.fromDate, dateRange.toDate);
  const slotQueryRange = useMemo(
    () =>
      rangeError
        ? { from: new Date().toISOString(), to: new Date().toISOString() }
        : mentorDateRangeToIso(dateRange.fromDate, dateRange.toDate),
    [dateRange.fromDate, dateRange.toDate, rangeError],
  );

  const slotsQuery = useMyMentorSlots(slotQueryRange, !rangeError);
  const createSlot = useCreateMentorSlot();
  const deleteSlot = useDeleteMentorSlot();

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const canManageSlots = profile?.status === "APPROVED" && profile.isAcceptingBookings;

  // Auto-calculate endsAt when startsAt changes based on profile duration
  const handleStartsAtChange = (value: string) => {
    setStartsAt(value);
    if (profile?.sessionDurationMinutes && value) {
      const start = new Date(value);
      const end = new Date(start.getTime() + profile.sessionDurationMinutes * 60 * 1000);
      // Format for datetime-local input
      const pad = (n: number) => String(n).padStart(2, "0");
      const formatted = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
      setEndsAt(formatted);
    }
  };

  const handleCreate = async () => {
    if (!startsAt || !endsAt) return;
    try {
      await createSlot.mutateAsync({
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      setStartsAt("");
      setEndsAt("");
      toast({ title: t("mentor.availability.slotCreated", "Slot created successfully") });
    } catch (error) {
      toast({
        title: t("mentor.availability.slotCreateFailed", "Failed to create slot"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (slotId: string) => {
    try {
      await deleteSlot.mutateAsync(slotId);
      toast({ title: t("mentor.availability.slotDeleted", "Slot deleted") });
    } catch (error) {
      toast({
        title: t("mentor.availability.slotDeleteFailed", "Failed to delete slot"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);
  const futureSlots = useMemo(
    () => slots.filter((s) => new Date(s.endsAt) > new Date()).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [slots],
  );

  if (profileQuery.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-60" /><Skeleton className="h-64 rounded-2xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {t("mentor.availability.title", "Quản lý lịch")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("mentor.availability.subtitle", "Tạo và quản lý các slot mentor của bạn")}
        </p>
      </div>

      {!canManageSlots ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-bold text-amber-800 dark:text-amber-200">
              {t("mentor.availability.notReady", "Profile chưa sẵn sàng")}
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {t("mentor.availability.notReadyHint", "Profile của bạn cần được approve và bật accepting bookings để tạo slot.")}
            </p>
          </div>
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
            <CalendarPlus className="h-5 w-5 text-primary" />
            {t("mentor.availability.createSlot", "Tạo slot mới")}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentor.availability.createSlotHint", "Slot phải cách hiện tại ít nhất 24 giờ. Duration tự khớp với profile ({{minutes}} phút).", { minutes: profile?.sessionDurationMinutes ?? 60 })}
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("mentor.availability.startTime", "Bắt đầu")}
              </label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => handleStartsAtChange(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("mentor.availability.endTime", "Kết thúc")}
              </label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!startsAt || !endsAt || createSlot.isPending}
              className="h-11 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90"
            >
              {createSlot.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
              {t("mentor.availability.addSlot", "Thêm slot")}
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Từ ngày
            <Input
              type="date"
              value={dateRange.fromDate}
              onChange={(event) =>
                setDateRange((current) => ({ ...current, fromDate: event.target.value }))
              }
              className="mt-1 h-11 rounded-xl"
            />
          </label>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Đến ngày
            <Input
              type="date"
              value={dateRange.toDate}
              onChange={(event) =>
                setDateRange((current) => ({ ...current, toDate: event.target.value }))
              }
              className="mt-1 h-11 rounded-xl"
            />
          </label>
        </div>
        {rangeError ? <p className="mt-3 text-sm text-red-600">{rangeError}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t("mentor.availability.upcoming", "Slots sắp tới")}
            {slotsQuery.isLoading ? null : (
              <span className="ml-auto text-sm font-semibold text-slate-400">{futureSlots.length}</span>
            )}
          </h2>
        </div>

        {slotsQuery.isError ? (
          <div className="p-6 text-sm text-red-600">Không thể tải lịch. Vui lòng thử lại.</div>
        ) : slotsQuery.isLoading ? (
          <div className="space-y-3 p-5 sm:p-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : futureSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="mt-4 font-bold text-slate-500 dark:text-slate-400">
              {t("mentor.availability.noSlots", "Chưa có slot nào")}
            </p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              {t("mentor.availability.noSlotsHint", "Tạo slot để học viên có thể đặt lịch.")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {futureSlots.map((slot) => (
              <li key={slot.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Clock3 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-950 dark:text-white">
                    {new Date(slot.startsAt).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(slot.startsAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    {" – "}
                    {new Date(slot.endsAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Badge className={`rounded-full px-2.5 py-1 text-xs font-bold ${SLOT_STATUS_STYLES[slot.status] ?? ""}`}>
                  {slot.status}
                </Badge>
                {slot.status === "OPEN" && new Date(slot.startsAt) > new Date() ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(slot.id)}
                    disabled={deleteSlot.isPending}
                    className="h-9 w-9 shrink-0 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                    title={t("mentor.availability.deleteSlot", "Xóa slot")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
