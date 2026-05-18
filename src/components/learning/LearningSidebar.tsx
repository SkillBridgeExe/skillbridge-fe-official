import {
  Trophy,
  Calendar,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Flame,
} from "lucide-react";
import {
  MOCK_LEARNING_PROGRESS,
  MOCK_LEARNING_NUDGES,
} from "@/lib/mock-data/learning";

export function LearningSidebar() {
  const p = MOCK_LEARNING_PROGRESS;
  const nudge = MOCK_LEARNING_NUDGES[0]; // Show latest nudge

  const completionPct = p.totalUnits > 0 ? Math.round((p.completedUnits / p.totalUnits) * 100) : 0;

  return (
    <aside className="w-full space-y-5">
      {/* ─── Learning Progress ─── */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Learning Progress</h3>
          <button className="text-xs text-primary font-semibold hover:underline">
            Reschedule
          </button>
        </div>

        {/* Stat rows */}
        <div className="space-y-3">
          {/* Days remaining */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Days remaining
            </span>
            <span className="text-sm font-bold text-slate-900">
              {p.remainingDays}/{p.totalDays} days
            </span>
          </div>

          {/* Stars earned */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Stars earned
            </span>
            <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-amber-500">⭐</span> {p.earnedStars}/{p.totalStars}
            </span>
          </div>

          {/* Current streak */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Current streak
            </span>
            <span className="text-sm font-bold text-orange-600">
              🔥 {p.currentStreak} days
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-slate-100" />

        {/* Units progress */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Units with 2+ stars</p>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Completed: {p.completedUnits}/{p.totalUnits} Total Units
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Planned: {p.plannedUnits}/{p.totalUnits} Total Units
            </span>
          </div>
        </div>

        {/* On-track warning */}
        {!p.isOnTrack && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
            You are falling behind the schedule. Try to catch up to reach your goal on time!
          </p>
        )}
      </div>

      {/* ─── AI Nudge Card ─── */}
      {nudge && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-primary to-violet-600 p-5 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-snug mb-1">{nudge.text}</p>
            </div>
          </div>
          <button className="mt-3 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-2.5 text-sm font-bold transition-colors">
            <TrendingUp className="w-4 h-4" />
            Learn now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Quick Tips ─── */}
      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-base">🧠</span>
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 mb-0.5">Learning Tip</p>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Reviewing yesterday's lesson before starting a new one helps with long-term retention!
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
