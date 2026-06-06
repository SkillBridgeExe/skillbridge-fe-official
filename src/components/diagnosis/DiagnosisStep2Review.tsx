import React, { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, X, Download, ArrowLeft, Code, RotateCcw, Briefcase, Search, ChevronRight, Trophy } from "lucide-react";
import { DocumentPreview } from "./DocumentPreview";
import { JobDescriptionInput } from "./JobDescriptionInput";
import { SkillsExtractedCard, SkillsRelevanceCard, TopSummaryCard } from "./DiagnosisInsights";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useToast } from "@/hooks/use-toast";
import { useReviewCvMutation } from "@/hooks/use-diagnosis";
import { getApiErrorMessage } from "@/lib/api-error";

/** Mini progress bar with percentage label + dynamic colors */
function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-red-500";
  const textColor = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500";
  const glow = score >= 80 ? "shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "";

  return (
    <div className="flex items-center gap-3 mb-1">
      <h3 className="text-sm font-bold text-slate-800 flex-1">{label}</h3>
      <span className={cn("text-xs font-bold", textColor)}>{score}%</span>
      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color, glow)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

const MAX_SECTION_ITEMS = 3;

function truncateText(value: string, maxLength = 150): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function DiagnosisStep2Review() {
  const {
    cvFile,
    reviewData,
    apiError,
    goBack,
    reset,
    showJdInput,
    setShowJdInput,
    jobDescription,
    setHasActivatedJdMode,
    setTargetStep,
    setLoadingProgress,
    setLoadingMsgIdx,
    setIsAnalyzing,
    setReviewData,
    setApiError,
    setStep
  } = useDiagnosisStore();

  const { toast } = useToast();
  const reviewCvMutation = useReviewCvMutation();

  const compareFromCvReview = async () => {
    if (!cvFile) {
      toast({ title: "Missing CV", description: "Please upload a CV before running JD comparison.", variant: "destructive" });
      return;
    }
    if (!jobDescription.trim()) { return toast({ title: "Missing Job Description", description: "Paste the job description first.", variant: "destructive" }); }

    const previousReviewData = reviewData;
    setShowJdInput(false);
    setTargetStep("results");
    setApiError(null);
    setReviewData(null);
    setLoadingProgress(0);
    setLoadingMsgIdx(0);
    setIsAnalyzing(true);

    try {
      const data = await reviewCvMutation.mutateAsync({ cvFile, jobDescription: jobDescription.trim() });
      setReviewData(data);
      setHasActivatedJdMode(true);
      setApiError(null);
      setStep("results");
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to compare CV with job description.");
      setHasActivatedJdMode(false);
      setReviewData(previousReviewData ?? null);
      setApiError(message);
      toast({ title: "Analysis Failed", description: message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      setLoadingProgress(0);
    }
  };

  const overallCvScore = reviewData?.overallScore ?? 0;

  /* ── Confetti for high scores ── */
  const confettiFired = useRef(false);
  useEffect(() => {
    if (overallCvScore >= 70 && !confettiFired.current) {
      confettiFired.current = true;
      import("canvas-confetti").then((mod) => {
        const fire = mod.default;
        fire({ particleCount: 120, spread: 80, origin: { y: 0.6 }, zIndex: 9999 });
        setTimeout(() => fire({ particleCount: 60, spread: 100, origin: { y: 0.5 }, zIndex: 9999 }), 300);
      }).catch(() => { /* confetti is optional */ });
    }
  }, [overallCvScore]);

  /* ── Dynamic UX copy ── */
  const scoreMessage = overallCvScore >= 70
    ? "🎉 Outstanding! Your CV is exceptionally strong. Apply with confidence!"
    : overallCvScore >= 55
      ? "👍 Good job! Your CV is competitive but has room for improvement."
      : overallCvScore >= 40
        ? "⚠️ Your CV meets basic standards. Focus on quantifying achievements."
        : "🔴 Your CV needs significant improvement. Follow the suggestions below.";
  const reviewSections = reviewData ? [
    {
      title: "CV Format & Structure",
      score: reviewData.breakdown.structure,
      items: reviewData.issues
        .filter((issue) => issue.title.toLowerCase().includes("format") || issue.title.toLowerCase().includes("structure"))
        .slice(0, MAX_SECTION_ITEMS)
        .map((issue) => ({ text: truncateText(issue.detail), ok: false, hint: truncateText(issue.suggestion, 120) })),
    },
    {
      title: "ATS Compatibility",
      score: reviewData.breakdown.ats,
      items: reviewData.issues
        .filter((issue) => issue.title.toLowerCase().includes("ats") || issue.title.toLowerCase().includes("keyword"))
        .slice(0, MAX_SECTION_ITEMS)
        .map((issue) => ({ text: truncateText(issue.detail), ok: false, hint: truncateText(issue.suggestion, 120) })),
    },
    {
      title: "Content Quality",
      score: reviewData.breakdown.skills,
      items: reviewData.issues
        .filter((issue) => issue.title.toLowerCase().includes("content") || issue.title.toLowerCase().includes("experience") || issue.title.toLowerCase().includes("skill"))
        .slice(0, MAX_SECTION_ITEMS)
        .map((issue) => ({ text: truncateText(issue.detail), ok: false, hint: truncateText(issue.suggestion, 120) })),
    },
    {
      title: "Basic Information",
      score: reviewData.breakdown.experience,
      items: reviewData.rewriteSuggestions.slice(0, MAX_SECTION_ITEMS).map((item) => ({
        text: truncateText(`${item.section}: ${item.original}`),
        ok: false,
        hint: truncateText(item.improved, 120),
      })),
    },
  ] : [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back button */}
      <button onClick={goBack} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary mb-4 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Upload
      </button>

      {apiError && (
        <Card className="mb-6 border-red-200 bg-red-50/80">
          <CardContent className="py-4 text-sm text-red-700 font-medium">{apiError}</CardContent>
        </Card>
      )}

      {/* ── ③ Lead: "fix these first" (ẩn khi BE chưa trả field) ── */}
      {reviewData?.top_summary && <TopSummaryCard summary={reviewData.top_summary} />}

      {/* ── Overall CV Score Hero ── */}
      <Card className="glass border-white/50 shadow-sm mb-6 overflow-hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="-rotate-90 w-24 h-24">
              <circle cx={48} cy={48} r={40} stroke="#e2e8f0" strokeWidth={8} fill="none" />
              <circle cx={48} cy={48} r={40} stroke={overallCvScore >= 70 ? "#10b981" : overallCvScore >= 50 ? "#f59e0b" : "#ef4444"} strokeWidth={8} fill="none" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 - (2 * Math.PI * 40 * overallCvScore) / 100} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-slate-900">{overallCvScore}</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-900">Your CV Quality Score</h2>
            <p className="text-sm text-slate-500 mt-1">{scoreMessage}</p>
            {overallCvScore >= 70 && (
              <div className="flex items-center gap-2 px-4 py-1.5 mt-2 rounded-full bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 font-bold text-sm animate-pulse shadow-md w-fit">
                <Trophy className="w-4 h-4" />
                Outstanding Profile
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
              {reviewSections.map(s => (
                <span key={s.title} className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  s.score >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : s.score >= 50 ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200"
                }`}>{s.title.split(" ")[0]} {s.score}%</span>
              ))}
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-full gap-2 text-xs font-semibold border-slate-200 shrink-0">
            <Download className="w-3.5 h-3.5" /> Export Report
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: CV Quality Review */}
        <div className="space-y-4">
          {reviewSections.map((section, si) => (
            <Card key={section.title} className="glass border-white/50 shadow-sm animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${si * 100}ms`, animationFillMode: "both" }}>
              <CardContent className="pt-5 pb-4">
                <ScoreBar score={section.score} label={section.title} />
                <ul className="mt-3 space-y-1.5">
                  {(section.items.length > 0 ? section.items : [{ text: "No critical issues detected in this section.", ok: true }]).map((item, ii) => (
                    <li key={ii} className="text-[13px] text-slate-600">
                      <div className="flex items-start gap-2">
                        {item.ok
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          : <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        }
                        <span className={item.ok ? "" : "text-red-700 font-medium"}>{item.text}</span>
                      </div>
                      {!item.ok && item.hint && (
                        <p className="ml-6 mt-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 leading-snug">
                          💡 {item.hint}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          {/* ── ① Skill chips + trình độ + dẫn chứng (ẩn khi field vắng) ── */}
          {reviewData?.skills_extracted && reviewData.skills_extracted.length > 0 && (
            <SkillsExtractedCard skills={reviewData.skills_extracted} />
          )}

          {/* ── ② Độ phù hợp kỹ năng vs target role (ẩn khi field vắng) ── */}
          {reviewData?.skills_relevance_breakdown && (
            <SkillsRelevanceCard breakdown={reviewData.skills_relevance_breakdown} />
          )}

          {/* ATS Parse simulation */}
          <Card className="glass shadow-sm overflow-hidden border-orange-200/50 bg-orange-50/30">
            <CardHeader className="py-4 border-b border-orange-100 bg-orange-50/50">
              <CardTitle className="text-sm font-bold text-orange-800 flex items-center gap-2">
                <Code className="w-4 h-4" /> Raw AI Parsed Data
              </CardTitle>
              <CardDescription className="text-xs text-orange-600/80">This is what robot ATS systems "see" from your layout.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 p-4 text-xs font-mono text-slate-700 leading-relaxed max-h-[120px] overflow-y-auto">
              {JSON.stringify(reviewData?.parsedCv ?? {}, null, 2)}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Document Preview (Sticky) */}
        <DocumentPreview />
      </div>

      {/* Matching jobs CTA */}
      <div className="mt-6">
        <Card className="glass shadow-sm bg-indigo-50 border-indigo-100 group cursor-pointer hover:border-indigo-300 transition-colors">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
              <Search className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-800">Found <span className="text-indigo-600">95 open roles</span> for your profile</p>
              <p className="text-xs text-slate-500">Based on your base skills, without Job Description targeting.</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
          </CardContent>
        </Card>
      </div>

      {/* CTA: Compare with JD */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        {!showJdInput ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50" />
            <div className="relative z-10">
              <p className="font-bold text-slate-800 text-base">Want even deeper analysis?</p>
              <p className="text-sm text-slate-600 mt-0.5">Add a specific Job Description to see your precise <span className="font-semibold text-indigo-600">Skill Gap</span> and <span className="font-semibold text-indigo-600">Match %</span></p>
            </div>
            <div className="flex gap-3 shrink-0 relative z-10">
              <Button variant="ghost" onClick={reset} className="rounded-full text-sm font-semibold hover:bg-slate-200 gap-2">
                <RotateCcw className="w-4 h-4" /> Start Over
              </Button>
              <Button onClick={() => setShowJdInput(true)} className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white shadow-lg text-sm font-semibold gap-2 hover:-translate-y-0.5 transition-transform">
                <Briefcase className="w-4 h-4" /> Compare with JD
              </Button>
            </div>
          </div>
        ) : (
          /* Reusable JD input in compact mode with action buttons */
          <JobDescriptionInput
            compact
            showActions
            onCancel={() => setShowJdInput(false)}
            onAnalyze={compareFromCvReview}
          />
        )}
      </div>
    </div>
  );
}
