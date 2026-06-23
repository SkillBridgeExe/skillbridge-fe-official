import { ArrowRight, Calendar, Flame, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useActiveWeekPlans, useRoadmapStore } from "@/components/learning/roadmap-store";

export function LearningSidebar() {
  const { t } = useTranslation("common");
  const weeks = useActiveWeekPlans();
  const composedRoadmap = useRoadmapStore((state) => state.composedRoadmap);
  const sessions = weeks.flatMap((week) => week.sessions);
  const completedUnits = sessions.filter((session) => session.status === "completed").length;
  const plannedUnits = sessions.filter((session) => session.status !== "completed").length;
  const totalUnits = sessions.length;
  const earnedStars = sessions.reduce((total, session) => total + session.stars, 0);
  const totalStars = sessions.reduce((total, session) => total + session.maxStars, 0);
  const totalDays = composedRoadmap ? Math.max(1, composedRoadmap.steps.length * 7) : 0;
  const remainingDays = totalDays;
  const completionPct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  return (
    <aside className="w-full space-y-5">
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{t("learning.sidebar.progress")}</h3>
          <button className="text-xs text-primary font-semibold hover:underline">
            {t("learning.sidebar.reschedule")}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              {t("learning.sidebar.daysRemaining")}
            </span>
            <span className="text-sm font-bold text-slate-900">
              {remainingDays}/{totalDays} {t("learning.sidebar.days")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              {t("learning.sidebar.starsEarned")}
            </span>
            <span className="text-sm font-bold text-slate-900">
              {earnedStars}/{totalStars}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              {t("learning.sidebar.currentStreak")}
            </span>
            <span className="text-sm font-bold text-orange-600">0 {t("learning.sidebar.days")}</span>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">{t("learning.sidebar.unitsWithStars")}</p>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t("learning.sidebar.completed", { done: completedUnits, total: totalUnits })}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {t("learning.sidebar.planned", { planned: plannedUnits, total: totalUnits })}
            </span>
          </div>
        </div>
      </div>

      {composedRoadmap?.ai_summary && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-primary to-violet-600 p-5 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-snug mb-1">{composedRoadmap.ai_summary}</p>
            </div>
          </div>
          <button className="mt-3 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-2.5 text-sm font-bold transition-colors">
            <TrendingUp className="w-4 h-4" />
            {t("learning.sidebar.learnNow")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 mb-0.5">{t("learning.sidebar.tipTitle")}</p>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              {t("learning.sidebar.tipBody")}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
