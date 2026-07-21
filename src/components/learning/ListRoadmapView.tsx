import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  PlayCircle,
  Lock,
  Star,
  Clock,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  Circle,
  ExternalLink,
} from "lucide-react";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { DEFAULT_SKILL_COLOR, SKILL_COLORS } from "@/components/learning/skill-colors";

const statusConfig = {
  completed: { labelKey: "learning.status.completed", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  "in-progress": { labelKey: "learning.status.inProgress", icon: PlayCircle, color: "text-primary bg-primary/10" },
  locked: { labelKey: "learning.status.locked", icon: Lock, color: "text-slate-400 bg-slate-50" },
} as const;

export function ListRoadmapView() {
  const { t, i18n } = useTranslation("common");
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
                <p className="text-xs text-slate-400">
                  {t("learning.common.week", { number: week.weekNumber })} -{" "}
                  {t("learning.common.sectionsCompleted", { done: completedCount, total: week.sessions.length })}
                </p>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {t("learning.common.starProgress", {
                  earned: Math.round(week.sessions.reduce((sum, s) => sum + s.stars, 0)),
                  total: week.sessions.reduce((sum, s) => sum + s.maxStars, 0),
                })}
              </div>
            </div>

            {/* Sessions */}
            <div className="space-y-2 ml-5">
              {week.sessions.map(session => {
                const isLocked = session.status === "locked";
                const isInProgress = session.status === "in-progress";
                const config = statusConfig[session.status];
                const StatusIcon = config.icon;
                const colors = SKILL_COLORS[session.skill] || DEFAULT_SKILL_COLOR;
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
                            {t(config.labelKey)}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900 leading-snug group-hover:text-primary transition-colors truncate">
                          {session.title}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t("learning.common.mins", { count: session.estimatedMinutes })}
                          </span>
                          {session.scheduledStartAt ? (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {formatSessionSchedule(
                                session.scheduledStartAt,
                                i18n.language,
                              )}
                            </span>
                          ) : null}
                          <span>{t("learning.common.sections", { count: `${completedSections}/${session.sections.length}` })}</span>
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
                        {session.resources.length > 0 && (
                          <div className="mt-3 space-y-2 rounded-xl border border-slate-100 bg-white p-3">
                            {session.resources.map((resource) => (
                              <div key={`${session.id}-${resource.title}`} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-xs font-bold text-slate-800">{resource.title}</p>
                                    {resource.lowConfidence && (
                                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                        {t("learning.common.pendingSource")}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                                    {resource.platform ?? resource.type}
                                    {resource.duration ? ` - ${resource.duration}` : ""}
                                    {resource.proofOfCompletion ? ` - ${resource.proofOfCompletion}` : ""}
                                  </p>
                                </div>
                                {resource.isInternal ? (
                                  <button
                                    onClick={() => navigate(`/learning/session/${session.id}`)}
                                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90"
                                  >
                                    {t("learning.common.startPractice")}
                                  </button>
                                ) : resource.url ? (
                                  <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary/30 hover:text-primary"
                                  >
                                    {t("learning.common.openResource")} <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => navigate(`/learning/session/${session.id}`)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors mt-2"
                        >
                          {t("learning.common.enterSession")}
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

export function formatSessionSchedule(
  scheduledStartAt: string,
  locale: string,
  timeZone?: string,
) {
  const value = new Date(scheduledStartAt);
  if (Number.isNaN(value.getTime())) return scheduledStartAt;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(value);
}
