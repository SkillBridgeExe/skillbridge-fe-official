import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const weeks = useActiveWeekPlans();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Grouped by week — PREP style */}
      {weeks.map(week => (
        <div key={week.weekNumber}>
          {/* Week header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-black text-primary">{week.weekNumber}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{week.moduleTitle}</h3>
                <p className="text-xs text-slate-400">
                  {t("learning.common.week", { number: week.weekNumber })} -{" "}
                  {t("learning.common.sessions", { count: week.sessions.length })}
                </p>
              </div>
            </div>
            {/* Completion indicator */}
            <div className="flex items-center gap-1">
              {week.sessions.map(s => (
                <span
                  key={s.id}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-colors",
                    s.status === "completed" && "bg-emerald-500",
                    s.status === "in-progress" && "bg-primary",
                    s.status === "locked" && "bg-slate-200"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Session cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  onClick={() => !isLocked && navigate(`/learning/session/${session.id}`)}
                  className={cn(
                    "border transition-all cursor-pointer group rounded-2xl overflow-hidden",
                    isLocked ? "opacity-50 cursor-not-allowed border-slate-100" : "hover:shadow-lg hover:-translate-y-1 border-slate-200",
                    isActive && "ring-2 ring-primary/20 border-primary/30"
                  )}
                >
                  {/* Progress bar at top */}
                  <div className="h-1 w-full bg-slate-100">
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
                          "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black",
                          session.status === "completed" && "bg-emerald-500 text-white",
                          isActive && "bg-primary text-white",
                          isLocked && "bg-slate-200 text-slate-500"
                        )}>
                          {session.status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isLocked ? (
                            <Lock className="w-5 h-5" />
                          ) : (
                            session.sessionNumber
                          )}
                        </div>
                        <Badge className={cn("text-[10px] px-2 py-0.5 border whitespace-nowrap", colors.bg, colors.text, colors.border)}>
                          {session.skill}
                        </Badge>
                      </div>
                      <Badge className={cn("text-[10px] px-2 py-0.5 border", config.color)}>
                        {t(config.labelKey)}
                      </Badge>
                    </div>

                    {/* Title */}
                    <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {session.title}
                    </p>

                    {/* Section progress */}
                    <div className="flex items-center gap-1">
                      {session.sections.map((sec) => (
                        <span
                          key={sec.id}
                          className={cn(
                            "h-1.5 flex-1 rounded-full transition-colors",
                            sec.completed ? "bg-emerald-400" : "bg-slate-200"
                          )}
                        />
                      ))}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t("learning.common.mins", { count: session.estimatedMinutes })}
                      </span>
                      <span>{t("learning.common.sections", { count: `${completedSections}/${session.sections.length}` })}</span>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: session.maxStars }).map((_, i) => (
                        <Star key={i} className={cn("w-3.5 h-3.5", i < session.stars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")} />
                      ))}
                      <span className="text-[10px] text-slate-400 ml-1">{session.stars}/{session.maxStars}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
