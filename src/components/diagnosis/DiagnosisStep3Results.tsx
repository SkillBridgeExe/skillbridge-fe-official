import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertCircle, X, ArrowLeft, ArrowRight, Share2, Download,
  Sparkles, TrendingUp, Target, Lightbulb, Zap, Shield, Code, Users, RotateCcw, Trophy
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip
} from "recharts";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import type { SkillMatchItem } from "@shared/api";

const MAX_INSIGHT_ITEMS = 3;

function truncateText(value: string, maxLength = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/* ── CountUpCircle ── */
const CountUpCircle = React.memo(function CountUpCircle({ target, size = 192, label = "Match" }: { target: number; size?: number; label?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const circumference = 2 * Math.PI * 80;

  useEffect(() => {
    if (prefersReducedMotion) { setDisplayed(target); return; }
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setDisplayed(Math.round(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, prefersReducedMotion]);

  const dashOffset = circumference - (circumference * displayed) / 100;
  const color = displayed >= 80 ? "#10b981" : displayed >= 50 ? "#f59e0b" : "#ef4444";
  const glowFilter = displayed >= 80 ? "drop-shadow(0 0 12px rgba(16,185,129,0.5))" : "none";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${target}%`}>
      <svg className="-rotate-90" width={size} height={size} style={{ filter: glowFilter }}>
        <circle cx={size / 2} cy={size / 2} r={80} stroke="#e2e8f0" strokeWidth={12} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={80} stroke={color} strokeWidth={12} fill="none" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" style={{ transition: prefersReducedMotion ? "none" : "stroke-dashoffset 0.016s linear" }} />
      </svg>
      <div className="absolute text-center">
        <span className="text-5xl font-black text-slate-900 leading-none">{displayed}%</span>
        <span className="block text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
});

/* ── KeywordRow ── */
function KeywordRow({ skill, index }: { skill: SkillMatchItem; index: number }) {
  const statusConfig = {
    present: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Found" },
    partial:  { icon: <AlertCircle  className="w-4 h-4 text-amber-500"   />, badge: "bg-amber-50 text-amber-700 border-amber-200",   label: "Partial" },
    missing:  { icon: <X            className="w-4 h-4 text-red-400"      />, badge: "bg-red-50 text-red-700 border-red-200",         label: "Missing" },
  }[skill.status];

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0 animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}>
      <div className="w-6 flex justify-center shrink-0">{statusConfig.icon}</div>
      <span className="flex-1 text-sm font-medium text-slate-800 truncate pr-4">{skill.name}</span>
      <div className="flex items-center gap-3 w-40 shrink-0">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-700", skill.status === "present" ? "bg-emerald-400" : skill.status === "partial" ? "bg-amber-400" : "bg-red-300")} style={{ width: `${skill.cvScore}%`, transitionDelay: `${index * 60}ms` }} />
        </div>
        <span className="text-xs text-slate-500 w-9 text-right shrink-0">{skill.cvScore}%</span>
      </div>
      <div className="w-24 shrink-0 flex justify-end md:justify-center">
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border w-[72px] text-center", statusConfig.badge)}>{statusConfig.label}</span>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function DiagnosisStep3Results() {
  const { goBack, scanAgain, skillTab, setSkillTab, reviewData } = useDiagnosisStore();

  const jdMatch = reviewData?.jdMatch;
  const isJdMode = Boolean(jdMatch);
  const fallbackHardSkills: SkillMatchItem[] = [];
  const fallbackSoftSkills: SkillMatchItem[] = [];

  const hardSkills = jdMatch?.hardSkills ?? fallbackHardSkills;
  const softSkills = jdMatch?.softSkills ?? fallbackSoftSkills;
  const activeSkills = skillTab === "hard" ? hardSkills : softSkills;
  const radarData = jdMatch?.radar ?? [];
  const strengths = (reviewData?.strengths ?? []).slice(0, MAX_INSIGHT_ITEMS).map((item) => truncateText(item));
  const criticalGaps = (jdMatch?.criticalGaps ?? reviewData?.issues.slice(0, MAX_INSIGHT_ITEMS).map((issue) => issue.title) ?? [])
    .slice(0, MAX_INSIGHT_ITEMS)
    .map((item) => truncateText(item));
  const actionPlan = (reviewData?.actionPlan ?? []).slice(0, MAX_INSIGHT_ITEMS).map((item) => truncateText(item));

  const matchScore = jdMatch?.matchScore ?? reviewData?.overallScore ?? 0;
  const scoreLabel = isJdMode ? "Match" : "CV Score";
  const presentCount = hardSkills.filter((s) => s.status === "present").length;
  const missingCount = hardSkills.filter((s) => s.status === "missing").length;
  const partialCount = hardSkills.filter((s) => s.status === "partial").length;

  /* ── Confetti for high scores ── */
  const confettiFired = useRef(false);
  useEffect(() => {
    if (matchScore >= 85 && !confettiFired.current) {
      confettiFired.current = true;
      import("canvas-confetti").then((mod) => {
        const fire = mod.default;
        fire({ particleCount: 120, spread: 80, origin: { y: 0.6 }, zIndex: 9999 });
        setTimeout(() => fire({ particleCount: 60, spread: 100, origin: { y: 0.5 }, zIndex: 9999 }), 300);
      }).catch(() => { /* silent — confetti is optional */ });
    }
  }, [matchScore]);

  /* ── Dynamic UX copy ── */
  const scoreMessage = matchScore >= 85
    ? "Outstanding profile. Your CV is highly competitive and ready for top-tier applications."
    : matchScore >= 80
      ? "Strong profile. Minor improvements can make your CV even sharper."
      : matchScore >= 50
        ? "Decent baseline. Improve quantified impact and clarity to stand out."
        : "Your CV needs major improvements. Prioritize action-plan items before applying broadly.";

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-600">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button onClick={goBack} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to CV Review
        </button>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="rounded-full gap-2 text-xs font-semibold border-slate-200">
            <Share2 className="w-3.5 h-3.5" /> Share Result
          </Button>
          <Button variant="outline" size="sm" className="rounded-full gap-2 text-xs font-semibold border-slate-200">
            <Download className="w-3.5 h-3.5" /> Download Report
          </Button>
        </div>
      </div>

      {/* Row 1: Score + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Score card */}
        <Card className="glass border-white/50 shadow-sm lg:col-span-2 flex flex-col items-center justify-center py-8">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-bold">
              {isJdMode ? "Overall Match" : "Overall CV Score"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <CountUpCircle target={matchScore} label={scoreLabel} />
            {/* Badge for high scores */}
            {matchScore >= 85 && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 font-bold text-sm animate-pulse shadow-md">
                <Trophy className="w-4 h-4" />
                Top 5% CV Profile
              </div>
            )}
            {/* Dynamic message */}
            <p className="text-xs text-slate-500 font-medium -mt-2 text-center px-2">
              {scoreMessage}
            </p>
            {isJdMode ? (
              <div className="grid grid-cols-3 gap-3 w-full">
                <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1" />
                  <span className="text-xl font-bold text-emerald-600">{presentCount}</span>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase mt-0.5">Matched</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-500 mb-1" />
                  <span className="text-xl font-bold text-amber-600">{partialCount}</span>
                  <span className="text-[10px] text-amber-500 font-bold uppercase mt-0.5">Partial</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-red-50 rounded-2xl border border-red-100">
                  <X className="w-4 h-4 text-red-500 mb-1" />
                  <span className="text-xl font-bold text-red-600">{missingCount}</span>
                  <span className="text-[10px] text-red-600 font-bold uppercase mt-0.5">Missing</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="flex flex-col items-center p-3 bg-blue-50 rounded-2xl border border-blue-100">
                  <Shield className="w-4 h-4 text-blue-500 mb-1" />
                  <span className="text-xl font-bold text-blue-600">{reviewData?.breakdown.ats ?? 0}</span>
                  <span className="text-[10px] text-blue-500 font-bold uppercase mt-0.5">ATS</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-violet-50 rounded-2xl border border-violet-100">
                  <Code className="w-4 h-4 text-violet-500 mb-1" />
                  <span className="text-xl font-bold text-violet-600">{reviewData?.breakdown.structure ?? 0}</span>
                  <span className="text-[10px] text-violet-500 font-bold uppercase mt-0.5">Structure</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card className="glass border-white/50 shadow-sm lg:col-span-3">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800">Skill Assessment Radar</CardTitle>
            <CardDescription>
              {isJdMode ? "Visual comparison of your profile vs job expectations" : "Radar appears when a JD is provided for comparison."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isJdMode && radarData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value: number, name: string) => [`${value}%`, name === "you" ? "You" : "Required"]} />
                    <Radar name="required" dataKey="required" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.3} strokeDasharray="4 2" />
                    <Radar name="you" dataKey="you" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><div className="w-3 h-1 rounded-full bg-indigo-400" /><span>Your Profile</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><div className="w-3 h-0.5 bg-slate-400 border-dashed" /><span>Required by JD</span></div>
                </div>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">Provide a Job Description to unlock radar comparison and skill-gap visualization.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Keyword Table */}
      <Card className="glass border-white/50 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">
                {isJdMode ? "Keyword Gap Analysis" : "Keyword Gap Analysis (JD Required)"}
              </CardTitle>
              <CardDescription>
                {isJdMode ? "Exact skills extracted from JD vs detected in your resume" : "Upload a JD to compare keyword match and missing skills."}
              </CardDescription>
            </div>
            {/* Summary bar */}
            {isJdMode && (
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-fit">
                <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" />{activeSkills.filter(s => s.status === "present").length} Found</span>
                <span className="flex items-center gap-1.5 text-amber-600"><AlertCircle className="w-3.5 h-3.5" />{activeSkills.filter(s => s.status === "partial").length} Partial</span>
                <span className="flex items-center gap-1.5 text-red-500"><X className="w-3.5 h-3.5" />{activeSkills.filter(s => s.status === "missing").length} Missing</span>
              </div>
            )}
          </div>

          {/* Hard/Soft skills tabs */}
          {isJdMode && (
            <div className="flex gap-1 mt-4 p-1 bg-slate-100 rounded-lg w-fit">
              <button onClick={() => setSkillTab("hard")} className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all", skillTab === "hard" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                <Code className="w-4 h-4" /> Hard Skills
                {skillTab === "hard" && <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px] leading-none">{hardSkills.length}</span>}
              </button>
              <button onClick={() => setSkillTab("soft")} className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all", skillTab === "soft" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                <Users className="w-4 h-4" /> Soft Skills
                {skillTab === "soft" && <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px] leading-none">{softSkills.length}</span>}
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4 p-0 md:p-6">
          {isJdMode && (
            <div className="hidden md:flex items-center gap-4 pb-3 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400 px-4">
              <div className="w-6 shrink-0" />
              <span className="flex-1">Skill Keyword</span>
              <span className="w-40 shrink-0 text-left pl-2">Score in CV</span>
              <span className="w-24 shrink-0 text-center">Status</span>
            </div>
          )}
          <div className="px-4 pb-2">
            {isJdMode && activeSkills.length > 0 ? activeSkills.map((skill, i) => (
              <KeywordRow key={`${skill.name}-${i}`} skill={skill} index={i} />
            )) : (
              <p className="py-6 text-sm text-slate-500">No JD skill mapping found. Upload or paste a job description to see detailed gaps.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Row 3: AI Insights */}
      <Card className="glass border-white/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Sparkles className="w-5 h-5 text-indigo-500" /> Strategic AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-0 p-0 sm:divide-x divide-slate-100">
          <div className="p-6 space-y-4 bg-emerald-50/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Shield className="w-4 h-4" /></div>
              <h4 className="text-sm font-bold text-slate-800">Key Strengths</h4>
            </div>
            <ul className="space-y-3">
              {(strengths.length > 0 ? strengths : ["No major strengths identified yet."]).map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-slate-600 font-medium"><TrendingUp className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="p-6 space-y-4 bg-red-50/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><Target className="w-4 h-4" /></div>
              <h4 className="text-sm font-bold text-slate-800">Critical Gaps</h4>
            </div>
            <ul className="space-y-3">
              {(criticalGaps.length > 0 ? criticalGaps : ["No critical gaps detected for this profile."]).map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-slate-600 font-medium"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="p-6 space-y-4 bg-blue-50/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Lightbulb className="w-4 h-4" /></div>
              <h4 className="text-sm font-bold text-slate-800">Action Plan</h4>
            </div>
            <ul className="space-y-3">
              {(actionPlan.length > 0 ? actionPlan : ["No action plan generated yet. Re-run analysis with a detailed JD."]).map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-slate-600 font-medium"><Zap className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>

        {/* CTA footer */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-900 flex flex-col sm:flex-row items-center justify-between gap-6 m-4 rounded-2xl shadow-xl">
          <div>
            <p className="font-bold text-white text-base">Ready to bridge these gaps and reach a 90%+ match?</p>
            <p className="text-sm text-slate-300 mt-1">Let our AI generate a personalized learning roadmap based on this specific gap report.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <Button variant="ghost" onClick={scanAgain} className="h-12 rounded-full gap-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10">
              <RotateCcw className="w-4 h-4" /> Scan Again
            </Button>
            <Button className="h-12 rounded-full bg-white hover:bg-slate-100 text-slate-900 shadow-glow text-sm font-bold shrink-0" asChild>
              <a href="/roadmap-generator" className="px-6 flex items-center h-full gap-2">
                Generate Study Plan <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
