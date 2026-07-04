import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@posthog/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Lock,
  Star,
  Clock,
} from "lucide-react";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { DEFAULT_SKILL_COLOR, SKILL_COLORS } from "@/components/learning/skill-colors";

const statusConfig = {
  completed: { labelKey: "learning.status.completed", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  "in-progress": { labelKey: "learning.status.inProgress", color: "bg-primary/10 text-primary border-primary/20" },
  locked: { labelKey: "learning.status.locked", color: "bg-slate-50 text-slate-400 border-slate-200" },
} as const;

export function GridRoadmapView() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const posthog = usePostHog();
  const weeks = useActiveWeekPlans();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-500">
      {/* Grouped by week — Kanban Column Grid style */}
      {weeks.map((week) => {
        const allCompleted = week.sessions.length > 0 && week.sessions.every(s => s.status === "completed");
        const allLocked = week.sessions.length > 0 && week.sessions.every(s => s.status === "locked");
        const weekStatus = allCompleted ? "completed" : allLocked ? "locked" : "in-progress";

        return (
          <div 
            key={week.weekNumber} 
            className={cn(
              "flex flex-col gap-4 p-4 rounded-2xl border transition-all duration-300",
              weekStatus === "completed" && "bg-emerald-50/[0.08] border-emerald-100 shadow-sm",
              weekStatus === "in-progress" && "bg-slate-50/40 border-slate-200/80 shadow-sm ring-1 ring-primary/5",
              weekStatus === "locked" && "bg-slate-50/[0.05] border-slate-100 opacity-80"
            )}
          >
            {/* Week Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-sm transition-all duration-300 flex-shrink-0",
                  weekStatus === "completed" && "bg-emerald-500 text-white shadow-emerald-500/20",
                  weekStatus === "in-progress" && "bg-primary text-white shadow-primary/30 ring-4 ring-primary/10",
                  weekStatus === "locked" && "bg-slate-200 text-slate-400 border border-slate-300/10"
                )}>
                  {weekStatus === "completed" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    week.weekNumber
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                    {week.moduleTitle}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                    {t("learning.common.week", { number: week.weekNumber })}
                  </p>
                </div>
              </div>
              
              {/* Completion indicators */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {week.sessions.map(s => (
                  <span
                    key={s.id}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                      s.status === "completed" && "bg-emerald-500",
                      s.status === "in-progress" && "bg-primary animate-pulse",
                      s.status === "locked" && "bg-slate-200"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Session cards stack */}
            <div className="space-y-3.5">
              {week.sessions.map(session => {
                const colors = SKILL_COLORS[session.skill] || DEFAULT_SKILL_COLOR;
                const isLocked = session.status === "locked";
                const isActive = session.status === "in-progress";
                const config = statusConfig[session.status];
                const completedSections = session.sections.filter(s => s.completed).length;
                const progress = session.sections.length > 0 ? (completedSections / session.sections.length) * 100 : 0;

                return (
                  <Card
                    key={session.id}
                    onClick={() => {
                      if (isLocked) return;
                      posthog?.capture("learning_session_started", { session_id: session.id, skill: session.skill, status: session.status });
                      navigate(`/learning/session/${session.id}`);
                    }}
                    className={cn(
                      "border transition-all cursor-pointer group rounded-2xl overflow-hidden w-full shadow-sm",
                      isLocked && "opacity-60 cursor-not-allowed border-slate-100 bg-slate-50/50 shadow-none",
                      !isLocked && "hover:shadow-md hover:-translate-y-0.5 border-slate-200 bg-white",
                      isActive && "ring-2 ring-primary/10 border-primary/40 bg-gradient-to-br from-white to-primary/[0.01]"
                    )}
                  >
                    {/* Progress bar at top */}
                    <div className="h-1 w-full bg-slate-100/80">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          session.status === "completed" && "bg-emerald-500",
                          isActive && "bg-primary",
                          isLocked && "bg-transparent"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <CardContent className="p-4 space-y-3">
                      {/* Top row: session number + badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-sm transition-all duration-300",
                            session.status === "completed" && "bg-emerald-500 text-white shadow-emerald-500/20",
                            isActive && "bg-primary text-white shadow-primary/20",
                            isLocked && "bg-slate-200 text-slate-400 border border-slate-300/10"
                          )}>
                            {session.status === "completed" ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isLocked ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              session.sessionNumber
                            )}
                          </div>
                          <Badge className={cn("text-[9px] font-bold px-2 py-0.5 border whitespace-nowrap shadow-none rounded-md", colors.bg, colors.text, colors.border)}>
                            {session.skill}
                          </Badge>
                        </div>
                        <Badge className={cn("text-[9px] font-bold px-2 py-0.5 border shadow-none rounded-md", config.color)}>
                          {t(config.labelKey)}
                        </Badge>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">
                        {session.title}
                      </p>

                      {/* Section progress */}
                      <div className="flex items-center gap-1 py-1">
                        {session.sections.map((sec) => (
                          <span
                            key={sec.id}
                            className={cn(
                              "h-1.5 flex-1 rounded-full transition-colors duration-300",
                              sec.completed ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.3)]" : "bg-slate-200"
                            )}
                          />
                        ))}
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {t("learning.common.mins", { count: session.estimatedMinutes })}
                        </span>
                        <span className="font-semibold">{t("learning.common.sections", { count: `${completedSections}/${session.sections.length}` })}</span>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-0.5 pt-1">
                        {Array.from({ length: session.maxStars }).map((_, i) => (
                          <Star key={i} className={cn("w-3.5 h-3.5 transition-all duration-300", i < session.stars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")} />
                        ))}
                        <span className="text-[10px] text-slate-400 ml-1 font-semibold">{session.stars}/{session.maxStars}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
