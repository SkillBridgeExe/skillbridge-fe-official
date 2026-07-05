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
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t("learning.sidebar.progress")}</h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-center">
            <Calendar className="w-4 h-4 text-slate-400 mb-1.5" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Days Left</span>
            <span className="text-xs font-black text-slate-800 mt-1">
              {remainingDays}/{totalDays}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50/30 border border-amber-100/50 text-center">
            <Trophy className="w-4 h-4 text-amber-500 mb-1.5" />
            <span className="text-[9px] font-bold text-amber-600/80 uppercase tracking-wider leading-none">Stars</span>
            <span className="text-xs font-black text-slate-800 mt-1">
              {earnedStars}/{totalStars}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-orange-50/30 border border-orange-100/50 text-center">
            <Flame className="w-4 h-4 text-orange-500 mb-1.5 animate-pulse" />
            <span className="text-[9px] font-bold text-orange-600/80 uppercase tracking-wider leading-none">Streak</span>
            <span className="text-xs font-black text-orange-700 mt-1">0</span>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("learning.sidebar.unitsWithStars")}</p>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden relative w-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-primary to-blue-500 transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: `${completionPct}%` }}
            >
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
              {t("learning.sidebar.completed", { done: completedUnits, total: totalUnits })}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_6px_rgba(59,130,246,0.3)]" />
              {t("learning.sidebar.planned", { planned: plannedUnits, total: totalUnits })}
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
