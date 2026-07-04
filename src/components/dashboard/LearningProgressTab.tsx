import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { ArrowRight, Trophy, TrendingUp, TrendingDown, Info, Monitor, Database, ServerCog, Users, Sparkles, Target, Zap, Clock, Activity, Medal, BookOpen } from "lucide-react";
import LearningHistoryTimeline from "./LearningHistoryTimeline";
import {
  MOCK_MODULE_PROGRESS,
  MOCK_COURSES,
  MOCK_LEARNING_HISTORY,
  MOCK_STUDY_PLAN,
  MOCK_WEEKLY_SCORES,
  MOCK_SCORE_TRACKING,
  MOCK_AI_INSIGHTS,
  MOCK_TROPHY_STATS,
} from "@/lib/mock-data/dashboard";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";

const DONUT_COLORS = ["#e2e8f0", "#f59e0b", "#10b981"]; 

export default function LearningProgressTab() {
  const weeks = useActiveWeekPlans();
  const { reviewData, targetRole } = useDiagnosisStore();

  const hasRealRoadmap = weeks.length > 0;

  // Compute stats from dynamic learning sessions
  const sessions = useMemo(() => weeks.flatMap((w) => w.sessions || []), [weeks]);
  
  const completedUnits = useMemo(() => sessions.filter((s) => s.status === "completed").length, [sessions]);
  const totalUnits = sessions.length;
  
  const earnedStars = useMemo(() => sessions.reduce((total, s) => total + (s.stars || 0), 0), [sessions]);
  const totalStars = useMemo(() => sessions.reduce((total, s) => total + (s.maxStars || 0), 0), [sessions]);

  const roleName = targetRole || reviewData?.parsedCv?.inferred_roles?.[0] || "Frontend Career Path";

  // Compute lesson and test progress from sections
  const allSections = useMemo(() => sessions.flatMap((s) => s.sections || []), [sessions]);
  
  const lessonsCompleted = useMemo(() => {
    if (!hasRealRoadmap) return MOCK_TROPHY_STATS.lessonsCompleted;
    return allSections.length > 0
      ? allSections.filter((sec) => sec.completed && (sec.type === "video" || sec.type === "reading")).length
      : completedUnits;
  }, [allSections, completedUnits, hasRealRoadmap]);

  const testsCompleted = useMemo(() => {
    if (!hasRealRoadmap) return MOCK_TROPHY_STATS.testsCompleted;
    return allSections.length > 0
      ? allSections.filter((sec) => sec.completed && (sec.type === "quiz" || sec.type === "practice")).length
      : 0;
  }, [allSections, hasRealRoadmap]);

  const lessonsRatio = useMemo(() => {
    const total = lessonsCompleted + testsCompleted;
    if (total === 0) return 0;
    return (lessonsCompleted / total) * 100;
  }, [lessonsCompleted, testsCompleted]);

  const testsRatio = useMemo(() => {
    const total = lessonsCompleted + testsCompleted;
    if (total === 0) return 0;
    return (testsCompleted / total) * 100;
  }, [lessonsCompleted, testsCompleted]);

  // Compute donut chart status grouping
  const moduleProgress = useMemo(() => {
    if (!hasRealRoadmap) {
      return {
        notStarted: MOCK_MODULE_PROGRESS.notStarted,
        inProgress: MOCK_MODULE_PROGRESS.inProgress,
        completed: MOCK_MODULE_PROGRESS.completed,
        total: MOCK_MODULE_PROGRESS.total,
      };
    }

    let notStarted = 0;
    let inProgress = 0;
    let completed = 0;

    weeks.forEach((week) => {
      const total = week.sessions.length;
      const done = week.sessions.filter((s) => s.status === "completed").length;
      const started = week.sessions.some((s) => s.status === "in-progress" || s.status === "completed");

      if (done === total && total > 0) {
        completed++;
      } else if (started) {
        inProgress++;
      } else {
        notStarted++;
      }
    });

    return {
      notStarted,
      inProgress,
      completed,
      total: weeks.length,
    };
  }, [weeks, hasRealRoadmap]);

  const donutData = useMemo(() => [
    { name: "Not Started", value: moduleProgress.notStarted },
    { name: "In Progress", value: moduleProgress.inProgress },
    { name: "Completed", value: moduleProgress.completed },
  ], [moduleProgress]);

  // Compute course items list
  const courses = useMemo(() => {
    if (!hasRealRoadmap) return MOCK_COURSES;

    return weeks.map((week, idx) => {
      const completedSessions = week.sessions.filter((s) => s.status === "completed").length;
      const totalSessions = week.sessions.length;
      const progress = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
      
      let status: "active" | "completed" | "not_started" = "not_started";
      if (completedSessions === totalSessions && totalSessions > 0) {
        status = "completed";
      } else if (completedSessions > 0 || week.sessions.some((s) => s.status === "in-progress")) {
        status = "active";
      }

      return {
        id: week.moduleId || String(idx),
        title: week.moduleTitle,
        progress,
        completedUnits: completedSessions,
        totalUnits: totalSessions,
        status,
      };
    });
  }, [weeks, hasRealRoadmap]);

  // If there are no active courses, render the first upcoming one as active for UX clarity
  const activeCourses = useMemo(() => {
    const active = courses.filter((c) => c.status === "active");
    if (active.length > 0) return active;
    const upcoming = courses.filter((c) => c.status === "not_started");
    return upcoming.slice(0, 1);
  }, [courses]);

  const upcomingCourses = useMemo(() => {
    const hasActive = courses.some((c) => c.status === "active");
    const upcoming = courses.filter((c) => c.status === "not_started");
    return hasActive ? upcoming : upcoming.slice(1);
  }, [courses]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ═══ Section 1: Study Plan + Side Stats ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study Plan Card */}
        <Card className="glass border-white/50 shadow-sm lg:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Study Plan Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            {/* Active Plan Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-100/80 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-black text-primary shadow-inner flex-shrink-0 border border-primary/20">
                  {roleName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[pulse_2s_ease-in-out_infinite]" />
                      Active Study Plan
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">{roleName}</h3>
                  <div className="flex items-center gap-4 mt-1.5">
                     <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" /> 
                        <strong className="text-slate-700">{hasRealRoadmap ? earnedStars : MOCK_STUDY_PLAN.totalCups}</strong>/{hasRealRoadmap ? totalStars : MOCK_STUDY_PLAN.maxCups} Trophies
                     </p>
                     <div className="w-1 h-1 rounded-full bg-slate-200" />
                     <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Medal className="w-3.5 h-3.5 text-primary" /> 
                        <strong className="text-slate-700">{hasRealRoadmap ? completedUnits : MOCK_STUDY_PLAN.unitsWith2Cups}</strong>/{hasRealRoadmap ? totalUnits : MOCK_STUDY_PLAN.totalUnits} Units
                     </p>
                  </div>
                </div>
              </div>
              <Link to="/learning" className="relative z-10 flex-shrink-0 w-full sm:w-auto">
                <Button className="w-full sm:w-auto rounded-xl bg-primary shadow-lg shadow-primary/20 text-white hover:bg-primary/90 font-bold px-5 h-10">
                  Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>

            {/* Motivational Banner */}
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100/50 relative overflow-hidden group hover:bg-amber-50 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 group-hover:bg-amber-500 transition-colors" />
              <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 ml-2">
                <Info className="w-4 h-4 text-amber-600" />
                Attention Needed
              </h4>
              <p className="text-xs text-amber-700/80 mt-1.5 leading-relaxed max-w-2xl ml-2 font-medium">
                Your Study Plan compliance hasn't been optimal recently. Try to maintain consistency in your daily learning sessions to hit your target metrics!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right Side Stats */}
        <div className="flex flex-col gap-4">
          {/* Units with 2+ cups */}
          <Card className="glass flex-1 border-white/50 shadow-sm relative overflow-hidden flex flex-col justify-center transition-all hover:shadow-md hover:border-slate-200 group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary" />
                  Units with 2+ cups
                </p>
                <Info className="w-3.5 h-3.5 text-slate-300 hover:text-slate-400 cursor-help transition-colors" />
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 tracking-tight">{hasRealRoadmap ? completedUnits : MOCK_STUDY_PLAN.unitsWith2Cups}</span>
                <span className="text-sm text-slate-400 font-bold">/{hasRealRoadmap ? totalUnits : MOCK_STUDY_PLAN.totalUnits}</span>
              </div>
              {/* Mini progress bar */}
              <div className="h-2.5 bg-slate-100 rounded-full mt-4 overflow-hidden shadow-inner">
                {lessonsCompleted + testsCompleted > 0 ? (
                  <div className="flex h-full">
                    <div className="bg-primary h-full rounded-l-full relative" style={{ width: `${lessonsRatio}%` }}>
                      <div className="absolute inset-0 bg-white/20 w-full" />
                    </div>
                    <div className="bg-emerald-500 h-full rounded-r-full" style={{ width: `${testsRatio}%` }} />
                  </div>
                ) : (
                  <div className="w-0 h-full bg-slate-200" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] font-medium">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 shadow-[0_0_4px_rgba(14,165,233,0.5)]" />
                  <span className="text-slate-500">Lessons</span><strong className="text-slate-800">{lessonsCompleted}</strong>
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                  <span className="text-slate-500">Tests</span><strong className="text-slate-800">{testsCompleted}</strong>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Total Trophies */}
          <Card className="glass flex-1 border-white/50 shadow-sm relative overflow-hidden flex flex-col justify-center transition-all hover:shadow-md hover:border-slate-200 group">
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
            <CardContent className="p-5 relative z-10">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                Total Trophies Earned
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 tracking-tight">{hasRealRoadmap ? earnedStars : MOCK_TROPHY_STATS.totalEarned}</span>
                <span className="text-sm text-slate-400 font-bold">/{hasRealRoadmap ? totalStars : MOCK_TROPHY_STATS.totalPossible}</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full mt-4 overflow-hidden shadow-inner">
                {totalStars > 0 ? (
                  <div className="flex h-full">
                    <div className="bg-amber-500 h-full rounded-l-full relative" style={{ width: `${(earnedStars / totalStars) * 100}%` }}>
                       <div className="absolute inset-0 bg-white/20 w-full" />
                    </div>
                  </div>
                ) : (
                  <div className="w-0 h-full bg-slate-250" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ Section 2: Course Progress (Donut + Recent Courses) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="glass border-white/50 shadow-sm lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-0 flex-shrink-0">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> 
              Course Progress
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary font-bold text-xs hover:bg-primary/5 rounded-lg px-2">
              View all →
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center flex-1 pt-4 pb-6">
             <div className="relative w-full h-[220px]">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie 
                     data={donutData} 
                     cx="50%" 
                     cy="50%" 
                     innerRadius={70} 
                     outerRadius={90} 
                     paddingAngle={5} 
                     dataKey="value" 
                     strokeWidth={0}
                     cornerRadius={8}
                    >
                     {donutData.map((_, idx) => (
                       <Cell key={idx} fill={DONUT_COLORS[idx]} />
                     ))}
                   </Pie>
                   <Tooltip
                     contentStyle={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontSize: "13px", fontWeight: 600, backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", padding: "8px 12px" }}
                     itemStyle={{ color: "#0f172a", paddingTop: 2 }}
                   />
                   <Legend
                     wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                     formatter={(value) => <span className="text-slate-600 font-bold ml-1.5">{value}</span>}
                     iconType="circle"
                   />
                 </PieChart>
               </ResponsiveContainer>
               {/* Center text overlay */}
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-4">
                 <p className="text-4xl font-black text-slate-900 tracking-tight">{moduleProgress.total}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Courses</p>
               </div>
             </div>
          </CardContent>
        </Card>

        {/* Recent Courses list  */}
        <Card className="glass border-white/50 shadow-sm lg:col-span-3 flex flex-col">
          <CardHeader className="pb-5 flex-shrink-0">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
               <Zap className="w-4 h-4 text-emerald-500" />
               Recent Courses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-0 flex-1 flex flex-col">
            <div className="space-y-6 flex-1">
              {activeCourses.map((course) => (
                <div key={course.id} className="space-y-3 group cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">{course.title}</span>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 bg-slate-50/80 px-2.5 py-1 rounded-lg border border-slate-100 group-hover:border-primary/20 transition-colors">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" /> 
                      <span className="text-slate-700">{course.completedUnits}</span>/{course.totalUnits}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100/80 rounded-full overflow-hidden shadow-inner relative">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 relative",
                        course.progress >= 80 ? "bg-emerald-500" : course.progress >= 40 ? "bg-primary" : "bg-amber-500"
                      )}
                      style={{ width: `${course.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {upcomingCourses.length > 0 && (
              <div className="pt-5 border-t border-slate-100/80 mt-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                   <Clock className="w-3.5 h-3.5" /> Upcoming Courses
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {upcomingCourses
                     .slice(0, 2)
                     .map((course) => (
                       <div key={course.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100/80 bg-white/60 hover:bg-white hover:shadow-sm hover:border-slate-200 transition-all cursor-pointer">
                         <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                           <BookOpen className="w-4 h-4 text-slate-500" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-xs font-bold text-slate-800 truncate">{course.title}</p>
                           <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                              <Medal className="w-3 h-3 text-slate-400" /> {course.totalUnits} units
                           </p>
                         </div>
                       </div>
                     ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Section 3: Weekly Average Scores ═══ */}
      <Card className="glass border-white/50 shadow-sm relative overflow-hidden">
        <div className="absolute -top-24 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <CardHeader className="pb-4 relative z-10">
          <CardTitle className="text-base font-bold text-slate-900">Weekly Average Score</CardTitle>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Performance check compared to last week</p>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MOCK_WEEKLY_SCORES.map((skill) => {
              const IconComp = 
                skill.icon === "Monitor" ? <Monitor className="w-5 h-5 text-blue-600" /> :
                skill.icon === "Database" ? <Database className="w-5 h-5 text-emerald-600" /> :
                skill.icon === "ServerCog" ? <ServerCog className="w-5 h-5 text-amber-600" /> :
                <Users className="w-5 h-5 text-indigo-600" />;

              const iconBgRaw = 
                skill.icon === "Monitor" ? "bg-blue-50" :
                skill.icon === "Database" ? "bg-emerald-50" :
                skill.icon === "ServerCog" ? "bg-amber-50" : "bg-indigo-50";

              return (
                <div
                  key={skill.name}
                  className="p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-slate-200 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-800">{skill.name}</span>
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", iconBgRaw)}>
                      {IconComp}
                    </div>
                  </div>
                  {skill.score !== null ? (
                    <>
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-4xl font-black text-slate-900 tracking-tight">{skill.score}</span>
                        {skill.trend && (
                          <span className={cn(
                            "flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-bold",
                            skill.trend.isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                          )}>
                            {skill.trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {skill.trend.isUp ? "↑" : "↓"}{skill.trend.value}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-2">
                        {skill.testsCompleted} test{skill.testsCompleted > 1 ? "s" : ""} completed
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-black text-slate-200 tracking-tight">–.–</span>
                      <p className="text-[11px] text-slate-400 font-medium mt-2">No data yet</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Section 4: Score Tracking Area Chart ═══ */}
      <Card className="glass border-white/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-emerald-500" />
                 Score Tracking Trajectory
              </CardTitle>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Evolution of your scores over the last 30 tests</p>
            </div>
            <div className="flex items-center gap-4 text-xs flex-wrap bg-slate-50/80 px-4 py-2 rounded-xl border border-slate-100">
              {[
                { color: "#10b981", label: "Frontend", id: "frontend" },
                { color: "#3b82f6", label: "Backend", id: "backend" },
                { color: "#f59e0b", label: "Soft Skills", id: "softSkills" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <ResponsiveContainer width={undefined} aspect={3.5} className="min-h-[250px] w-full">
            <AreaChart data={MOCK_SCORE_TRACKING} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreFrontend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                </linearGradient>
                <linearGradient id="scoreBackend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                </linearGradient>
                <linearGradient id="scoreSoftSkills" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="test" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip
                contentStyle={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontSize: "13px", fontWeight: 600, backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", padding: "12px 16px" }}
                itemStyle={{ color: "#0f172a", paddingTop: 4, paddingBottom: 4 }}
              />
              <Area type="monotone" dataKey="frontend" name="Frontend" stroke="#10b981" fillOpacity={1} fill="url(#scoreFrontend)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="backend" name="Backend" stroke="#3b82f6" fillOpacity={1} fill="url(#scoreBackend)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="softSkills" name="Soft Skills" stroke="#f59e0b" fillOpacity={1} fill="url(#scoreSoftSkills)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ═══ Section 5: AI Insights ═══ */}
      <Card className="glass border-white/50 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 w-[500px] h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <CardHeader className="pb-4 border-b border-slate-100/50 bg-slate-50/50">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-lg bg-emerald-100/50 flex items-center justify-center">
               <Sparkles className="w-4 h-4 text-emerald-600" />
             </div>
             AI Feedback Synthesis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5 relative z-10">
          {MOCK_AI_INSIGHTS.map((insight, idx) => (
            <div key={idx} className={cn(
              "p-4 rounded-xl border relative overflow-hidden transition-shadow hover:shadow-md",
              insight.sentiment === "positive" ? "bg-gradient-to-r from-emerald-50/80 to-transparent border-emerald-100/60" :
              insight.sentiment === "warning" ? "bg-gradient-to-r from-amber-50/80 to-transparent border-amber-100/60" : "bg-slate-50 border-slate-100"
            )}>
              <div className={cn(
                 "absolute left-0 top-0 bottom-0 w-1",
                 insight.sentiment === "positive" ? "bg-emerald-400" :
                 insight.sentiment === "warning" ? "bg-amber-400" : "bg-slate-300"
              )} />
              <div className="ml-3">
                 <h4 className="text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-2">
                    {insight.sentiment === "positive" ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <Info className="w-4 h-4 text-amber-500" />}
                    {insight.skill}
                 </h4>
                 <p className="text-[13px] text-slate-600 font-medium leading-relaxed">{insight.feedback}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ═══ Section 6: Learning History Timeline ═══ */}
      <div className="pt-2">
        <LearningHistoryTimeline entries={MOCK_LEARNING_HISTORY} />
      </div>
    </div>
  );
}