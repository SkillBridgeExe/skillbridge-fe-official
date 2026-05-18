import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { 
  Video, Target, TrendingUp, AlertTriangle, ArrowRight, CheckCircle2, Clock, 
  Mic, Activity, MessageSquareQuote, BrainCircuit, Sparkles 
} from "lucide-react";
import { 
  MOCK_INTERVIEW_STATS, 
  MOCK_INTERVIEW_HISTORY, 
  MOCK_INTERVIEW_CRITERIA,
  MOCK_VOCAL_ANALYTICS,
  MOCK_PERSONALITY_TRAITS,
  MOCK_SCREENING_QUESTIONS
} from "@/lib/mock-data/dashboard";

export default function InterviewTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* ═══ Header Action ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Interview Prep Hub</h2>
          <p className="text-base text-slate-500 font-medium mt-1">Practice with AI, get actionable feedback, and land your dream job.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-xl shadow-[0_4px_14px_0_rgba(var(--primary),0.3)] hover:shadow-[0_6px_20px_rgba(var(--primary),0.23)] hover:-translate-y-0.5 transition-all">
          <Video className="w-5 h-5 mr-2" /> Book Mock Interview
        </Button>
      </div>

      {/* ═══ Top Stats ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: MOCK_INTERVIEW_STATS.totalInterviews, icon: Video, color: "text-blue-500", bg: "bg-blue-50", borderColor: "border-blue-100" },
          { label: "Average Score", value: `${MOCK_INTERVIEW_STATS.averageScore}/100`, icon: Target, color: "text-primary", bg: "bg-primary/10", borderColor: "border-primary/20" },
          { label: "Top Strength", value: MOCK_INTERVIEW_STATS.topSkill, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50", borderColor: "border-emerald-100" },
          { label: "Area to Improve", value: MOCK_INTERVIEW_STATS.areaToImprove, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", borderColor: "border-amber-100" },
        ].map((stat, idx) => (
          <Card key={idx} className={cn("glass shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden border", stat.borderColor)}>
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity bg-gradient-to-br from-transparent to-current", stat.color)} />
            <CardContent className="p-4 flex items-center gap-4 relative z-10">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105", stat.bg)}>
                <stat.icon className={cn("w-7 h-7", stat.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{stat.label}</p>
                <p className="text-xl font-black text-slate-900 leading-tight mt-0.5 break-words line-clamp-2" title={String(stat.value)}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ Row 2: Radar & History ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Radar Chart */}
        <Card className="glass border-white/50 shadow-sm flex flex-col overflow-visible">
          <CardHeader className="pb-0 shrink-0">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              Performance Criteria
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="w-3 h-3 text-primary" />
              </div>
            </CardTitle>
            <CardDescription className="text-xs">Based on recent AI evaluations</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 w-full pt-0 pb-2 flex flex-col">
            {/* Radar Chart */}
            <div className="flex-1 min-h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" margin={{ top: 5, right: 10, bottom: 5, left: 10 }} data={MOCK_INTERVIEW_CRITERIA}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={<CustomRadarTick />}
                  />
                  <Radar
                    name="Score"
                    dataKey="A"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fill="url(#colorScore)"
                    fillOpacity={1}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 8px 16px rgba(0,0,0,0.08)", fontSize: "12px", fontWeight: "bold" }}
                    formatter={(value: number) => [`${value}/100`]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score Legend — fills empty space */}
            <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
              {MOCK_INTERVIEW_CRITERIA.map((c) => {
                const isTop = c.A >= 80;
                return (
                  <div key={c.subject} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", isTop ? "bg-indigo-500" : "bg-slate-300")} />
                      <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">{c.subject}</span>
                    </div>
                    <span className={cn("text-xs font-black", isTop ? "text-indigo-600" : "text-slate-500")}>{c.A}<span className="text-[10px] font-medium text-slate-400">/100</span></span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Interview History */}
        <Card className="glass border-white/50 shadow-sm lg:col-span-2 flex flex-col">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Recent Sessions</CardTitle>
                <CardDescription className="text-xs mt-1">Replay recordings and review detailed feedback</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-600">View All</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="space-y-3">
              {MOCK_INTERVIEW_HISTORY.map((session) => (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                     <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center border-2 shrink-0 shadow-sm",
                        session.status === "completed" 
                          ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600" 
                          : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 text-slate-400"
                      )}>
                        {session.status === "completed" ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                     </div>
                     <div>
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors">{session.role}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 font-medium">
                            {new Date(session.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <span className={cn(
                            "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full",
                            session.status === "completed" ? "bg-emerald-100/50 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {session.status === "completed" ? "Completed" : "Upcoming"}
                          </span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {session.score !== null ? (
                      <div className="text-right px-4 py-1.5 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                        <span className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors">{session.score}</span>
                        <span className="text-xs text-slate-400 font-medium ml-0.5">/100</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold tracking-wide text-amber-600 bg-amber-50 px-2 py-1 rounded-md hidden sm:inline border border-amber-100">Review Questions</span>
                        <Button size="sm" className="h-9 px-4 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200">Prepare</Button>
                      </div>
                    )}
                    {session.score !== null && (
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Row 3: Vocal Analytics & Personality ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Vocal Analytics */}
        <Card className="glass border-white/50 shadow-sm relative overflow-hidden">
          {/* Decorative Gradients */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />
          
          <CardHeader className="pb-4 relative z-10 border-b border-slate-100/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border border-blue-100">
                <Mic className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Vocal & Delivery Analytics</CardTitle>
                <CardDescription className="text-xs mt-0.5">Analysis from your <strong>Latest Session</strong></CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-5 relative z-10">
            {/* Pacing */}
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors">
                   <Activity className="w-4 h-4 text-slate-500 group-hover:text-blue-500 transition-colors" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-slate-800">Speaking Pace</p>
                   <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">Words per minute</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-lg font-black text-slate-900 tracking-tight">{MOCK_VOCAL_ANALYTICS.pacing} WPM</p>
                 <BadgeStatus status={MOCK_VOCAL_ANALYTICS.pacingStatus} />
              </div>
            </div>
            
            {/* Filler Words */}
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover:border-amber-200 group-hover:bg-amber-50 transition-colors">
                   <MessageSquareQuote className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-slate-800">Filler Words</p>
                   <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">"Um", "Uh", "Like"</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-lg font-black text-slate-900 tracking-tight">{MOCK_VOCAL_ANALYTICS.fillerWords} <span className="text-sm font-bold text-slate-400">count</span></p>
                 <BadgeStatus status={MOCK_VOCAL_ANALYTICS.fillerStatus} />
              </div>
            </div>

            {/* Confidence */}
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-colors">
                   <Sparkles className="w-4 h-4 text-slate-500 group-hover:text-emerald-500 transition-colors" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-slate-800">Vocal Confidence</p>
                   <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">Tone, pitch variation</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-lg font-black text-emerald-600 tracking-tight">{MOCK_VOCAL_ANALYTICS.confidenceScore}/100</p>
                 <BadgeStatus status={MOCK_VOCAL_ANALYTICS.confidenceStatus} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personality & Vibe */}
        <Card className="glass border-white/50 shadow-sm relative overflow-hidden">
          {/* Decorative Gradients */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />
          
          <CardHeader className="pb-4 relative z-10 border-b border-slate-100/50">
             <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 flex items-center justify-center border border-purple-100">
                <BrainCircuit className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Personality & Vibe</CardTitle>
                <CardDescription className="text-xs mt-0.5">AI perception from your <strong>Latest Session</strong></CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5 relative z-10">
            {MOCK_PERSONALITY_TRAITS.map(trait => (
              <div key={trait.trait} className="group cursor-default">
                <div className="flex justify-between items-end mb-1.5 px-1">
                  <span className="text-sm font-bold text-slate-700">{trait.trait}</span>
                  <span className="text-sm font-black text-indigo-600">{trait.score}%</span>
                </div>
                <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden shadow-inner flex items-center p-0.5">
                  <div 
                    className="h-full rounded-full relative overflow-hidden transition-all duration-500 group-hover:brightness-110" 
                    style={{ 
                      width: `${trait.score}%`,
                      background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)' // Indigo to Purple gradient
                    }} 
                  >
                    {/* Glassmorphic inner shine overlay */}
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {/* ═══ Row 4: Screening & Behavioral Questions ═══ */}
      <Card className="glass border-white/50 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Behavioral & Screening Review</CardTitle>
              <CardDescription className="text-xs mt-1">Questions and STAR method feedback from your <strong>Latest Session</strong>.</CardDescription>
            </div>
            <div className="bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-indigo-100 w-fit shadow-sm">
              <Clock className="w-3.5 h-3.5" /> Latest: Mar 01, 2026
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 p-0 md:p-6 bg-slate-50/30">
          <div className="space-y-5 px-4 md:px-0 pb-4 md:pb-0">
            {MOCK_SCREENING_QUESTIONS.map(q => (
              <div key={q.id} className="p-5 rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow flex flex-col gap-4">
                
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-base font-bold text-slate-900 leading-snug">Q: {q.question}</h4>
                  <div className={cn(
                    "px-3 py-1 rounded-lg text-[13px] font-black shrink-0 border bg-gradient-to-br",
                    q.score >= 80 ? "from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-700" : "from-amber-50 to-amber-100/50 border-amber-200 text-amber-700"
                  )}>
                    {q.score}/100
                  </div>
                </div>
                
                {/* User Answer */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquareQuote className="w-3.5 h-3.5" /> Your Answer Summary
                  </p>
                  <p className="text-sm font-medium text-slate-700 italic">"{q.yourAnswer}"</p>
                </div>

                {/* AI Feedback */}
                <div className="bg-indigo-50/80 border border-indigo-100 border-l-[3px] border-l-indigo-500 p-4 rounded-xl rounded-l-md flex items-start gap-3">
                  <div className="bg-white p-1.5 rounded-lg shadow-sm border border-indigo-100 mt-0.5 shrink-0">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[11px] font-black text-indigo-900 uppercase tracking-wider mb-1">AI Coach Feedback</p>
                    <p className="text-sm font-medium text-indigo-800 leading-relaxed">{q.aiFeedback}</p>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

// ─── Helper Components ───

type RadarTickProps = SVGProps<SVGTextElement> & {
  payload?: { value?: string };
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
};

// Custom tick for RadarChart that splits long labels into multiple lines
function CustomRadarTick({ payload, x = 0, y = 0, cx = 0, cy = 0, ...rest }: RadarTickProps) {
  const words = (payload?.value || "").split(" ");
  const anchor = x > cx ? "start" : x < cx ? "end" : "middle";
  // Offset label away from center for readability
  const offsetX = x > cx ? 6 : x < cx ? -6 : 0;
  const offsetY = y > cy ? 8 : y < cy ? -4 : 0;
  
  return (
    <text
      {...rest}
      x={x + offsetX}
      y={y + offsetY}
      textAnchor={anchor}
      fill="#64748b"
      fontSize={11}
      fontWeight={700}
    >
      {words.length > 1 ? (
        words.map((word: string, i: number) => (
          <tspan x={x + offsetX} dy={i === 0 ? 0 : 14} key={i}>
            {word}
          </tspan>
        ))
      ) : (
        <tspan>{words[0]}</tspan>
      )}
    </text>
  );
}

function BadgeStatus({ status }: { status: string }) {
  const isGood = status === "Optimal" || status === "Excellent";
  return (
    <span className={cn(
      "text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1 inline-block",
      isGood ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
    )}>
      {status}
    </span>
  );
}
