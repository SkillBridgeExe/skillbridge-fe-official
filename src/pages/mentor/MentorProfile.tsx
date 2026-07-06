import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, Clock3, ExternalLink, Globe2, Linkedin, Loader2, Star, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useNavigate } from "react-router-dom";
import { formatVnd } from "@/components/ecosystem/MentorCard";
import Layout from "@/components/layout/Layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMentorProfile, useMentorSlots } from "@/hooks/use-mentors";
import { useCreateBooking } from "@/hooks/use-mentor-bookings";
import { useToast } from "@/hooks/use-toast";
import { getBillingCheckoutPath } from "@/lib/billing-checkout";
import {
  MAX_MENTOR_RANGE_DAYS,
  defaultMentorDateRange,
  getMentorDateRangeErrorCode,
  mentorDateRangeToIso,
} from "@/lib/mentor-date-range";

export default function MentorProfile() {
  const { mentorSlug } = useParams<{ mentorSlug: string }>();
  const { t } = useTranslation("common");
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const profileQuery = useMentorProfile(mentorSlug);
  const createBookingMutation = useCreateBooking();
  
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [studentGoal, setStudentGoal] = useState("");
  const [dateRange, setDateRange] = useState(defaultMentorDateRange);
  const rangeErrorCode = getMentorDateRangeErrorCode(dateRange.fromDate, dateRange.toDate);
  const rangeError = rangeErrorCode
    ? t(`mentor.dateRange.${rangeErrorCode}`, { max: MAX_MENTOR_RANGE_DAYS })
    : null;
  const slotQueryRange = useMemo(
    () =>
      rangeErrorCode
        ? { from: new Date().toISOString(), to: new Date().toISOString() }
        : mentorDateRangeToIso(dateRange.fromDate, dateRange.toDate),
    [dateRange.fromDate, dateRange.toDate, rangeErrorCode],
  );
  const slotsQuery = useMentorSlots(mentorSlug, slotQueryRange, !rangeErrorCode);
  const openSlots = useMemo(
    () => (slotsQuery.data ?? []).filter((slot) => slot.status === "OPEN"),
    [slotsQuery.data],
  );
  const selectedSlot = useMemo(
    () => openSlots.find((slot) => slot.id === selectedSlotId) ?? null,
    [openSlots, selectedSlotId],
  );
  const groupedSlots = useMemo(() => {
    return openSlots.reduce<Array<{ dateKey: string; label: string; slots: typeof openSlots }>>(
      (groups, slot) => {
        const date = new Date(slot.startsAt);
        const dateKey = date.toISOString().slice(0, 10);
        const current = groups.find((group) => group.dateKey === dateKey);
        if (current) {
          current.slots.push(slot);
          return groups;
        }
        groups.push({
          dateKey,
          label: date.toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
          }),
          slots: [slot],
        });
        return groups;
      },
      [],
    );
  }, [openSlots]);
  const trimmedGoal = studentGoal.trim();
  const goalError =
    trimmedGoal.length > 0 && trimmedGoal.length < 20
      ? t("mentor.profile.goalTooShort", "Mục tiêu cần ít nhất 20 ký tự.")
      : null;
  const canBook =
    Boolean(selectedSlot) && trimmedGoal.length >= 20 && !createBookingMutation.isPending;
  
  const handleBookSession = async () => {
    if (!selectedSlot || !mentorSlug || trimmedGoal.length < 20) return;
    try {
      const result = await createBookingMutation.mutateAsync({
        mentorProfileId: mentor.id,
        slotId: selectedSlot.id,
        studentGoal: trimmedGoal,
      });

      const checkoutPath = getBillingCheckoutPath(result.checkout);
      if (checkoutPath) {
        navigate(checkoutPath);
        return;
      }

      toast({
        title: t("common.error", "Error"),
        description: t("mentor.profile.checkoutUnavailable", "Booking was created, but checkout is not available yet."),
        variant: "destructive",
      });
      navigate("/billing/mentor");
    } catch (error) {
      toast({
        title: t("common.error", "Error"),
        description: error instanceof Error ? error.message : "Failed to book session",
        variant: "destructive",
      });
      // Refetch slots in case the selected slot was already held/booked
      setSelectedSlotId(null);
      void slotsQuery.refetch();
    }
  };

  if (profileQuery.isLoading) return <ProfileSkeleton />;

  if (!profileQuery.data || profileQuery.isError) {
    return (
      <Layout>
        <main className="flex min-h-[70dvh] items-center justify-center bg-background px-4">
          <div className="max-w-lg text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UsersRound className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{t("mentor.profile.notFoundTitle")}</h1>
            <p className="mt-3 text-slate-500 dark:text-slate-400">{t("mentor.profile.notFoundBody")}</p>
            <Button asChild className="mt-7 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90">
              <Link to="/ecosystem"><ArrowLeft className="mr-2 h-4 w-4" />{t("mentor.profile.back")}</Link>
            </Button>
          </div>
        </main>
      </Layout>
    );
  }

  const mentor = profileQuery.data;

  return (
    <Layout>
      <main className="min-h-dvh bg-background pb-20">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <Link to="/ecosystem" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            {t("mentor.profile.back")}
          </Link>

          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
          >
            <div className="relative h-32 overflow-hidden bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 sm:h-40">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                  backgroundSize: "52px 52px",
                }}
              />
              <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full bg-sky-200/30 blur-[80px]" />
            </div>
            <div className="px-5 pb-7 sm:px-8 lg:px-10">
              <div className="-mt-14 flex flex-col gap-6 sm:-mt-16 sm:flex-row sm:items-end">
                <Avatar className="h-28 w-28 rounded-2xl border-4 border-white bg-white shadow-xl dark:border-slate-950 dark:bg-slate-950 sm:h-32 sm:w-32">
                  <AvatarImage src={mentor.avatarUrl ?? undefined} className="object-cover" alt={mentor.displayName} />
                  <AvatarFallback className="rounded-xl bg-primary text-2xl font-black text-primary-foreground">{initials(mentor.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-black tracking-[-0.035em] text-slate-950 dark:text-white sm:text-4xl">{mentor.displayName}</h1>
                    {mentor.verified ? <BadgeCheck className="h-6 w-6 text-primary" /> : null}
                  </div>
                  <p className="mt-2 text-base font-semibold text-slate-600 dark:text-slate-300">{mentor.headline}</p>
                  {mentor.company ? <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><BriefcaseBusiness className="h-4 w-4" />{mentor.company}</p> : null}
                </div>
                <Badge className={mentor.isAcceptingBookings ? "rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200" : "rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}>
                  {mentor.isAcceptingBookings ? t("mentor.profile.accepting") : t("mentor.profile.unavailable")}
                </Badge>
              </div>

              <div className="mt-8 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3 dark:border-slate-800">
                <Stat icon={<Star className="fill-amber-400 text-amber-400" />} value={mentor.ratingAverage?.toFixed(1) ?? "-"} label={t("mentor.marketplace.averageRating")} />
                <Stat icon={<UsersRound className="text-primary" />} value={mentor.completedSessions.toLocaleString()} label={t("mentor.marketplace.sessionsCompleted")} />
                <Stat icon={<Clock3 className="text-primary" />} value={t("mentor.card.perSession", { minutes: mentor.sessionDurationMinutes })} label={t("mentor.profile.duration")} />
              </div>
            </div>
          </motion.section>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <Section title={t("mentor.profile.about")}>
                <p className="whitespace-pre-line text-[15px] leading-7 text-slate-600 dark:text-slate-300">{mentor.bio || mentor.shortBio}</p>
              </Section>
              <Section title={t("mentor.profile.expertise")}>
                <div className="flex flex-wrap gap-2">
                  {mentor.skills.map((skill) => <Badge key={skill.id} variant="secondary" className="rounded-full bg-primary/10 px-3 py-1.5 font-semibold text-primary">{skill.displayName}</Badge>)}
                </div>
              </Section>
              <Section title={t("mentor.profile.domains")}>
                <div className="flex flex-wrap gap-3">
                  {mentor.domains.map((domain) => <span key={domain} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"><Globe2 className="h-4 w-4 text-primary" />{domain}</span>)}
                </div>
              </Section>
            </div>

            <aside className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none lg:sticky lg:top-24">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">{t("mentor.profile.sessionDetails")}</h2>
                <div className="mt-6 space-y-5">
                  {mentor.linkedinUrl ? (
                    <a
                      href={mentor.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 font-bold text-primary transition-colors hover:bg-primary/10"
                    >
                      <span className="inline-flex items-center gap-2"><Linkedin className="h-4 w-4" />{t("mentor.profile.linkedin")}</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t("mentor.profile.sessionPrice")}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{formatVnd(mentor.sessionPriceVnd)}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t("mentor.profile.duration")}</p>
                    <p className="mt-1 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><Clock3 className="h-4 w-4 text-primary" />{t("mentor.card.perSession", { minutes: mentor.sessionDurationMinutes })}</p>
                  </div>
                </div>
              </div>

              {/* Slot Picker */}
              <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("mentor.profile.availableSlots", "Lịch trống")}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={dateRange.fromDate}
                    onChange={(event) => {
                      setSelectedSlotId(null);
                      setDateRange((current) => ({ ...current, fromDate: event.target.value }));
                    }}
                    className="h-10 rounded-xl text-xs"
                    aria-label={t("mentor.profile.fromDate")}
                  />
                  <Input
                    type="date"
                    value={dateRange.toDate}
                    onChange={(event) => {
                      setSelectedSlotId(null);
                      setDateRange((current) => ({ ...current, toDate: event.target.value }));
                    }}
                    className="h-10 rounded-xl text-xs"
                    aria-label={t("mentor.profile.toDate")}
                  />
                </div>
                  {rangeError ? <p className="mt-2 text-xs text-red-600">{rangeError}</p> : null}
                <div className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                  {slotsQuery.isError ? (
                    <p className="text-sm text-red-600">{t("mentor.profile.loadSlotsFailed")}</p>
                  ) : slotsQuery.isLoading ? (
                    <Skeleton className="h-12 w-full rounded-xl" />
                  ) : groupedSlots.length ? (
                    groupedSlots.map((group) => (
                      <div key={group.dateKey} className="space-y-2">
                        <p className="px-1 text-xs font-black uppercase text-slate-400">
                          {group.label}
                        </p>
                        {group.slots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${selectedSlotId === slot.id ? "border-primary bg-primary/10" : "border-slate-200 hover:border-primary/50 dark:border-slate-800"}`}
                          >
                            <div>
                              <p className={`font-bold ${selectedSlotId === slot.id ? "text-primary" : "text-slate-950 dark:text-white"}`}>
                                {new Date(slot.startsAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(slot.endsAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            {selectedSlotId === slot.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                          </button>
                        ))}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">{t("mentor.profile.noSlots", "Hiện chưa có lịch trống.")}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t("mentor.profile.studentGoal", "Mục tiêu buổi mentoring")}
                  </label>
                  <Textarea
                    value={studentGoal}
                    onChange={(event) => setStudentGoal(event.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder={t("mentor.profile.studentGoalPlaceholder", "Ví dụ: Em muốn review kiến trúc backend và nhận góp ý về database schema trước khi demo.")}
                    className="mt-2 rounded-xl"
                  />
                  <div className="mt-1 flex justify-between gap-3 text-xs">
                    <span className={goalError ? "text-red-600" : "text-slate-400"}>
                      {goalError ?? t("mentor.profile.studentGoalHint", "Tối thiểu 20 ký tự để mentor chuẩn bị tốt hơn.")}
                    </span>
                    <span className="text-slate-400">{trimmedGoal.length}/1000</span>
                  </div>
                </div>

                {selectedSlot ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {t("mentor.profile.selectedSlot", "Slot đã chọn")}
                    </p>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      {new Date(selectedSlot.startsAt).toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                      {" • "}
                      {new Date(selectedSlot.startsAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {new Date(selectedSlot.endsAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500">
                      <div className="flex justify-between">
                        <span>{t("mentor.profile.payInFull", "Thanh toán 100% để xác nhận lịch")}</span>
                        <span>{formatVnd(mentor.sessionPriceVnd)}</span>
                      </div>
                      <p>{t("mentor.profile.paymentConfirmsBooking", "Slot is held for 15 minutes and confirmed after payment.")}</p>
                    </div>
                  </div>
                ) : null}

                  <Button
                    onClick={handleBookSession}
                    disabled={!canBook}
                    className="w-full rounded-xl bg-primary py-6 text-base font-black text-primary-foreground hover:bg-primary/90"
                  >
                    {createBookingMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {t("mentor.profile.bookNow", "Đặt lịch và thanh toán")}
                  </Button>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 sm:p-8"><h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h2><div className="mt-5">{children}</div></section>;
}

function Stat({ icon, value, label }: { icon: React.ReactElement<{ className?: string }>; value: string; label: string }) {
  return <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900">{icon}</div><div><p className="font-black text-slate-950 dark:text-white">{value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p></div></div>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]?.toUpperCase()).join("");
}

function ProfileSkeleton() {
  return <Layout><main className="min-h-dvh bg-background p-6"><div className="mx-auto max-w-6xl"><Skeleton className="h-5 w-40" /><Skeleton className="mt-8 h-[430px] rounded-2xl" /><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div></div></main></Layout>;
}
