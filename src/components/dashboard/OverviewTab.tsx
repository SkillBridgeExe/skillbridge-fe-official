import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock, BookOpen, AlertCircle, Video, Upload, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import ActivityHeatmap from "./ActivityHeatmap";
import AIDailyBriefing from "./AIDailyBriefing";
import {
  MOCK_HEATMAP_DATA,
  MOCK_ROADMAP_NODES,
  MOCK_RECOMMENDATIONS,
} from "@/lib/mock-data/dashboard";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";

export default function OverviewTab() {
  const weeks = useActiveWeekPlans();
  const { reviewData, targetRole } = useDiagnosisStore();

  const hasRealRoadmap = weeks.length > 0;

  // Compute dynamic nodes from the active week plans
  const nodes = useMemo(() => {
    if (!hasRealRoadmap) return MOCK_ROADMAP_NODES;

    let foundInProgress = false;
    return weeks.map((week) => {
      const totalSessions = week.sessions.length;
      const completedSessions = week.sessions.filter((s) => s.status === "completed").length;
      const hasInProgress = week.sessions.some((s) => s.status === "in-progress");
      const allCompleted = totalSessions > 0 && completedSessions === totalSessions;

      let status: "completed" | "in_progress" | "locked";
      if (allCompleted) {
        status = "completed";
      } else if (hasInProgress || !foundInProgress) {
        status = "in_progress";
        foundInProgress = true;
      } else {
        status = "locked";
      }

      return {
        status,
        week: `Week ${week.weekNumber}`,
        title: week.moduleTitle,
      };
    });
  }, [weeks, hasRealRoadmap]);

  // Compute the active progress line fill ratio
  const completedWeeksCount = useMemo(() => {
    if (!hasRealRoadmap) return 2; // mock has index 2 in_progress (meaning 2 completed)
    return weeks.filter((w) => w.sessions.length > 0 && w.sessions.every((s) => s.status === "completed")).length;
  }, [weeks, hasRealRoadmap]);

  const progressRatio = useMemo(() => {
    const total = hasRealRoadmap ? weeks.length : MOCK_ROADMAP_NODES.length;
    if (total <= 1) return 0;
    return Math.min(1, completedWeeksCount / (total - 1));
  }, [completedWeeksCount, weeks.length, hasRealRoadmap]);

  // Compute real target role match details
  const roleName = targetRole || reviewData?.parsedCv?.inferred_roles?.[0] || "Senior Frontend Engineer";
  const matchScore = reviewData?.jdMatch?.matchScore ?? 65;
  const criticalGaps = reviewData?.jdMatch?.criticalGaps || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ═══ Quick Actions ═══ */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Continue Learning", icon: Zap, href: "/learning", variant: "default" as const, className: "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20 border-0" },
          { label: "Book Mock Interview", icon: Video, href: "/interview", variant: "outline" as const, className: "bg-white text-slate-700 border-slate-200 hover:border-primary/30 hover:text-primary hover:bg-primary/5" },
          { label: "Upload New CV", icon: Upload, href: "/diagnosis", variant: "outline" as const, className: "bg-white text-slate-700 border-slate-200 hover:border-primary/30 hover:text-primary hover:bg-primary/5" },
        ].map((action) => (
          <Link key={action.label} to={action.href} className="w-full sm:w-auto">
            <Button variant={action.variant} className={cn("h-10 w-full rounded-xl px-5 text-sm font-bold transition-all sm:w-auto", action.className)}>
              <action.icon className="w-4 h-4 mr-2" /> {action.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* ═══ AI Daily Briefing ═══ */}
      <AIDailyBriefing />

      {/* ═══ Top Row: Roadmap + CV Match ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Roadmap (span 2) */}
        <Card className="glass border-white/50 shadow-sm lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Learning Roadmap
            </CardTitle>
            <Link to="/learning">
              <Button variant="ghost" size="sm" className="text-primary font-bold text-sm">
                View details →
              </Button>
            </Link>
          </CardHeader>
          <CardContent 
            className="pt-6 pb-6 overflow-x-auto custom-scrollbar flex-1 flex items-center relative"
          >
            {/* Fade gradients to indicate scrollability */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />
            
            <div className="min-w-[750px] flex items-start justify-between px-8 relative w-full pt-2">
              {/* Thick background track */}
              <div className="absolute top-[28px] left-[70px] right-[70px] h-2 bg-slate-100 rounded-full -translate-y-1/2 z-0" />
              
              {/* Active progress fill */}
              <div 
                className="absolute top-[28px] left-[70px] h-2 bg-primary rounded-full -translate-y-1/2 transition-all duration-1000 ease-out z-0"
                style={{ width: `calc((100% - 140px) * ${progressRatio})` }} 
              />

              {nodes.map((node, idx) => (
                <RoadmapNode key={idx} {...node} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CV Match Summary */}
        <Card className="glass border-white/50 shadow-sm bg-gradient-to-br from-white to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Target Role Match
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-sm text-slate-500 font-medium mb-1 truncate">{roleName}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-primary">{matchScore}%</span>
                  <span className="text-sm text-slate-400">match core</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 flex items-center justify-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              {criticalGaps.length > 0 ? (
                criticalGaps.slice(0, 2).map((gap, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1.5 truncate">
                      <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      Gap: {gap}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-slate-400" /> Missing: System Design</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-slate-400" /> Gap: Cloud AWS</span>
                  </div>
                </>
              )}
            </div>
            
            <Button size="sm" className="w-full bg-white text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors text-sm font-bold rounded-xl">
              Scan Updated CV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Middle Row: Recommendations + Heatmap ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recommendations */}
        <Card className="glass border-white/50 shadow-sm">
          <CardHeader className="pb-2">
             <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Action Items
              </CardTitle>
             </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {MOCK_RECOMMENDATIONS.map((rec, idx) => (
              <RecommendationItem key={idx} {...rec} />
            ))}
          </CardContent>
        </Card>

        {/* Activity Heatmap */}
        <div className="lg:col-span-2">
          <ActivityHeatmap data={MOCK_HEATMAP_DATA} />
        </div>
        
      </div>
    </div>
  );
}

// ─── Roadmap Node ────────────────────────
function RoadmapNode({
  status,
  week,
  title,
}: {
  status: "completed" | "in_progress" | "pending" | "locked";
  week: string;
  title: string;
}) {
  const isCompleted = status === "completed";
  const isInProgress = status === "in_progress";
  const isPending = status === "pending";
  const isLocked = status === "locked";

  return (
    <div className="flex flex-col items-center relative z-10 w-28 text-center group cursor-pointer">
      {/* Node Circle */}
      <div className="relative flex items-center justify-center w-10 h-10 mb-3">
        {/* Glow effect for in_progress */}
        {isInProgress && (
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        )}
        
        <div
          className={cn(
            "relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ring-[6px] ring-white",
            isCompleted && "bg-primary text-white shadow-sm",
            isInProgress && "bg-white border-[3px] border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]",
            isPending && "bg-white border-[3px] border-slate-200 text-slate-400",
            isLocked && "bg-slate-100 text-slate-300"
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : isLocked ? (
            <Lock className="w-4 h-4" />
          ) : isInProgress ? (
            <div className="w-2 h-2 rounded-full bg-primary" />
          ) : (
            <span className="text-xs font-bold">{week.split(" ")[1] || "F"}</span>
          )}
        </div>
      </div>

      {/* Text Container */}
      <div className="flex flex-col items-center gap-1 transition-transform group-hover:-translate-y-1">
        <span className={cn(
          "text-[10px] uppercase font-bold tracking-wider",
          isCompleted ? "text-primary" : isInProgress ? "text-primary" : "text-slate-400"
        )}>
          {week}
        </span>
        <h4 className={cn(
          "text-xs leading-tight px-1",
          isInProgress ? "font-bold text-slate-900" : "font-semibold text-slate-600",
          isLocked && "text-slate-400"
        )}>
          {title}
        </h4>
      </div>
    </div>
  );
}

// ─── Recommendation Item ─────────────────
function RecommendationItem({
  title,
  description,
  type,
}: {
  title: string;
  description: string;
  type: "critical" | "success" | "info";
}) {
  const config = {
    critical: { 
      wrapper: "hover:border-red-200 hover:bg-red-50/30 border-l-red-500", 
      icon: AlertCircle, 
      iconColor: "text-red-500", 
      iconBg: "bg-red-50" 
    },
    success: { 
      wrapper: "hover:border-emerald-200 hover:bg-emerald-50/30 border-l-emerald-500", 
      icon: CheckCircle2, 
      iconColor: "text-emerald-500", 
      iconBg: "bg-emerald-50" 
    },
    info: { 
      wrapper: "hover:border-blue-200 hover:bg-blue-50/30 border-l-blue-500", 
      icon: BookOpen, 
      iconColor: "text-blue-500", 
      iconBg: "bg-blue-50" 
    },
  };
  const c = config[type];
  const Icon = c.icon;

  return (
    <div className={cn(
      "flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md cursor-pointer border-l-4", 
      c.wrapper
    )}>
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", c.iconBg)}>
        <Icon className={cn("w-4 h-4", c.iconColor)} />
      </div>
      <div>
        <h4 className="font-bold text-sm text-slate-800 leading-tight mb-1">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed max-w-[95%]">{description}</p>
      </div>
    </div>
  );
}
