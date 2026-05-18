import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Star, Clock, ChevronRight, Lock, CheckCircle2, PlayCircle } from "lucide-react";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import type { LearningSession, WeekPlan } from "./demo-roadmap";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SKILL_COLORS: Record<string, string> = {
  TypeScript:        "bg-primary/10 text-primary border-primary/20",
  React:             "bg-emerald-100 text-emerald-700 border-emerald-200",
  "State Management":"bg-amber-100 text-amber-700 border-amber-200",
  Testing:           "bg-red-100 text-red-700 border-red-200",
  DevOps:            "bg-slate-100 text-slate-700 border-slate-200",
  "System Design":   "bg-slate-100 text-slate-700 border-slate-200",
};

function StarRating({ stars, max }: { stars: number; max: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn("w-3.5 h-3.5", i < stars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")}
        />
      ))}
    </div>
  );
}

function SessionCard({ session }: { session: LearningSession }) {
  const navigate = useNavigate();
  const isLocked = session.status === "locked";
  const isDone   = session.status === "completed";

  const completedSections = session.sections.filter(s => s.completed).length;
  const totalSections     = session.sections.length;

  const skillClass = SKILL_COLORS[session.skill] ?? "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <button
      disabled={isLocked}
      onClick={() => navigate(`/learning/session/${session.id}`)}
      className={cn(
        "w-full text-left group rounded-2xl border-2 p-4 transition-all duration-200",
        isDone   && "border-emerald-200 bg-emerald-50 hover:shadow-md hover:border-emerald-300",
        session.status === "in-progress" && "border-primary/40 bg-primary/5 hover:shadow-md hover:border-primary",
        isLocked && "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
      )}
    >
      {/* Top row: session number + skill tag + status icon */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap",
            isDone ? "bg-emerald-500 text-white" :
            session.status === "in-progress" ? "bg-primary text-white" :
            "bg-slate-300 text-slate-600"
          )}>
            Session {session.sessionNumber}
          </span>
          <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium whitespace-nowrap", skillClass)}>
            {session.skill}
          </span>
        </div>
        {isDone   && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
        {session.status === "in-progress" && <PlayCircle className="w-4 h-4 text-primary flex-shrink-0" />}
        {isLocked && <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </div>

      {/* Title */}
      <p className={cn(
        "font-semibold text-sm leading-snug mb-2",
        isLocked ? "text-slate-400" : "text-slate-800 group-hover:text-slate-900"
      )}>
        {session.title}
      </p>

      {/* Stars + time */}
      <div className="flex items-center justify-between">
        <StarRating stars={session.stars} max={session.maxStars} />
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {session.estimatedMinutes}m
        </span>
      </div>

      {/* Progress */}
      {!isLocked && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{completedSections}/{totalSections} sections</span>
            <ChevronRight className={cn(
              "w-4 h-4 transition-transform",
              !isLocked && "group-hover:translate-x-1"
            )} />
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isDone ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${totalSections > 0 ? (completedSections / totalSections) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

function WeekColumn({ week }: { week: WeekPlan }) {
  // Group sessions by dayOfWeek
  const byDay = new Map<number, LearningSession[]>();
  week.sessions.forEach(s => {
    const existing = byDay.get(s.dayOfWeek) ?? [];
    byDay.set(s.dayOfWeek, [...existing, s]);
  });

  // Collect days that have sessions, sorted
  const activeDays = Array.from(byDay.keys()).sort((a, b) => a - b);

  const completedCount = week.sessions.filter(s => s.status === "completed").length;
  const totalCount     = week.sessions.length;
  const allDone        = completedCount === totalCount;

  return (
    <div>
      {/* Week header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
          allDone ? "bg-emerald-500 text-white" : "bg-primary text-white"
        )}>
          W{week.weekNumber}
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm truncate max-w-[220px]">{week.moduleTitle}</p>
          <p className="text-xs text-slate-500">{completedCount}/{totalCount} sessions completed</p>
        </div>
      </div>

      {/* Sessions by day */}
      <div className="space-y-4">
        {activeDays.map(day => (
          <div key={day}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              {DAY_LABELS[day - 1] ?? `Day ${day}`}
            </p>
            <div className="space-y-2">
              {(byDay.get(day) ?? []).map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeeklyPlan() {
  const [activeWeek, setActiveWeek] = useState(1);
  const weeks = useActiveWeekPlans();
  const currentWeek = weeks.find(w => w.weekNumber === activeWeek) ?? weeks[0];

  return (
    <div className="space-y-6">
      {/* Week tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {weeks.map(w => {
          const done = w.sessions.filter(s => s.status === "completed").length;
          const total = w.sessions.length;
          const isActive = activeWeek === w.weekNumber;
          const isLocked = w.sessions.every(s => s.status === "locked");

          return (
            <button
              key={w.weekNumber}
              onClick={() => setActiveWeek(w.weekNumber)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all",
                isActive
                  ? "border-primary bg-primary text-white shadow-md"
                  : isLocked
                  ? "border-slate-100 bg-slate-50 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary/40"
              )}
            >
              <span>Week {w.weekNumber}</span>
              {!isLocked && (
                <span className={cn(
                  "ml-2 text-xs px-1.5 py-0.5 rounded-full font-normal",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {done}/{total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Week detail card */}
      <Card className="glass border-white/50">
        <CardContent className="p-6">
          <WeekColumn week={currentWeek} />
        </CardContent>
      </Card>
    </div>
  );
}