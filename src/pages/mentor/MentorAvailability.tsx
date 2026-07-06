import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Ban,
  CalendarDays,
  CalendarPlus,
  Clock3,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useBlockMentorSlot,
  useCreateMentorSlot,
  useDeleteMentorSlot,
  useMyMentorAvailabilityTemplate,
  useMyMentorProfile,
  useMyMentorSlots,
  useSaveMentorAvailabilityTemplate,
  useUnblockMentorSlot,
} from "@/hooks/use-mentors";
import { useToast } from "@/hooks/use-toast";
import type {
  MentorAvailabilityWindow,
  MentorSlotDto,
  SaveMentorAvailabilityTemplateRequest,
} from "@/services/mentor.service";
import {
  MAX_MENTOR_RANGE_DAYS,
  defaultMentorDateRange,
  getMentorDateRangeErrorCode,
  mentorDateRangeToIso,
} from "@/lib/mentor-date-range";
import {
  DEFAULT_MENTOR_TEMPLATE_TIMEZONE,
  MENTOR_BUFFER_OPTIONS,
  createEmptyWeeklyAvailability,
  minuteToTimeInput,
  normalizeWeeklyAvailability,
  timeInputToMinute,
  validateWeeklyAvailability,
} from "@/lib/mentor-weekly-availability";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const DEFAULT_WINDOW = { startMinute: 19 * 60, endMinute: 22 * 60 };

const SLOT_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  HELD: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  BOOKED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  BLOCKED: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
};

const SLOT_SOURCE_STYLES: Record<string, string> = {
  MANUAL: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  TEMPLATE: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
};

export default function MentorAvailability() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const profileQuery = useMyMentorProfile();
  const profile = profileQuery.data;
  const canManageSlots = profile?.status === "APPROVED" && profile.isAcceptingBookings;

  const templateQuery = useMyMentorAvailabilityTemplate(Boolean(canManageSlots));
  const saveTemplate = useSaveMentorAvailabilityTemplate();
  const createSlot = useCreateMentorSlot();
  const deleteSlot = useDeleteMentorSlot();
  const blockSlot = useBlockMentorSlot();
  const unblockSlot = useUnblockMentorSlot();

  const [templateForm, setTemplateForm] = useState<SaveMentorAvailabilityTemplateRequest>(
    createEmptyWeeklyAvailability(),
  );
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [dateRange, setDateRange] = useState(defaultMentorDateRange);

  useEffect(() => {
    if (templateQuery.data) {
      setTemplateForm({
        timezone: templateQuery.data.timezone,
        bufferMinutes: templateQuery.data.bufferMinutes,
        windows: templateQuery.data.windows,
      });
    }
  }, [templateQuery.data]);

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
  const slotsQuery = useMyMentorSlots(slotQueryRange, !rangeErrorCode);
  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);
  const futureSlots = useMemo(
    () =>
      slots
        .filter((slot) => new Date(slot.endsAt) > new Date())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [slots],
  );

  const validationCodes = validateWeeklyAvailability(
    templateForm.windows,
    profile?.sessionDurationMinutes ?? 60,
  );

  const handleStartsAtChange = (value: string) => {
    setStartsAt(value);
    if (!profile?.sessionDurationMinutes || !value) return;
    setEndsAt(toLocalDateTimeInput(new Date(new Date(value).getTime() + profile.sessionDurationMinutes * 60000)));
  };

  const handleSaveTemplate = async () => {
    if (validationCodes.length > 0) {
      toast({
        title: t("mentor.availability.templateInvalid"),
        description: validationCodes.map((code) => t(`mentor.availability.validation.${code}`)).join(" "),
        variant: "destructive",
      });
      return;
    }
    try {
      await saveTemplate.mutateAsync(normalizeWeeklyAvailability(templateForm));
      toast({ title: t("mentor.availability.templateSaved") });
    } catch (error) {
      toast({
        title: t("mentor.availability.templateSaveFailed"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
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
      toast({ title: t("mentor.availability.slotCreated") });
    } catch (error) {
      toast({
        title: t("mentor.availability.slotCreateFailed"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleSlotAction = async (slot: MentorSlotDto) => {
    try {
      if ((slot.source ?? "MANUAL") === "TEMPLATE" && slot.status === "OPEN") {
        await blockSlot.mutateAsync(slot.id);
        toast({ title: t("mentor.availability.slotBlocked") });
        return;
      }
      if ((slot.source ?? "MANUAL") === "TEMPLATE" && slot.status === "BLOCKED") {
        await unblockSlot.mutateAsync(slot.id);
        toast({ title: t("mentor.availability.slotRestored") });
        return;
      }
      await deleteSlot.mutateAsync(slot.id);
      toast({ title: t("mentor.availability.slotDeleted") });
    } catch (error) {
      toast({
        title: t("mentor.availability.slotActionFailed"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {t("mentor.availability.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("mentor.availability.subtitle")}
        </p>
      </div>

      {!canManageSlots ? (
        <NotReadyNotice />
      ) : (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {t("mentor.availability.weeklyTitle")}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("mentor.availability.weeklyHint", {
                    minutes: profile?.sessionDurationMinutes ?? 60,
                  })}
                </p>
              </div>
              <div className="w-full sm:w-44">
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("mentor.availability.buffer")}
                </label>
                <Select
                  value={String(templateForm.bufferMinutes ?? 0)}
                  onValueChange={(value) =>
                    setTemplateForm((current) => ({ ...current, bufferMinutes: Number(value) }))
                  }
                >
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MENTOR_BUFFER_OPTIONS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {t("mentor.availability.bufferOption", { minutes })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {templateQuery.isLoading ? (
              <div className="mt-5 space-y-3">
                {DAYS.slice(0, 4).map((day) => (
                  <Skeleton key={day} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {DAYS.map((day) => (
                  <WeeklyDayEditor
                    key={day}
                    day={day}
                    windows={templateForm.windows.filter((window) => window.dayOfWeek === day)}
                    onToggle={(active) => setTemplateForm((current) => toggleDay(current, day, active))}
                    onAddWindow={() => setTemplateForm((current) => addWindow(current, day))}
                    onRemoveWindow={(index) =>
                      setTemplateForm((current) => removeWindow(current, day, index))
                    }
                    onWindowChange={(index, patch) =>
                      setTemplateForm((current) => updateWindow(current, day, index, patch))
                    }
                  />
                ))}
              </div>
            )}

            {validationCodes.length > 0 ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                {validationCodes.map((code) => t(`mentor.availability.validation.${code}`)).join(" ")}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("mentor.availability.timezone", {
                  timezone: templateForm.timezone ?? DEFAULT_MENTOR_TEMPLATE_TIMEZONE,
                })}
              </p>
              <Button
                onClick={handleSaveTemplate}
                disabled={saveTemplate.isPending || templateQuery.isLoading}
                className="h-10 rounded-lg bg-primary font-bold text-primary-foreground hover:bg-primary/90"
              >
                {saveTemplate.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {t("mentor.availability.saveTemplate")}
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
              <CalendarPlus className="h-5 w-5 text-primary" />
              {t("mentor.availability.oneOffTitle")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("mentor.availability.createSlotHint", {
                minutes: profile?.sessionDurationMinutes ?? 60,
              })}
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <DateTimeField
                label={t("mentor.availability.startTime")}
                value={startsAt}
                onChange={handleStartsAtChange}
              />
              <DateTimeField
                label={t("mentor.availability.endTime")}
                value={endsAt}
                onChange={setEndsAt}
              />
              <Button
                onClick={handleCreate}
                disabled={!startsAt || !endsAt || createSlot.isPending}
                className="h-11 rounded-lg bg-primary font-bold text-primary-foreground hover:bg-primary/90"
              >
                {createSlot.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarPlus className="mr-2 h-4 w-4" />
                )}
                {t("mentor.availability.addSlot")}
              </Button>
            </div>
          </section>
        </>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField
            label={t("mentor.dateRange.from")}
            value={dateRange.fromDate}
            onChange={(value) => setDateRange((current) => ({ ...current, fromDate: value }))}
          />
          <DateField
            label={t("mentor.dateRange.to")}
            value={dateRange.toDate}
            onChange={(value) => setDateRange((current) => ({ ...current, toDate: value }))}
          />
        </div>
        {rangeError ? <p className="mt-3 text-sm text-red-600">{rangeError}</p> : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t("mentor.availability.upcoming")}
            {slotsQuery.isLoading ? null : (
              <span className="ml-auto text-sm font-semibold text-slate-400">
                {futureSlots.length}
              </span>
            )}
          </h2>
        </div>
        <SlotList
          slots={futureSlots}
          isLoading={slotsQuery.isLoading}
          isError={slotsQuery.isError}
          isActionPending={deleteSlot.isPending || blockSlot.isPending || unblockSlot.isPending}
          onAction={handleSlotAction}
        />
      </section>
    </div>
  );
}

function NotReadyNotice() {
  const { t } = useTranslation("common");
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-bold text-amber-800 dark:text-amber-200">
          {t("mentor.availability.notReady")}
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
          {t("mentor.availability.notReadyHint")}
        </p>
      </div>
    </div>
  );
}

function WeeklyDayEditor({
  day,
  windows,
  onToggle,
  onAddWindow,
  onRemoveWindow,
  onWindowChange,
}: {
  day: number;
  windows: MentorAvailabilityWindow[];
  onToggle: (active: boolean) => void;
  onAddWindow: () => void;
  onRemoveWindow: (index: number) => void;
  onWindowChange: (index: number, patch: Partial<MentorAvailabilityWindow>) => void;
}) {
  const { t } = useTranslation("common");
  const active = windows.some((window) => window.isActive !== false);
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Switch checked={active} onCheckedChange={onToggle} />
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t(`mentor.availability.days.${day}`)}
          </p>
        </div>
        {active ? (
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={onAddWindow}>
            <Plus className="mr-2 h-4 w-4" />
            {t("mentor.availability.addWindow")}
          </Button>
        ) : null}
      </div>
      {active ? (
        <div className="mt-3 space-y-2">
          {windows.map((window, index) => (
            <div key={`${day}-${index}`} className="flex flex-wrap items-center gap-2">
              <Input
                type="time"
                value={minuteToTimeInput(window.startMinute)}
                onChange={(event) =>
                  onWindowChange(index, { startMinute: timeInputToMinute(event.target.value) })
                }
                className="h-10 w-32 rounded-lg"
              />
              <span className="text-sm text-slate-400">-</span>
              <Input
                type="time"
                value={minuteToTimeInput(window.endMinute)}
                onChange={(event) =>
                  onWindowChange(index, { endMinute: timeInputToMinute(event.target.value) })
                }
                className="h-10 w-32 rounded-lg"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg text-slate-500"
                onClick={() => onRemoveWindow(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SlotList({
  slots,
  isLoading,
  isError,
  isActionPending,
  onAction,
}: {
  slots: MentorSlotDto[];
  isLoading: boolean;
  isError: boolean;
  isActionPending: boolean;
  onAction: (slot: MentorSlotDto) => void;
}) {
  const { t } = useTranslation("common");
  if (isError) return <div className="p-6 text-sm text-red-600">{t("mentor.availability.loadSlotsFailed")}</div>;
  if (isLoading) {
    return (
      <div className="space-y-3 p-5 sm:p-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }
  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarDays className="h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="mt-4 font-bold text-slate-500 dark:text-slate-400">
          {t("mentor.availability.noSlots")}
        </p>
        <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
          {t("mentor.availability.noSlotsHint")}
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {slots.map((slot) => (
        <li key={slot.id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Clock3 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-[180px] flex-1">
            <p className="font-bold text-slate-950 dark:text-white">
              {new Date(slot.startsAt).toLocaleDateString("vi-VN", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {new Date(slot.startsAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" - "}
              {new Date(slot.endsAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Badge className={`rounded-full px-2.5 py-1 text-xs font-bold ${SLOT_SOURCE_STYLES[slot.source ?? "MANUAL"] ?? ""}`}>
            {t(`mentor.availability.source.${slot.source ?? "MANUAL"}`)}
          </Badge>
          <Badge className={`rounded-full px-2.5 py-1 text-xs font-bold ${SLOT_STATUS_STYLES[slot.status] ?? ""}`}>
            {t(`mentor.availability.status.${slot.status}`)}
          </Badge>
          <SlotAction slot={slot} disabled={isActionPending} onAction={onAction} />
        </li>
      ))}
    </ul>
  );
}

function SlotAction({
  slot,
  disabled,
  onAction,
}: {
  slot: MentorSlotDto;
  disabled: boolean;
  onAction: (slot: MentorSlotDto) => void;
}) {
  const { t } = useTranslation("common");
  const isFuture = new Date(slot.startsAt) > new Date();
  const source = slot.source ?? "MANUAL";
  if (!isFuture) return null;
  if (source === "MANUAL" && slot.status === "OPEN") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAction(slot)}
        disabled={disabled}
        className="h-9 w-9 shrink-0 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        title={t("mentor.availability.deleteSlot")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }
  if (source === "TEMPLATE" && slot.status === "OPEN") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAction(slot)}
        disabled={disabled}
        className="rounded-lg"
      >
        <Ban className="mr-2 h-4 w-4" />
        {t("mentor.availability.blockSlot")}
      </Button>
    );
  }
  if (source === "TEMPLATE" && slot.status === "BLOCKED") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAction(slot)}
        disabled={disabled}
        className="rounded-lg"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        {t("mentor.availability.restoreSlot")}
      </Button>
    );
  }
  return null;
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-[200px] flex-1">
      <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
        {label}
      </label>
      <Input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg"
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
      {label}
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 rounded-lg"
      />
    </label>
  );
}

function toggleDay(
  template: SaveMentorAvailabilityTemplateRequest,
  day: number,
  active: boolean,
): SaveMentorAvailabilityTemplateRequest {
  const windows = template.windows.filter((window) => window.dayOfWeek !== day);
  return {
    ...template,
    windows: active
      ? [
          ...windows,
          {
            dayOfWeek: day,
            startMinute: DEFAULT_WINDOW.startMinute,
            endMinute: DEFAULT_WINDOW.endMinute,
            isActive: true,
          },
        ]
      : windows,
  };
}

function addWindow(
  template: SaveMentorAvailabilityTemplateRequest,
  day: number,
): SaveMentorAvailabilityTemplateRequest {
  return {
    ...template,
    windows: [
      ...template.windows,
      {
        dayOfWeek: day,
        startMinute: DEFAULT_WINDOW.startMinute,
        endMinute: DEFAULT_WINDOW.endMinute,
        isActive: true,
      },
    ],
  };
}

function removeWindow(
  template: SaveMentorAvailabilityTemplateRequest,
  day: number,
  index: number,
): SaveMentorAvailabilityTemplateRequest {
  let seen = -1;
  return {
    ...template,
    windows: template.windows.filter((window) => {
      if (window.dayOfWeek !== day) return true;
      seen += 1;
      return seen !== index;
    }),
  };
}

function updateWindow(
  template: SaveMentorAvailabilityTemplateRequest,
  day: number,
  index: number,
  patch: Partial<MentorAvailabilityWindow>,
): SaveMentorAvailabilityTemplateRequest {
  let seen = -1;
  return {
    ...template,
    windows: template.windows.map((window) => {
      if (window.dayOfWeek !== day) return window;
      seen += 1;
      return seen === index ? { ...window, ...patch } : window;
    }),
  };
}

function toLocalDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
