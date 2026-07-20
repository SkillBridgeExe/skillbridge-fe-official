import { ArrowRight, Calendar, Flame, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useActiveWeekPlans, useRoadmapStore } from "@/components/learning/roadmap-store";

export function LearningSidebar() {
  const { t } = useTranslation("common");
  const weeks = useActiveWeekPlans();
  const composedRoadmap = useRoadmapStore((state) => state.composedRoadmap);
  const roadmapStartedAt = useRoadmapStore((state) => state.roadmapStartedAt);
  const sessions = weeks.flatMap((week) => week.sessions);
  const totalUnits = sessions.length;
  const earnedStars = sessions.reduce((total, session) => total + session.stars, 0);
  const totalStars = sessions.reduce((total, session) => total + session.maxStars, 0);
  const unitsWithTwoPlusStars = sessions.filter((session) => session.stars >= 2).length;
  const unitsBelowTwoStars = Math.max(0, totalUnits - unitsWithTwoPlusStars);
  const studyDayProgress = getStudyDayProgress(weeks, roadmapStartedAt);
  const totalDays = studyDayProgress.totalDays;
  const completedDays = studyDayProgress.completedDays;
  const streakDays = studyDayProgress.streakDays;
  const starQualifiedPct = totalUnits > 0 ? Math.round((unitsWithTwoPlusStars / totalUnits) * 100) : 0;

  return (
    <aside className="w-full space-y-5">
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t("learning.sidebar.progress")}</h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-center">
            <Calendar className="w-4 h-4 text-slate-400 mb-1.5" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              {t("learning.sidebar.studyDays", { defaultValue: "Study Days" })}
            </span>
            <span className="text-xs font-black text-slate-800 mt-1">
              {completedDays}/{totalDays}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50/30 border border-amber-100/50 text-center">
            <Trophy className="w-4 h-4 text-amber-500 mb-1.5" />
            <span className="text-[9px] font-bold text-amber-600/80 uppercase tracking-wider leading-none">
              {t("learning.sidebar.starsEarned")}
            </span>
            <span className="text-xs font-black text-slate-800 mt-1">
              {earnedStars}/{totalStars}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-orange-50/30 border border-orange-100/50 text-center">
            <Flame className="w-4 h-4 text-orange-500 mb-1.5 animate-pulse" />
            <span className="text-[9px] font-bold text-orange-600/80 uppercase tracking-wider leading-none">
              {t("learning.sidebar.currentStreak")}
            </span>
            <span className="text-xs font-black text-orange-700 mt-1">{streakDays}</span>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("learning.sidebar.unitsWithStars")}</p>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden relative w-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-primary to-blue-500 transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: `${starQualifiedPct}%` }}
            >
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-bold text-slate-500">
            <span className="min-w-0 inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
              <span className="truncate">
                {t("learning.sidebar.completedCompact", {
                  done: unitsWithTwoPlusStars,
                  total: totalUnits,
                  defaultValue: "{{done}}/{{total}} done",
                })}
              </span>
            </span>
            <span className="min-w-0 inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_6px_rgba(59,130,246,0.3)]" />
              <span className="truncate">
                {t("learning.sidebar.remainingCompact", {
                  remaining: unitsBelowTwoStars,
                  total: totalUnits,
                  defaultValue: "{{remaining}}/{{total}} left",
                })}
              </span>
            </span>
          </div>
        </div>
      </div>

      {composedRoadmap?.ai_summary && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-primary to-violet-700 p-5 text-white shadow-lg shadow-primary/10 relative overflow-hidden border border-white/10 group">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
          
          <div className="flex items-start gap-3 relative z-10">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-white/10">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-200/80 mb-1">AI Recommendation</h4>
              <p className="text-xs font-bold leading-snug text-white/95">{composedRoadmap.ai_summary}</p>
            </div>
          </div>
          <button className="mt-4 w-full flex items-center justify-center gap-2 bg-white text-primary hover:bg-white/95 active:scale-[0.98] rounded-xl py-2.5 text-xs font-extrabold transition-all duration-300 shadow-md shadow-black/5">
            <TrendingUp className="w-3.5 h-3.5" />
            {t("learning.sidebar.learnNow")}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100/60 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100/60 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-emerald-800 mb-0.5 uppercase tracking-wide">{t("learning.sidebar.tipTitle")}</p>
            <p className="text-[11px] text-emerald-700/80 leading-relaxed font-medium">
              {t("learning.sidebar.tipBody")}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function getStudyDayProgress(
  weeks: ReturnType<typeof useActiveWeekPlans>,
  startedAt?: string | null,
) {
  const groupedDays = getScheduledStudyDays(weeks, startedAt);
  const totalDays = groupedDays.length;
  const completedDays = groupedDays.filter((day) =>
    day.sessions.length > 0 && day.sessions.every((session) => session.status === "completed"),
  ).length;
  const remainingDays = Math.max(0, totalDays - completedDays);
  const streakDays = getCurrentStudyStreak(groupedDays);

  return { totalDays, completedDays, remainingDays, streakDays };
}

function getScheduledStudyDays(
  weeks: ReturnType<typeof useActiveWeekPlans>,
  startedAt?: string | null,
) {
  const started = parseLocalDate(startedAt);
  const dayMap = new Map<string, Array<ReturnType<typeof useActiveWeekPlans>[number]["sessions"][number]>>();

  for (const week of weeks) {
    for (const session of week.sessions) {
      const key = started
        ? scheduledDateKey(started, week.weekNumber, session.dayOfWeek)
        : `w${week.weekNumber}-d${dayOrder(session.dayOfWeek)}`;
      const group = dayMap.get(key) ?? [];
      group.push(session);
      dayMap.set(key, group);
    }
  }

  return [...dayMap.entries()]
    .map(([dateKey, daySessions]) => ({ dateKey, sessions: daySessions }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function getCurrentStudyStreak(
  groupedDays: Array<{
    dateKey: string;
    sessions: Array<ReturnType<typeof useActiveWeekPlans>[number]["sessions"][number]>;
  }>,
) {
  if (groupedDays.length === 0) return 0;
  const hasStudyActivity = (day: (typeof groupedDays)[number]) =>
    day.sessions.some((session) => session.status === "completed");
  let cursorIndex = -1;
  for (let index = groupedDays.length - 1; index >= 0; index -= 1) {
    if (hasStudyActivity(groupedDays[index])) {
      cursorIndex = index;
      break;
    }
  }
  if (cursorIndex < 0) return 0;

  let streak = 0;
  while (cursorIndex >= 0 && hasStudyActivity(groupedDays[cursorIndex])) {
    streak += 1;
    cursorIndex -= 1;
  }
  return streak;
}

function scheduledDateKey(started: Date, weekNumber: number, dayOfWeek: number) {
  const firstStudyDayOrder = dayOrder(started.getDay());
  const scheduledOffset =
    (weekNumber - 1) * 7 +
    Math.max(0, dayOrder(dayOfWeek) - firstStudyDayOrder);
  return toDateKey(addDays(started, scheduledOffset));
}

function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return startOfLocalDay(next);
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayOrder(dayOfWeek: number) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}
