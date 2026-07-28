import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlarmClock, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  rescheduleLearningRoadmap,
  type ActiveLearningRoadmap,
} from "@/services/learning-roadmaps-v2.service";
import { useRoadmapStore } from "./roadmap-store";
import {
  clampLearningStartDate,
  getLearningProjectionView,
  toStudyDaysPerWeek,
} from "./learning-projection";

interface LearningProjectionCardProps {
  roadmap: ActiveLearningRoadmap;
}

export function LearningProjectionCard({
  roadmap,
}: LearningProjectionCardProps) {
  const { t, i18n } = useTranslation("common");
  const { toast } = useToast();
  const setActiveRoadmap = useRoadmapStore((state) => state.setActiveRoadmap);
  const minimumStartDate = today();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(() =>
    clampLearningStartDate(roadmap.projection.start_date, minimumStartDate),
  );
  const [daysPerWeek, setDaysPerWeek] = useState(() =>
    toStudyDaysPerWeek(roadmap.projection.study_days_per_week),
  );
  const [saving, setSaving] = useState(false);
  const view = getLearningProjectionView(roadmap.projection);

  const save = async () => {
    if (!startDate || startDate < minimumStartDate) return;
    setSaving(true);
    try {
      const updated = await rescheduleLearningRoadmap(roadmap.id, {
        expected_revision: roadmap.revision,
        start_date: startDate,
        study_days_per_week: daysPerWeek,
      });
      setActiveRoadmap(updated);
      setOpen(false);
      toast({ title: t("learning.projection.rescheduleSuccess") });
    } catch (cause) {
      toast({
        title: t("learning.projection.rescheduleError"),
        description:
          cause instanceof Error
            ? cause.message
            : t("learning.projection.retry"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-slate-950">
            {t("learning.projection.title")}
          </h3>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => setOpen(true)}
          >
            {t("learning.projection.reschedule")}
          </button>
        </div>

        <dl className="divide-y divide-slate-100 text-sm">
          <div className="flex justify-between gap-3 py-2">
            <dt className="font-medium text-slate-700">
              {t("learning.projection.daysRemaining")}
            </dt>
            <dd className="text-slate-500">
              {t("learning.projection.days", {
                count: roadmap.projection.days_remaining,
              })}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <dt className="font-medium text-slate-700">
              {t("learning.projection.completedSessions")}
            </dt>
            <dd className="text-slate-500">
              {roadmap.projection.completed_units}/
              {roadmap.projection.total_units}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <dt className="font-medium text-slate-700">
              {t("learning.projection.estimatedCompletion")}
            </dt>
            <dd className="text-right text-slate-500">
              {formatDate(
                roadmap.projection.estimated_completion_date,
                i18n.language,
                t,
              )}
            </dd>
          </div>
        </dl>

        <div className="space-y-2">
          <div
            role="progressbar"
            aria-label={t("learning.projection.progressLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={view.completionPercentage}
            className="h-2.5 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary transition-[width]"
              style={{ width: `${view.completionPercentage}%` }}
            />
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            {paceMessage(
              view.paceTone,
              roadmap.projection.pace_percentage,
              roadmap.projection.missed_units,
              t,
            )}
          </p>
        </div>

        {roadmap.projection.missed_units > 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
            <AlarmClock className="h-4 w-4 shrink-0" />
            {t("learning.projection.missedSessions", {
              count: roadmap.projection.missed_units,
            })}
          </div>
        ) : null}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("learning.projection.dialogTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            {t("learning.projection.dialogBody")}
          </p>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reschedule-start-date">
                {t("learning.projection.startDate")}
              </Label>
              <input
                id="reschedule-start-date"
                type="date"
                min={minimumStartDate}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("learning.projection.daysPerWeek")}</Label>
              <div className="grid grid-cols-7 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDaysPerWeek(toStudyDaysPerWeek(days))}
                    className={`rounded-lg border py-2 text-sm font-semibold ${
                      daysPerWeek === days
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {days}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button
            onClick={() => void save()}
            disabled={saving || !startDate || startDate < minimumStartDate}
            className="w-full"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            <CalendarDays className="mr-2 h-4 w-4" />
            {t("learning.projection.update")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function paceMessage(
  tone: "ahead" | "steady" | "behind",
  percentage: number,
  missedUnits: number,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (tone === "ahead") {
    return translate("learning.projection.paceAhead", {
      percentage: Math.round(percentage),
    });
  }
  if (tone === "steady") {
    return translate("learning.projection.paceSteady", {
      percentage: Math.round(percentage),
    });
  }
  return translate(
    missedUnits > 0
      ? "learning.projection.paceBehindMissed"
      : "learning.projection.paceBehind",
    { percentage: Math.round(percentage) },
  );
}

function formatDate(
  value: string | null,
  locale: string,
  translate: (key: string) => string,
): string {
  if (!value) return translate("learning.projection.calculating");
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function today(): string {
  const value = new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
