// ─── Results View ────────────────────────────────────
// Extracted from Interview.tsx for better code splitting
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Clock, RefreshCw, Sparkles, BarChart3, Smile, UserCheck, Shield, Mic,
  AlertCircle, ArrowRight, TrendingUp, Star, Bot, CheckCircle2, History,
} from "lucide-react";
import { MOCK_INTERVIEW_RESULT } from "@/lib/mock-data/interview";

interface ResultsViewProps {
  onRetry: () => void;
  duration?: number; // seconds
}

export function ResultsView({ onRetry, duration }: ResultsViewProps) {
  const r = MOCK_INTERVIEW_RESULT;
  const [activeTab, setActiveTab] = useState<'strengths' | 'improve'>('strengths');

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">

      {/* ═══ Hero Score Section ═══ */}
      <div className="rounded-xl bg-white border border-slate-200 p-8 text-slate-900 shadow-sm relative overflow-hidden">

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Donut Score */}
          <div className="relative">
            <svg viewBox="0 0 120 120" className="w-36 h-36 relative z-10">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none"
                stroke={r.overallScore >= 80 ? '#10b981' : r.overallScore >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(r.overallScore / 100) * 327} 327`}
                transform="rotate(-90 60 60)"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <span className="text-4xl font-black">{r.overallScore}%</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-bold">Overall</span>
            </div>
          </div>

          {/* Sub metrics */}
          <div className="flex-1 grid grid-cols-3 gap-3">
            {[
              { label: "Confidence", value: r.confidenceLevel, icon: TrendingUp },
              { label: "Clarity", value: r.clarityScore, icon: Star },
              { label: "Expression", value: r.facialFeedback, icon: Smile },
            ].map((m, i) => (
              <div key={i} className="rounded-xl bg-slate-50 border border-slate-100 p-5 text-center transition-colors hover:border-slate-300">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <m.icon className="w-4 h-4 text-slate-600" />
                </div>
                <p className="text-xl font-black">{m.value}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] mt-1 font-bold">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Duration badge */}
        {duration != null && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
          </div>
        )}
      </div>

      {/* ═══ Skills Radar + Summary ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <Card className="bg-white border-slate-200 shadow-sm md:col-span-2 flex flex-col group">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center transition-colors">
                <BarChart3 className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Skills Radar</CardTitle>
                <CardDescription className="text-[11px] font-medium text-slate-500">Competency overview</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center items-center flex-1 pb-4 relative">
            <RadarChart data={[
              { label: "Technical", value: Math.round((r.technicalDelivery.conceptAccuracy + r.technicalDelivery.problemSolvingLogic + r.technicalDelivery.systemThinking + r.technicalDelivery.codeQuality) / 4) },
              { label: "Comms", value: Math.round((r.communicationFlow.articulation + r.communicationFlow.listeningResponse + r.communicationFlow.structuredAnswers) / 3) },
              { label: "Confidence", value: r.overallScore },
              { label: "Body Lang", value: Math.round((r.bodyLanguage.eyeContact + r.bodyLanguage.posture + r.bodyLanguage.gestures + r.bodyLanguage.facialExpressions) / 4) },
              { label: "Filler Words", value: r.communicationFlow.fillerWordMinimalist },
              { label: "Time Mgmt", value: Math.min(100, Math.round(100 - (r.timeManagement.averageResponseTime - 60) / 2)) },
            ]} />
          </CardContent>
        </Card>

        {/* Strengths / Improve Tabs */}
        <Card className="bg-white border-slate-200 shadow-sm md:col-span-3 flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('strengths')}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'strengths' ? "bg-slate-100 text-slate-900 border border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent"
                )}
              >
                <CheckCircle2 className="w-4 h-4" /> Strengths
              </button>
              <button
                onClick={() => setActiveTab('improve')}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'improve' ? "bg-slate-100 text-slate-900 border border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent"
                )}
              >
                <TrendingUp className="w-4 h-4" /> Areas for Improvement
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <ul className="space-y-3">
              {(activeTab === 'strengths' ? r.strengths : r.areasToImprove).map((item, i) => (
                <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm hover:border-slate-200 transition-all cursor-default">
                  <span className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                    activeTab === 'strengths' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {i + 1}
                  </span>
                  <span className="leading-relaxed font-medium text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Detailed Performance ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="bg-white border-slate-200 shadow-sm group">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-[15px] font-bold">Technical Delivery</CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">Core technical competencies</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4 pb-5">
            <MetricBar label="Concept Accuracy" value={r.technicalDelivery.conceptAccuracy} />
            <MetricBar label="Problem Solving" value={r.technicalDelivery.problemSolvingLogic} />
            <MetricBar label="System Thinking" value={r.technicalDelivery.systemThinking} />
            <MetricBar label="Code Quality" value={r.technicalDelivery.codeQuality} />
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm group">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                <Mic className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-[15px] font-bold">Communication Flow</CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">Verbal delivery analysis</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4 pb-5">
            <MetricBar label="Articulation" value={r.communicationFlow.articulation} />
            <MetricBar label="Listening" value={r.communicationFlow.listeningResponse} />
            <MetricBar label="Filler Words" value={r.communicationFlow.fillerWordMinimalist} />
            <MetricBar label="Structured Answers" value={r.communicationFlow.structuredAnswers} />
          </CardContent>
        </Card>
      </div>

      {/* ═══ Body Language + Time Management ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="bg-white border-slate-200 shadow-sm group">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-[15px] font-bold">Body Language</CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">Non-verbal communication</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4 pb-5">
            <MetricBar label="Eye Contact" value={r.bodyLanguage.eyeContact} />
            <MetricBar label="Posture" value={r.bodyLanguage.posture} />
            <MetricBar label="Gestures" value={r.bodyLanguage.gestures} />
            <MetricBar label="Facial Expressions" value={r.bodyLanguage.facialExpressions} />
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm group">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-[15px] font-bold">Time Management</CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">Session timing breakdown</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3 h-full pb-1">
              {[
                { label: "Avg Response", value: `${Math.floor(r.timeManagement.averageResponseTime / 60)}:${(r.timeManagement.averageResponseTime % 60).toString().padStart(2, '0')}`, color: "text-slate-900" },
                { label: "Total Duration", value: `${Math.floor(r.timeManagement.totalDuration / 60)}m`, color: "text-slate-900" },
                { label: "Answered", value: String(r.timeManagement.questionsAnswered), color: "text-slate-900" },
                { label: "Skipped", value: String(r.timeManagement.questionsSkipped), color: "text-slate-500" },
              ].map((stat, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center flex flex-col justify-center transition-all duration-300">
                  <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Question-by-Question ═══ */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <History className="w-4 h-4 text-slate-600" />
            </div>
            <CardTitle className="text-[15px] font-bold">Question-by-Question Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
          {r.questionAnalysis.map((q, i) => (
            <div key={i} className="p-5 hover:bg-slate-50/50 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 mt-1">
                    <p className="text-[15px] font-semibold text-slate-900 leading-snug">{q.question}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {q.strengths.map((s, j) => (
                        <span key={j} className="inline-flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-md font-medium" title={s}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> {s}
                        </span>
                      ))}
                      {q.improvements.map((im, j) => (
                        <span key={j} className="inline-flex items-center justify-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-md font-medium" title={im}>
                          <AlertCircle className="w-3.5 h-3.5" /> {im}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 ml-4 gap-1 mt-1">
                  <span className={cn(
                    "text-lg font-black px-3 py-1 rounded-lg",
                    q.score >= 85 ? "text-emerald-600" :
                    q.score >= 70 ? "text-amber-600" :
                    "text-red-600"
                  )}>
                    {q.score}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1">
                    <Clock className="w-3 h-3" /> {Math.floor(q.timeTaken / 60)}:{(q.timeTaken % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ═══ AI Feedback ═══ */}
      <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200 text-slate-900 shadow-sm relative mt-8">
        <div className="relative z-10 p-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-start">
            <div className="w-12 h-12 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="text-[17px] font-bold text-slate-900 flex items-center gap-2">
                AI Feedback & Recommendations
                <Sparkles className="w-4 h-4 text-primary" />
              </h3>
              <p className="text-slate-700 text-[14px] leading-relaxed bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
                "{r.aiFeedback}"
              </p>
            </div>
          </div>
          
          <div className="pt-4 md:pl-[4.5rem] border-t border-slate-200">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-3">Suggested Learning Modules</p>
            <div className="flex flex-wrap gap-2">
              {r.recommendedModules.map((mod, i) => (
                <span key={i} className="px-3 py-1.5 bg-white rounded-md text-[13px] font-semibold text-slate-700 border border-slate-200 shadow-sm hover:border-slate-300 transition-colors cursor-pointer">
                  {mod}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6 md:pl-[4.5rem]">
            <Button
              size="lg"
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-semibold flex-1 h-11"
              onClick={onRetry}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
            <Button size="lg" variant="outline" className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700 rounded-lg font-semibold flex-1 h-11">
              Adjust Roadmap <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small UI Components ────────────────────────────────

function MetricBar({ label, value }: { label: string; value: number }) {
  const barColor = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = value >= 80 ? 'text-emerald-700' : value >= 60 ? 'text-amber-700' : 'text-red-700';
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center group">
        <span className="font-semibold text-slate-700 text-[13px]">{label}</span>
        <span className={cn("font-bold text-sm tabular-nums text-right", textColor)}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000", barColor)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Radar Chart (SVG) ──────────────────────────────
function RadarChart({ data }: { data: { label: string; value: number }[] }) {
  const cx = 120, cy = 120, r = 90;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (i: number, val: number) => {
    const angle = i * angleStep - Math.PI / 2;
    return {
      x: cx + (r * val / 100) * Math.cos(angle),
      y: cy + (r * val / 100) * Math.sin(angle),
    };
  };

  const polygon = data.map((d, i) => {
    const p = getPoint(i, d.value);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 240 240" className="w-72 h-72">
        {/* Grid circles */}
        {[25, 50, 75, 100].map((pct) => (
          <circle key={pct} cx={cx} cy={cy} r={r * pct / 100}
            fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
        ))}
        {/* Axis lines + labels */}
        {data.map((d, i) => {
          const p = getPoint(i, 100);
          const lp = getPoint(i, 115);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="0.5" />
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
                className="fill-slate-500" fontSize="8" fontWeight="600">
                {d.label}
              </text>
            </g>
          );
        })}
        {/* Data polygon */}
        <polygon points={polygon} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
        {/* Data dots */}
        {data.map((d, i) => {
          const p = getPoint(i, d.value);
          return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3b82f6" />;
        })}
      </svg>
    </div>
  );
}
