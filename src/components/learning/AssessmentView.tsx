import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardCheck, Clock, HelpCircle, Trophy, RotateCcw,
  TrendingUp, Target, ChevronRight, Sparkles, Star, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SKILL_RADAR_DATA, ASSESSMENT_MODULES, JD_MATCH_PROGRESS,
  type AssessmentModule
} from "@/lib/mock-data/assessment";
import AssessmentDetail from "./AssessmentDetail";

/* ═══════════════════════════════════════════════════════════ */
/*  Skill Radar Chart (SVG-based, no external lib)            */
/* ═══════════════════════════════════════════════════════════ */
function SkillRadarChart() {
  const data = SKILL_RADAR_DATA;
  const cx = 150, cy = 150, R = 110;
  const n = data.length;
  const levels = [20, 40, 60, 80, 100];

  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointAt = (i: number, v: number) => {
    const a = angleFor(i);
    const r = (v / 100) * R;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const polygon = (values: number[]) =>
    values.map((v, i) => { const p = pointAt(i, v); return `${p.x},${p.y}`; }).join(" ");

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <div className="w-3 h-3 rounded-sm bg-slate-200/60" /> Before (Diagnosis)
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <div className="w-3 h-3 rounded-sm bg-primary/30" /> After (Current)
        </div>
      </div>

      <svg viewBox="0 0 300 300" className="w-full max-w-[320px]">
        {/* Grid rings */}
        {levels.map(lv => (
          <polygon
            key={lv}
            points={Array.from({ length: n }, (_, i) => {
              const p = pointAt(i, lv);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={lv === 100 ? 1.5 : 0.8}
          />
        ))}

        {/* Axes */}
        {data.map((_, i) => {
          const p = pointAt(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={0.8} />;
        })}

        {/* Before polygon */}
        <polygon
          points={polygon(data.map(d => d.before))}
          fill="rgba(148,163,184,0.15)"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* After polygon */}
        <polygon
          points={polygon(data.map(d => d.after))}
          fill="rgba(59,130,246,0.12)"
          stroke="#3b82f6"
          strokeWidth={2}
        />

        {/* After dots */}
        {data.map((d, i) => {
          const p = pointAt(i, d.after);
          return <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={4} fill="#3b82f6" stroke="white" strokeWidth={2} />;
        })}

        {/* Labels */}
        {data.map((d, i) => {
          const p = pointAt(i, 120);
          return (
            <text
              key={`label-${i}`}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-bold fill-slate-600"
            >
              {d.skill}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  JD Match Progress Bar                                     */
/* ═══════════════════════════════════════════════════════════ */
function JDMatchProgress() {
  const { initial, current, target } = JD_MATCH_PROGRESS;
  const improvement = current - initial;
  const matchColor = current >= 80 ? "text-emerald-600" : current >= 50 ? "text-amber-600" : "text-red-500";
  const barColor = current >= 80 ? "bg-emerald-500" : current >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card className="p-5 border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-slate-900 text-sm">JD Match Score</h3>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
          <TrendingUp className="w-3 h-3 mr-1" /> +{improvement}% improvement
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="relative mt-7">
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          {/* Initial mark */}
          <div
            className="absolute h-3 rounded-full bg-slate-300/50 z-0"
            style={{ width: `${initial}%` }}
          />
          {/* Current */}
          <div
            className={cn("absolute h-3 rounded-full z-10 transition-all duration-1000", barColor)}
            style={{ width: `${current}%` }}
          />
        </div>
        {/* Target marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-slate-700 z-20"
          style={{ left: `${target}%` }}
        />
        <div
          className="absolute -top-6 text-[10px] font-bold text-slate-500 -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${target}%` }}
        >
          Target: {target}%
        </div>
      </div>

      <div className="flex justify-between mt-3 text-xs">
        <span className="text-slate-400">Initial: <strong>{initial}%</strong></span>
        <span className={cn("font-bold", matchColor)}>Current: {current}%</span>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Assessment Module Card                                    */
/* ═══════════════════════════════════════════════════════════ */
const SKILL_CARD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "TypeScript":        { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200" },
  "React":             { bg: "bg-cyan-50",    text: "text-cyan-700",   border: "border-cyan-200" },
  "State Management":  { bg: "bg-violet-50",  text: "text-violet-700", border: "border-violet-200" },
  "Testing":           { bg: "bg-rose-50",    text: "text-rose-700",   border: "border-rose-200" },
  "DevOps":            { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200" },
  "System Design":     { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

function AssessmentCard({ module, onStart }: { module: AssessmentModule; onStart: (id: string) => void }) {
  const colors = SKILL_CARD_COLORS[module.skill] || { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
  const isCompleted = module.status === "completed";
  const isLocked = module.status === "not-started";

  const gradeColors: Record<string, string> = {
    "A+": "text-emerald-600 bg-emerald-50 border-emerald-200",
    "A":  "text-emerald-600 bg-emerald-50 border-emerald-200",
    "B":  "text-blue-600 bg-blue-50 border-blue-200",
    "C":  "text-amber-600 bg-amber-50 border-amber-200",
    "F":  "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <Card className={cn(
      "p-5 transition-all border",
      isCompleted && "border-emerald-200 bg-emerald-50/30",
      !isCompleted && !isLocked && "border-primary/30 bg-primary/5 shadow-sm",
      isLocked && "border-slate-100 hover:border-slate-200 hover:shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <Badge className={cn("text-[10px] px-2 py-0.5 border font-semibold", colors.bg, colors.text, colors.border)}>
          {module.skill}
        </Badge>
        {isCompleted && module.grade && (
          <Badge className={cn("text-sm font-black px-2.5 py-0.5 border", gradeColors[module.grade] || "")}>
            {module.grade}
          </Badge>
        )}
        {!isCompleted && !isLocked && (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold animate-pulse">
            Ready
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="font-bold text-slate-900 text-sm mb-1 leading-snug">{module.title}</h3>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-2">{module.description}</p>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> {module.totalQuestions} questions
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {module.timeMinutes} min
        </span>
        {module.attempts > 0 && (
          <span className="flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> {module.attempts} attempt{module.attempts > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Score bar (if completed) */}
      {isCompleted && module.score !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 font-medium">Score</span>
            <span className="font-bold text-slate-700">{module.score}%</span>
          </div>
          <Progress value={module.score} className="h-2" />
        </div>
      )}

      {/* Button */}
      <Button
        onClick={() => onStart(module.id)}
        className={cn(
          "w-full rounded-xl text-sm font-semibold h-10",
          isCompleted
            ? "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            : "bg-primary text-white hover:bg-primary/90"
        )}
      >
        {isCompleted ? (
          <><RotateCcw className="w-4 h-4 mr-2" /> Retake Assessment</>
        ) : (
          <><ClipboardCheck className="w-4 h-4 mr-2" /> Start Assessment</>
        )}
      </Button>

      {isCompleted && module.completedAt && (
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Completed on {module.completedAt}
        </p>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Main Assessment View                                      */
/* ═══════════════════════════════════════════════════════════ */
export default function AssessmentView() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Stats
  const completedCount = ASSESSMENT_MODULES.filter(m => m.status === "completed").length;
  const totalCount = ASSESSMENT_MODULES.length;
  const avgScore = ASSESSMENT_MODULES
    .filter(m => m.score !== undefined)
    .reduce((acc, m) => acc + (m.score || 0), 0) / (completedCount || 1);

  const handleStartAssessment = (id: string) => {
    setSelectedModule(id);
  };

  // If a module is selected, show the assessment detail
  if (selectedModule) {
    return (
      <AssessmentDetail
        assessmentId={selectedModule}
        onBack={() => setSelectedModule(null)}
        onComplete={() => setSelectedModule(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Completed</p>
            <p className="text-lg font-black text-slate-900">{completedCount}/{totalCount}</p>
          </div>
        </Card>

        <Card className="p-4 border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Average Score</p>
            <p className="text-lg font-black text-slate-900">{completedCount > 0 ? `${Math.round(avgScore)}%` : "—"}</p>
          </div>
        </Card>

        <Card className="p-4 border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Skill Growth</p>
            <p className="text-lg font-black text-emerald-600">+{JD_MATCH_PROGRESS.current - JD_MATCH_PROGRESS.initial}%</p>
          </div>
        </Card>
      </div>

      {/* ── JD Match + Radar side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <Card className="p-5 border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-900 text-sm">Skill Growth Map</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Compare your skills before (Diagnosis) and after (Assessment results)
          </p>
          <SkillRadarChart />
        </Card>

        {/* JD Match */}
        <div className="space-y-4">
          <JDMatchProgress />

          {/* AI Insight */}
          <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-violet-50">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">AI Insight</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Great progress on TypeScript! Your score jumped from 35% to 78%. Focus on <strong>Testing</strong> and <strong>DevOps</strong> next — these are the biggest gaps to meet the JD requirements.
                </p>
                <Button variant="ghost" size="sm" className="mt-2 text-primary font-semibold text-xs px-0 h-auto hover:bg-transparent">
                  View detailed analysis <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Warning if behind */}
          {JD_MATCH_PROGRESS.current < JD_MATCH_PROGRESS.target && (
            <Card className="p-4 border-amber-200 bg-amber-50/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-800 font-semibold">
                    You need {JD_MATCH_PROGRESS.target - JD_MATCH_PROGRESS.current}% more to reach the JD target.
                    Complete the remaining assessments to improve your match score!
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Assessment Modules Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Module Assessments
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {completedCount} of {totalCount} completed
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ASSESSMENT_MODULES.map(module => (
            <AssessmentCard
              key={module.id}
              module={module}
              onStart={handleStartAssessment}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
