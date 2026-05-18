import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  PlayCircle,
  Lock,
  Star,
  Clock,
  ChevronRight,
  ChevronDown,
  Circle,
} from "lucide-react";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { SKILL_COLORS } from "@/lib/mock-data/learning";

const statusConfig = {
  completed:     { label: "Completed", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  "in-progress": { label: "In Progress",     icon: PlayCircle,   color: "text-primary bg-primary/10" },
  locked:        { label: "Locked",   icon: Lock,         color: "text-slate-400 bg-slate-50" },
} as const;

export function ListRoadmapView() {
  const navigate = useNavigate();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const weeks = useActiveWeekPlans();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Grouped by week */}
      {weeks.map(week => {
        const completedCount = week.sessions.filter(s => s.status === "completed").length;
        return (
          <div key={week.weekNumber}>
            {/* Week header */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0",
                completedCount === week.sessions.length
                  ? "bg-emerald-500 text-white"
                  : "bg-primary/10 text-primary"
              )}>
                {completedCount === week.sessions.length ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  week.weekNumber
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">{week.moduleTitle}</h3>
                <p className="text-xs text-slate-400">Week {week.weekNumber} · {completedCount}/{week.sessions.length} completed</p>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {Math.round(week.sessions.reduce((sum, s) => sum + s.stars, 0))}/{week.sessions.reduce((sum, s) => sum + s.maxStars, 0)} ⭐
              </div>
            </div>

            {/* Sessions */}
            <div className="space-y-2 ml-5">
              {week.sessions.map(session => {
                const isLocked = session.status === "locked";
                const isInProgress = session.status === "in-progress";
                const config = statusConfig[session.status];
                const StatusIcon = config.icon;
                const colors = SKILL_COLORS[session.skill] || { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
                const completedSections = session.sections.filter(s => s.completed).length;
                const isExpanded = expandedSession === session.id;

                return (
                  <div key={session.id}>
                    {/* Session row */}
                    <button
                      onClick={() => {
                        if (isLocked) return;
                        setExpandedSession(isExpanded ? null : session.id);
                      }}
                      disabled={isLocked}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl border bg-white text-left transition-all group",
                        isLocked
                          ? "opacity-50 cursor-not-allowed border-slate-100"
                          : "hover:shadow-md cursor-pointer border-slate-200",
                        isInProgress && "ring-2 ring-primary/20 border-primary/30 bg-primary/5",
                        isExpanded && !isLocked && "shadow-md border-primary/20"
                      )}
                    >
                      {/* Session number circle */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-black",
                        session.status === "completed" && "bg-emerald-500 text-white",
                        isInProgress && "bg-primary text-white",
                        isLocked && "bg-slate-100 text-slate-400"
                      )}>
                        {session.status === "completed" ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          session.sessionNumber
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("text-[10px] px-2 py-0.5 border whitespace-nowrap", colors.bg, colors.text, colors.border)}>
                            {session.skill}
                          </Badge>
                          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5", config.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900 leading-snug group-hover:text-primary transition-colors truncate">
                          {session.title}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {session.estimatedMinutes} min
                          </span>
                          <span>{completedSections}/{session.sections.length} sections</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: session.maxStars }).map((_, i) => (
                              <Star key={i} className={cn("w-3 h-3", i < session.stars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")} />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Expand/Arrow */}
                      {!isLocked && (
                        isExpanded
                          ? <ChevronDown className="w-5 h-5 text-primary transition-colors flex-shrink-0" />
                          : <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors flex-shrink-0" />
                      )}
                    </button>

                    {/* Expanded sections (PREP-style section list) */}
                    {isExpanded && !isLocked && (
                      <div className="ml-16 mt-2 mb-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {session.sections.map(section => (
                          <button
                            key={section.id}
                            onClick={() => navigate(`/learning/session/${session.id}`)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors group/section"
                          >
                            {section.completed
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                            }
                            <span className={cn(
                              "text-sm flex-1",
                              section.completed ? "text-slate-500" : "text-slate-800 font-medium"
                            )}>
                              {section.title}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Star key={i} className={cn(
                                  "w-3 h-3",
                                  section.completed
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-slate-200 text-slate-200"
                                )} />
                              ))}
                            </div>
                          </button>
                        ))}

                        {/* Enter session button */}
                        <button
                          onClick={() => navigate(`/learning/session/${session.id}`)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors mt-2"
                        >
                          Enter Session
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}