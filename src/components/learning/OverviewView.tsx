import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  Lock,
  Star,
  Calendar,
  List,
  Edit3,
  Clock,
  CalendarDays
} from "lucide-react";
import { useActiveWeekPlans, useRoadmapStore } from "@/components/learning/roadmap-store";
import type { LearningSession } from "./types";
import { DEFAULT_SKILL_COLOR, SKILL_COLORS } from "@/components/learning/skill-colors";
import {
  getSessionsForIsoWeekday,
  getSessionsForRoadmapWeek,
  toIsoWeekday,
} from "./calendar-schedule";

// ─── Calendar Helpers ──────────────────────────────
function getWeekDates(offset: number) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isToday(date: Date) {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
}

// ─── Calendar + Session Overview (PREP-inspired) ───
export function OverviewView() {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const dates = getWeekDates(weekOffset);
  const dayLabels = useMemo(() => {
    const locale = i18n.language.startsWith("vi") ? "vi-VN" : "en-US";
    return DAY_LABELS.map((_, index) => {
      const date = new Date(2024, 0, 1 + index);
      return date.toLocaleDateString(locale, { weekday: "short" });
    });
  }, [i18n.language]);
  
  // Drag-to-scroll functionality for PC users
  const roadmapScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const { activeRoadmap, weekPlans, setWeekPlans } = useRoadmapStore();
  const weeks        = useActiveWeekPlans();
  // Overview is ordered by module rank; calendar views consume WeekPlan.weekNumber.
  const roadmapModules = useMemo(() => {
    const modules = activeRoadmap?.modules ?? [];
    if (modules.length === 0) {
      let foundInProgress = false;
      return weeks.map((week) => {
        const totalSessions = week.sessions.length;
        const completedSessions = week.sessions.filter((session) => session.status === 'completed').length;
        const hasInProgress = week.sessions.some((session) => session.status === 'in-progress');
        const allCompleted = totalSessions > 0 && completedSessions === totalSessions;
        const status = allCompleted
          ? 'completed'
          : hasInProgress || !foundInProgress
            ? 'in-progress'
            : 'locked';
        if (status === 'in-progress') foundInProgress = true;
        return {
          id: week.moduleId ?? "legacy-week-" + week.weekNumber,
          title:
            week.moduleTitle ??
            [...new Set(week.sessions.map((session) => session.skill))].join(' · '),
          weekNumber: week.weekNumber,
          status,
          totalSessions,
          completedSessions,
        };
      });
    }

    let foundInProgress = false;
    return [...modules]
      .sort((a, b) => a.rank - b.rank)
      .map((module) => {
        const totalSessions = module.sessions.length;
        const completedSessions = module.sessions.filter(
          (session) => session.status === 'COMPLETED',
        ).length;
        const hasInProgress = module.sessions.some(
          (session) => session.status === 'AVAILABLE',
        );
        const allCompleted =
          totalSessions > 0 && completedSessions === totalSessions;

        let status: 'completed' | 'in-progress' | 'locked';
        if (allCompleted) {
          status = 'completed';
        } else if (hasInProgress || !foundInProgress) {
          status = 'in-progress';
          foundInProgress = true;
        } else {
          status = 'locked';
        }

        return {
          id: module.id,
          title: module.display_name,
          weekNumber: module.rank,
          status,
          totalSessions,
          completedSessions,
        };
      });
  }, [activeRoadmap, weeks]);
  const [activeSessions, setActiveSessions] = useState<LearningSession[]>([]);
  useEffect(() => {
    setActiveSessions(weeks.flatMap(w => w.sessions) as LearningSession[]);
  }, [weeks]);
  const visibleSessions = useMemo(
    () => getSessionsForRoadmapWeek(weeks, weekOffset),
    [weekOffset, weeks],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!roadmapScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - roadmapScrollRef.current.offsetLeft);
    setScrollLeft(roadmapScrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !roadmapScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - roadmapScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    roadmapScrollRef.current.scrollLeft = scrollLeft - walk;
  };
  
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  // Edit state for the modal
  const [editingSessions, setEditingSessions] = useState<Record<string, { dayOfWeek: number, estimatedMinutes: number }>>({});

  const monthLabel = useMemo(() => {
    const d = dates[3];
    return d.toLocaleDateString(i18n.language.startsWith("vi") ? "vi-VN" : "en-US", { month: "long", year: "numeric" });
  }, [dates, i18n.language]);

  // Get today's sessions for instant access
  const todayIsoWeekday = toIsoWeekday(new Date().getDay());
  const todaySessions = weekOffset === 0
    ? getSessionsForIsoWeekday(todayIsoWeekday, visibleSessions)
    : [];

  const handleOpenReschedule = () => {
    // Initialize editing state with current values
    const initialEdits: Record<string, { dayOfWeek: number, estimatedMinutes: number }> = {};
    activeSessions.filter(s => s.status !== "completed").forEach(s => {
      initialEdits[s.id] = { dayOfWeek: s.dayOfWeek, estimatedMinutes: s.estimatedMinutes };
    });
    setEditingSessions(initialEdits);
    setIsRescheduleOpen(true);
  };

  const handleSaveReschedule = () => {
    setActiveSessions(prev => prev.map(session => {
      if (editingSessions[session.id]) {
        return {
          ...session,
          dayOfWeek: editingSessions[session.id].dayOfWeek,
          estimatedMinutes: editingSessions[session.id].estimatedMinutes
        };
      }
      return session;
    }));
    
    if (weekPlans.length > 0) {
      const updated = weekPlans.map(week => ({
        ...week,
        sessions: week.sessions.map(s => {
          if (editingSessions[s.id]) {
            return {
              ...s,
              dayOfWeek: editingSessions[s.id].dayOfWeek,
              estimatedMinutes: editingSessions[s.id].estimatedMinutes
            };
          }
          return s;
        })
      }));
      setWeekPlans(updated);
    }
    
    setIsRescheduleOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ═══ Calendar Section (PREP-style weekly view) ═══ */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-2xl bg-white">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h3 className="text-base font-bold text-slate-900 min-w-[120px]">{monthLabel}</h3>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
              <button
                onClick={() => setWeekOffset(o => o - 1)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors"
                title={t("learning.overview.previousWeek")}
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className={cn(
                  "text-xs font-semibold px-3 py-1 rounded-md transition-colors",
                  weekOffset === 0
                    ? "text-primary bg-primary/10"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {t("learning.overview.today")}
              </button>
              <button
                onClick={() => setWeekOffset(o => o + 1)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors"
                title={t("learning.overview.nextWeek")}
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
          
          {!activeRoadmap ? <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleOpenReschedule} className="h-8 text-xs font-semibold gap-1.5 border-slate-200 hover:border-primary/30 text-slate-700 hover:text-primary hover:bg-primary/5 rounded-lg shadow-sm transition-all bg-white">
                <Edit3 className="w-3.5 h-3.5" />
                {t("learning.sidebar.reschedule")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
              <div className="px-6 py-5 bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/10">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    {t("learning.overview.adjustSchedule")}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-500 mt-1">{t("learning.overview.scheduleHint")}</p>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-6 space-y-4">
                {activeSessions.filter(s => s.status !== "completed").map((session) => (
                  <Card key={session.id} className="p-4 border border-slate-200 shadow-sm rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                           <Badge className={cn("text-[10px] px-1.5 py-0 border font-medium whitespace-nowrap", (SKILL_COLORS[session.skill] || DEFAULT_SKILL_COLOR).bg, (SKILL_COLORS[session.skill] || DEFAULT_SKILL_COLOR).text, (SKILL_COLORS[session.skill] || DEFAULT_SKILL_COLOR).border)}>
                            {session.skill}
                          </Badge>
                          <span className="text-[10px] font-bold text-slate-400">
                            {t("learning.common.session", { number: session.sessionNumber })}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">{session.title}</h4>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Day of Week Select */}
                      <div className="space-y-1.5">
                         <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                           <Calendar className="w-3.5 h-3.5" /> {t("learning.overview.day")}
                         </Label>
                         <select
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            value={editingSessions[session.id]?.dayOfWeek ?? session.dayOfWeek}
                            onChange={(e) => setEditingSessions(prev => ({
                              ...prev,
                              [session.id]: { ...prev[session.id], dayOfWeek: parseInt(e.target.value) }
                            }))}
                         >
                           {dayLabels.map((label, idx) => (
                             <option key={idx} value={idx + 1}>{label}</option>
                           ))}
                         </select>
                      </div>

                      {/* Estimated Minutes Input */}
                       <div className="space-y-1.5">
                         <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                           <Clock className="w-3.5 h-3.5" /> {t("learning.overview.durationMins")}
                         </Label>
                         <Input 
                            type="number"
                            min={10}
                            step={5}
                            className="h-9"
                            value={editingSessions[session.id]?.estimatedMinutes ?? session.estimatedMinutes}
                            onChange={(e) => setEditingSessions(prev => ({
                              ...prev,
                              [session.id]: { ...prev[session.id], estimatedMinutes: parseInt(e.target.value) }
                            }))}
                         />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsRescheduleOpen(false)} className="rounded-xl">
                  {t("learning.overview.cancel")}
                </Button>
                <Button onClick={handleSaveReschedule} className="rounded-xl shadow-md w-32">
                  {t("learning.overview.saveChanges")}
                </Button>
              </div>
            </DialogContent>
          </Dialog> : null}
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-2 overflow-hidden">
        {/* Calendar Grid wrapped safely */}
        <div className="overflow-x-auto min-w-full custom-scrollbar pb-2">
          <div className="grid grid-cols-7 divide-x divide-slate-100 min-w-[900px]">
            {dates.map((date, idx) => {
              const sessions = getSessionsForIsoWeekday(idx + 1, visibleSessions);
              const today = isToday(date);
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[180px] p-2.5 transition-all duration-300",
                    today 
                      ? "bg-gradient-to-b from-primary/[0.03] to-transparent border-t-2 border-t-primary shadow-[inset_0_2px_4px_rgba(59,130,246,0.02)]" 
                      : "hover:bg-slate-50/65"
                  )}
                >
                {/* Day header */}
                <div className="text-center mb-2.5">
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">{dayLabels[idx]}</p>
                  <div className="mt-1 flex justify-center">
                    <span className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300",
                      today
                        ? "bg-gradient-to-br from-primary to-blue-600 text-white shadow-md shadow-primary/20 scale-105"
                        : "text-slate-700 hover:bg-slate-100"
                    )}>
                      {date.getDate()}
                    </span>
                  </div>
                </div>

                {/* Session cards */}
                {sessions.length > 0 ? (
                  <div className="space-y-1.5">
                    {sessions.map(session => {
                      const colors = SKILL_COLORS[session.skill] || DEFAULT_SKILL_COLOR;
                      const isActive = session.status === "in-progress";
                      const isCompleted = session.status === "completed";
                      const isLocked = session.status === "locked";
                      // ✅ Allow clicking in-progress AND completed sessions
                      const canClick = !isLocked;
                      return (
                        <button
                          key={session.id}
                          onClick={() => canClick && navigate(`/learning/session/${session.id}`)}
                          disabled={isLocked}
                          className={cn(
                            "w-full rounded-xl border p-2 text-left transition-all duration-300 shadow-sm",
                            isLocked
                              ? "opacity-45 cursor-not-allowed border-slate-100 bg-slate-50/50"
                              : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer bg-white",
                            isActive && "border-primary/40 ring-2 ring-primary/10 shadow-md shadow-primary/5 bg-gradient-to-br from-white to-primary/[0.01]",
                            isCompleted && "border-emerald-200 bg-emerald-50/20 hover:border-emerald-355",
                            !isActive && !isCompleted && canClick && "border-slate-200"
                          )}
                        >
                          {/* Session badge */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className={cn(
                              "inline-flex items-center justify-center w-5 h-5 rounded-lg text-[9px] font-black flex-shrink-0 shadow-sm",
                              isCompleted && "bg-emerald-500 text-white shadow-emerald-500/20",
                              isActive && "bg-primary text-white shadow-primary/20",
                              isLocked && "bg-slate-200 text-slate-400 border border-slate-300/10"
                            )}>
                              {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : session.sessionNumber}
                            </span>
                            <Badge className={cn("text-[9px] font-bold px-1.5 py-0.5 border shadow-none rounded-md whitespace-nowrap", colors.bg, colors.text, colors.border)}>
                              <span className="truncate max-w-[70px]">{session.skill}</span>
                            </Badge>
                          </div>
                          <p className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2 mb-1.5" title={session.title}>
                            {session.title}
                          </p>
                          {/* ✅ Start button for active sessions */}
                          {isActive && (
                            <div className="mt-1.5 flex w-full items-center justify-center gap-1 bg-primary text-white text-[9px] font-black py-1.5 rounded-lg shadow-sm shadow-primary/10 hover:bg-primary/95 active:scale-[0.98] transition-all">
                              <PlayCircle className="h-3 w-3 fill-white/20" /> {t("learning.common.start")}
                            </div>
                          )}
                          {/* Stars */}
                          {!isActive && (
                            <div className="flex items-center gap-0.5 mt-1">
                              {Array.from({ length: session.maxStars }).map((_, i) => (
                                <Star key={i} className={cn("w-2.5 h-2.5", i < session.stars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")} />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-300 text-center mt-6 italic">{t("learning.common.freeDay")}</p>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </div>
      </Card>

      {/* ═══ Today's Sessions — Premium SaaS List ═══ */}
      {todaySessions.length > 0 && (
        <div className="animate-in slide-in-from-bottom-4 duration-700 ease-out">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
              <CalendarDays className="w-5 h-5 text-primary" />
              {t("learning.overview.todaysSessions")}
            </h3>
            <Badge variant="outline" className="text-xs bg-white text-slate-500 font-semibold border-slate-200 shadow-sm">
              {t("learning.common.total", { count: todaySessions.length })}
            </Badge>
          </div>
          <div className="space-y-3.5">
            {todaySessions.map(session => {
              const colors = SKILL_COLORS[session.skill] || DEFAULT_SKILL_COLOR;
              const isActive = session.status === "in-progress";
              const isCompleted = session.status === "completed";
              const isLocked = session.status === "locked";

              return (
                <button
                  key={session.id}
                  onClick={() => !isLocked && navigate(`/learning/session/${session.id}`)}
                  disabled={isLocked}
                  className={cn(
                    "relative w-full overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 md:p-5 sm:pr-6 rounded-2xl border text-left transition-all duration-300 group shadow-sm",
                    isLocked 
                      ? "bg-slate-50/50 border-dashed border-slate-200 hover:bg-slate-100/50 opacity-60" 
                      : "bg-white hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-0.5 border-slate-200",
                    isActive && "ring-2 ring-primary/10 border-primary/40 shadow-lg shadow-primary/[0.03] bg-gradient-to-br from-white to-primary/[0.01]"
                  )}
                >
                  {/* Active Indicator Line */}
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] z-10" />}

                  {/* Number / Icon */}
                  <div className={cn(
                    "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg md:text-xl font-black shadow-sm transition-transform duration-300",
                    isCompleted && "bg-emerald-100 text-emerald-600 shadow-emerald-100/50",
                    isActive && "bg-primary text-white shadow-primary/40 group-hover:scale-105",
                    isLocked && "bg-slate-100 text-slate-400 shadow-none border border-slate-200/50"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7" />
                    ) : (
                      session.sessionNumber
                    )}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 font-bold border-0 shadow-sm", isLocked ? "bg-slate-200 text-slate-500" : colors.bg, !isLocked && colors.text)}>
                        {session.skill}
                      </Badge>
                      
                      {isLocked && (
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                          <Lock className="w-3 h-3" /> {t("learning.status.locked")}
                        </span>
                      )}
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md shadow-sm">
                          <CheckCircle2 className="w-3 h-3" /> {t("learning.status.completed")}
                        </span>
                      )}
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shadow-sm animate-pulse">
                          {t("learning.status.upNext")}
                        </span>
                      )}
                    </div>
                    
                    <h4 className={cn(
                      "text-base md:text-[17px] font-bold leading-snug mb-2.5 transition-colors duration-300",
                      isLocked ? "text-slate-500" : "text-slate-900 group-hover:text-primary"
                    )}>
                      {session.title}
                    </h4>

                    {/* Metadata items */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-auto">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        <List className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {t("learning.common.sections", {
                            count: `${session.sections.filter(s => s.completed).length}/${session.sections.length}`,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t("learning.common.mins", { count: session.estimatedMinutes })}</span>
                      </div>
                      
                      {/* Stars - Only show if not locked or has stars */}
                      {(!isLocked) && (
                        <div className="flex items-center gap-0.5 ml-auto translate-y-px">
                          {Array.from({ length: session.maxStars }).map((_, i) => (
                            <Star key={i} className={cn("w-3.5 h-3.5 drop-shadow-sm", i < session.stars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action Block */}
                  <div className="hidden sm:flex items-center justify-center pl-6 border-l border-slate-100 h-10 ml-2">
                    {isActive ? (
                      <Button size="sm" className="rounded-xl shadow-md gap-2 font-bold px-4 hover:scale-105 transition-transform">
                        <PlayCircle className="w-4 h-4 fill-white/20" /> {t("learning.common.start")}
                      </Button>
                    ) : isCompleted ? (
                      <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm text-slate-400 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-all duration-300">
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-100/50 flex items-center justify-center border border-slate-200 text-slate-300">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Roadmap Flow — Premium SaaS UI ═══ */}
      <div className="pt-4  animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out delay-150">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{t("learning.page.roadmapTitle")}</h3>
          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-500 font-semibold border-none px-3 py-1">
            {t("learning.page.meta", {
              count: roadmapModules.length,
              hours: weeks.reduce((acc, w) => acc + w.sessions.reduce((a, s) => a + Math.round(s.estimatedMinutes / 60), 0), 0),
            })}
          </Badge>
        </div>

        {/* Horizontal flow */}
        <div className="relative">
          <div 
            ref={roadmapScrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeaveOrUp}
            onMouseUp={handleMouseLeaveOrUp}
            onMouseMove={handleMouseMove}
            className={cn(
              "flex items-center gap-4 overflow-x-auto py-6 custom-scrollbar px-2 -mx-2 relative z-10 scroll-smooth",
              isDragging ? "cursor-grabbing select-none" : "cursor-grab"
            )}
          >
            {roadmapModules.map((mod, idx) => {
              const isCompleted = mod.status === "completed";
              const isInProgress = mod.status === "in-progress";
              const isLocked = mod.status === "locked";
              const completedTopics = mod.completedSessions;
              const progress = mod.totalSessions > 0 ? Math.round((completedTopics / mod.totalSessions) * 100) : 0;
              
              return (
                <div key={mod.id} className="flex items-center flex-shrink-0 group">
                  {/* Module Card */}
                  <div className={cn(
                    "relative flex flex-col justify-between w-[200px] h-[170px] rounded-3xl p-5 transition-all duration-300 transform",
                    isCompleted && "bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 shadow-sm hover:shadow-md hover:-translate-y-1",
                    isInProgress && "bg-white border ring-1 ring-primary/20 border-primary shadow-lg shadow-primary/10 hover:-translate-y-1 scale-105 mx-2 z-10",
                    isLocked && "bg-white border border-slate-100 shadow-sm opacity-70 hover:opacity-100 transition-opacity"
                  )}>
                    {/* Glowing effect for active */}
                    {isInProgress && (
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-blue-400/30 rounded-3xl blur opacity-30 -z-10 animate-pulse"></div>
                    )}

                    {/* Top Row: Week Badge & Status */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          {t("learning.common.week", { number: mod.weekNumber })}
                        </span>
                        {isInProgress && (
                          <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/20 text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-none animate-pulse">
                            {t("learning.status.inProgress")}
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge variant="outline" className="w-fit bg-emerald-50 text-emerald-600 border-emerald-250 text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-none">
                            {t("learning.status.completed")}
                          </Badge>
                        )}
                        {isLocked && (
                          <Badge variant="outline" className="w-fit bg-slate-50 text-slate-400 border-slate-200 text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-none">
                            {t("learning.status.locked")}
                          </Badge>
                        )}
                      </div>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-sm transition-transform",
                        isCompleted && "bg-emerald-500 text-white shadow-emerald-500/20",
                        isInProgress && "bg-primary text-white shadow-primary/30",
                        isLocked && "bg-slate-100 text-slate-400 border border-slate-200"
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isLocked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          mod.weekNumber
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <div className="flex-1 mt-1">
                      <h4 className={cn(
                        "text-sm font-bold leading-snug line-clamp-3",
                        isLocked ? "text-slate-500" : "text-slate-800"
                      )}>
                        {mod.title}
                      </h4>
                    </div>

                    {/* Bottom Row: Progress */}
                    <div className="mt-4 space-y-2 w-full">
                       <div className="flex justify-between text-[10px] font-bold">
                          <span className={cn(
                             isCompleted && "text-emerald-600",
                             isInProgress && "text-primary",
                             isLocked && "text-slate-400"
                          )}>
                             {progress}%
                          </span>
                          <span className="text-slate-400">{completedTopics}/{mod.totalSessions}</span>
                       </div>
                      <div className={cn(
                         "h-2 w-full rounded-full overflow-hidden",
                         isLocked ? "bg-slate-100" : "bg-slate-100/80"
                      )}>
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-1000 ease-out",
                            isCompleted && "bg-gradient-to-r from-emerald-400 to-emerald-500",
                            isInProgress && "bg-gradient-to-r from-primary to-blue-500 relative overflow-hidden",
                            isLocked && "bg-slate-300"
                          )}
                          style={{ width: `${progress}%` }}
                        >
                           {/* Shimmer effect for active progress */}
                           {isInProgress && (
                              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                           )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Connector */}
                  {idx < roadmapModules.length - 1 && (
                    <div className="flex items-center justify-center w-8 md:w-12 relative z-0 flex-shrink-0 px-0.5">
                       <div className={cn(
                          "w-full transition-all duration-500",
                          isCompleted && roadmapModules[idx+1]?.status === "completed" && "h-1 bg-gradient-to-r from-emerald-500 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] rounded-full",
                          isCompleted && roadmapModules[idx+1]?.status === "in-progress" && "h-1 bg-gradient-to-r from-emerald-500 to-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)]",
                          isInProgress && "h-1 bg-gradient-to-r from-primary to-slate-200 rounded-full",
                          isLocked && "h-[2px] border-t border-dashed border-slate-200",
                          !isCompleted && !isInProgress && "h-[2px] border-t border-dashed border-slate-200"
                       )} />

                       {/* Solid Arrowhead pointing right */}
                       <svg className={cn(
                         "w-1.5 h-1.5 absolute -right-0.5 top-1/2 -translate-y-1/2 fill-current z-10 transition-colors duration-500",
                         isCompleted && roadmapModules[idx+1]?.status === "completed" && "text-emerald-500",
                         isCompleted && roadmapModules[idx+1]?.status === "in-progress" && "text-primary",
                         isInProgress && "text-slate-300",
                         isLocked && "text-slate-200"
                       )} viewBox="0 0 8 8">
                         <path d="M 0 0 L 8 4 L 0 8 Z" />
                       </svg>

                       {/* Animated pulse dot on active path */}
                       {isCompleted && roadmapModules[idx+1]?.status === "in-progress" && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)] relative">
                              <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                            </div>
                          </div>
                       )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
