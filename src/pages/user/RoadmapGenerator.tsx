// pages/RoadmapGenerator.tsx
// Generates an AI learning roadmap from detected skill gaps.
// AI requests go through the backend API, so no client-side AI key is required.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMascotLoading, useMascotSuccess } from "@/hooks/useMascot";
import {
  Sparkles, ChevronRight, Clock, BookOpen, Target, AlertCircle,
  CheckCircle2, Zap, Brain, Calendar, RefreshCw,
} from "lucide-react";
import {
  generateRoadmapWithAI,
  roadmapToWeekPlans,
  type SkillGap,
  type GeneratedRoadmap,
} from "@/components/learning/ai-roadmap";
import { ALL_COURSES } from "@/components/learning/Courses-data";
import { useRoadmapStore } from "@/components/learning/roadmap-store";

// ─── Level badge colors ───────────────────────────────────────────────────────
const LEVEL_STYLE = {
  Beginner:     "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-blue-50 text-blue-700 border-blue-200",
  Advanced:     "bg-purple-50 text-purple-700 border-purple-200",
};

// ─── Mock skill gaps (replace with real data from diagnosis store) ─────────────
const DEMO_GAPS: SkillGap[] = [
  { skill: "React",       currentLevel: 40, requiredLevel: 90, priority: "high" },
  { skill: "TypeScript",  currentLevel: 20, requiredLevel: 80, priority: "high" },
  { skill: "Node.js",     currentLevel: 30, requiredLevel: 75, priority: "medium" },
  { skill: "Testing",     currentLevel: 10, requiredLevel: 70, priority: "medium" },
  { skill: "Docker",      currentLevel: 0,  requiredLevel: 60, priority: "low" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function RoadmapGenerator() {
  const navigate = useNavigate();
  const { setGeneratedRoadmap, setWeekPlans } = useRoadmapStore();
  const { show: showLoading, hide: hideLoading } = useMascotLoading();
  const { celebrate } = useMascotSuccess();

  // Try to get skill gaps from diagnosis store; fall back to demo
  const [gaps] = useState<SkillGap[]>(DEMO_GAPS);
  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<GeneratedRoadmap | null>(null);
  const [applied, setApplied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setRoadmap(null);
    showLoading("AI đang xây lộ trình học cho bạn...");
    try {
      const result = await generateRoadmapWithAI(gaps, targetRole, hoursPerWeek);
      setRoadmap(result);
      setLoading(false);
      // celebrate() overwrites the loading overlay with the success dolphin,
      // which then auto-dismisses — so we must NOT call hideLoading() here.
      celebrate("Lộ trình học đã sẵn sàng! 🎉");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Generation failed");
      setLoading(false);
      hideLoading();
    }
  };

  const handleApply = () => {
    if (!roadmap) return;
    const weekPlans = roadmapToWeekPlans(roadmap);
    setGeneratedRoadmap(roadmap);
    setWeekPlans(weekPlans);
    setApplied(true);
    celebrate("Đã áp dụng lộ trình vào lịch học! 📚");
    setTimeout(() => navigate("/learning"), 1200);
  };

  return (
    <Layout hideFooter>
      <div className="max-w-[900px] mx-auto px-4 py-8 space-y-8">

        {/* ── Header ── */}
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <button onClick={() => navigate("/diagnosis")} className="hover:text-primary transition-colors">
              Diagnosis
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-800 font-semibold">AI Roadmap Generator</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Generate Your Learning Roadmap</h1>
          <p className="text-slate-500 text-sm">
            AI analyses your skill gaps and builds a personalised study plan from our course library.
          </p>
        </header>

        {/* ── Two-col layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* ── Left: Config + Result ── */}
          <div className="space-y-6">

            {/* Skill gaps from diagnosis */}
            <Card className="p-5 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-500" /> Skill Gaps Detected
                </h2>
                <button
                  onClick={() => navigate("/diagnosis")}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Re-run diagnosis →
                </button>
              </div>
              <div className="space-y-2.5">
                {gaps.map(gap => (
                  <div key={gap.skill} className="flex items-center gap-3">
                    <span className="w-28 text-sm font-medium text-slate-700 flex-shrink-0">{gap.skill}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-300 rounded-full relative" style={{ width: `${gap.requiredLevel}%` }}>
                        <div
                          className={cn("absolute left-0 top-0 h-full rounded-full",
                            gap.priority === "high" ? "bg-rose-400" :
                            gap.priority === "medium" ? "bg-amber-400" : "bg-slate-400"
                          )}
                          style={{ width: `${(gap.currentLevel / gap.requiredLevel) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 w-20 text-right flex-shrink-0">
                      {gap.currentLevel}% → {gap.requiredLevel}%
                    </span>
                    <Badge className={cn("text-[10px] px-2 py-0 border font-semibold flex-shrink-0",
                      gap.priority === "high" ? "bg-rose-50 text-rose-600 border-rose-200" :
                      gap.priority === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" :
                      "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                      {gap.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Config */}
            <Card className="p-5 border border-slate-200 rounded-2xl space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" /> Generation Config
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Target Role</label>
                  <input
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="e.g. Full-Stack Developer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Hours / week: <span className="text-primary">{hoursPerWeek}h</span>
                  </label>
                  <input
                    type="range" min={4} max={40} step={2} value={hoursPerWeek}
                    onChange={e => setHoursPerWeek(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>4h (casual)</span><span>20h (intensive)</span><span>40h (bootcamp)</span>
                  </div>
                </div>
              </div>

              {/* Generation error */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full h-11 rounded-xl font-bold text-sm shadow-md gap-2"
              >
                {loading ? (
                  <>AI đang xây lộ trình...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate AI Roadmap</>
                )}
              </Button>
            </Card>

            {/* ── AI Result ── */}
            {roadmap && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Summary card */}
                <Card className="p-5 border border-primary/20 bg-primary/[0.03] rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-primary">AI Roadmap Ready</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{roadmap.title}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-2xl font-black text-slate-900">{roadmap.totalWeeks}w</span>
                      <span className="text-xs text-slate-400">{roadmap.totalHours}h total</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{roadmap.summary}</p>
                </Card>

                {/* Course list */}
                <div className="space-y-3">
                  {roadmap.courses.map((course, idx) => {
                    const full = ALL_COURSES.find(c => c.id === course.courseId);
                    return (
                      <div key={course.courseId}
                        className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all"
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0", full?.color ?? "bg-slate-400")}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-bold text-slate-900">{course.courseName}</span>
                            <Badge className={cn("text-[10px] border font-semibold px-2", LEVEL_STYLE[course.level as keyof typeof LEVEL_STYLE] ?? "bg-slate-50 text-slate-600 border-slate-200")}>
                              {course.level}
                            </Badge>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{course.estimatedHours}h · Week {course.weekNumber}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{course.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI advice */}
                <Card className="p-5 border border-amber-100 bg-amber-50/50 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-amber-800">AI Learning Tips</span>
                  </div>
                  <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">{roadmap.aiAdvice}</p>
                </Card>

                {/* CTA */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleApply}
                    disabled={applied}
                    className={cn(
                      "flex-1 h-12 rounded-xl font-bold text-sm shadow-lg gap-2 transition-all",
                      applied && "bg-emerald-500 hover:bg-emerald-500"
                    )}
                  >
                    {applied ? (
                      <><CheckCircle2 className="w-4 h-4" /> Applied! Redirecting to Learning...</>
                    ) : (
                      <><Calendar className="w-4 h-4" /> Apply to My Schedule</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={loading}
                    className="h-12 rounded-xl border-slate-200 px-4"
                  >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Course library preview ── */}
          <div className="space-y-4">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-400" /> Course Library ({ALL_COURSES.length})
              </h2>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {ALL_COURSES.map(course => (
                  <div key={course.id}
                    className={cn(
                      "flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all",
                      roadmap?.courses.some(rc => rc.courseId === course.id) && "border-primary/30 bg-primary/[0.02] ring-1 ring-primary/10"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-black flex-shrink-0", course.color)}>
                      {course.shortName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{course.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">{course.level}</span>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400">{course.estimatedHours}h</span>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400">{course.sessions.length} sessions</span>
                      </div>
                    </div>
                    {roadmap?.courses.some(rc => rc.courseId === course.id) && (
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
