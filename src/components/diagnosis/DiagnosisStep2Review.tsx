import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Pencil, RotateCcw, Briefcase, ChevronDown, ChevronUp, Brain, TrendingUp, FileText } from "lucide-react";
import { DocumentPreview } from "./DocumentPreview";
import { JobDescriptionInput } from "./JobDescriptionInput";
import { EvidenceLedgerCard, SkillsExtractedCard, SkillsRelevanceCard, TopSummaryCard } from "./DiagnosisInsights";
import { ExtractionQualityBanner } from "./ExtractionQualityBanner";
import { JobRecommendations } from "./JobRecommendations";
import { SkillGapTrends } from "./SkillGapTrends";
import { AiTrendsInsight } from "./AiTrendsInsight";
import { InterviewPrepPack } from "./InterviewPrepPack";
import { GithubEvidence } from "./GithubEvidence";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { getRoleLabel } from "@/constants/it-roles";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCompareJdMutation, useInterviewPlanQuery } from "@/hooks/use-diagnosis";
import { getApiErrorMessage } from "@/lib/api-error";
import { extractAiGateCode } from "@/lib/ai-input-gate";
import type { ReviewDimension, CvIssue, CanonicalCvDocument } from "@shared/api";

/* ── Design tokens (§0b DESIGN SPEC) ── */
const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";
const SEV = {
  high:   "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]",
  medium: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
  low:    "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
} as const;

/** Custom Circular Score Gauge for CV rating */
function CircularScoreGauge({ score, displayedScore }: { score: number; displayedScore: number }) {
  const radius = 38;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayedScore / 100) * circumference;

  let glowColor = "rgba(159, 47, 45, 0.1)";
  if (score >= 70) {
    glowColor = "rgba(16, 185, 129, 0.1)";
  } else if (score >= 55) {
    glowColor = "rgba(245, 158, 11, 0.1)";
  } else if (score >= 40) {
    glowColor = "rgba(245, 158, 11, 0.1)";
  }

  return (
    <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 shrink-0">
      <div 
        className="absolute inset-2 rounded-full blur-md transition-all duration-1000 animate-pulse"
        style={{ backgroundColor: glowColor }}
      />
      <svg className="w-full h-full transform -rotate-90 animate-in fade-in duration-700" viewBox="0 0 96 96">
        <defs>
          <linearGradient id="scoreGradExcellent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="scoreGradGood" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="scoreGradPoor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>
        <circle
          cx="48"
          cy="48"
          r={radius}
          className="stroke-[#F1F1EF]"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke={
            score >= 70 ? "url(#scoreGradExcellent)"
            : score >= 55 ? "url(#scoreGradGood)"
            : "url(#scoreGradPoor)"
          }
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl sm:text-3xl font-mono font-black text-slate-800 tracking-tight leading-none">
          {displayedScore}
        </span>
        <span className="text-[10px] font-bold text-slate-400 mt-0.5">/100</span>
      </div>
    </div>
  );
}


/** Score band pill */
function BandPill({ score, t }: { score: number; t: (key: string) => string }) {
  const band =
    score >= 70 ? { cls: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]", key: "review.scoreMsg.excellent" }
    : score >= 55 ? { cls: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]", key: "review.scoreMsg.good" }
    : score >= 40 ? { cls: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]", key: "review.scoreMsg.fair" }
    : { cls: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]", key: "review.scoreMsg.poor" };

  return (
    <p className={cn("inline-block text-[13px] font-medium border rounded-lg px-3 py-1 mt-2", band.cls)}>
      {t(band.key)}
    </p>
  );
}

/** ScoreBar for dimensions (0-20 scale, display as percentage) */
function DimScoreBar({ score20 }: { score20: number }) {
  const pct = Math.round(score20 * 5);
  const color = pct >= 70 ? "bg-[#346538]" : pct >= 50 ? "bg-[#956400]" : "bg-[#9F2F2D]";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#F1F1EF] rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono tabular-nums text-xs text-[#787774] w-10 text-right shrink-0">{score20}/20</span>
    </div>
  );
}

function dimensionTone(score20: number) {
  const pct = Math.round(score20 * 5);
  if (pct >= 70) {
    return {
      key: "review.band.strong",
      badge: "border-[#DCE9D7] bg-[#EDF3EC] text-[#346538]",
      rail: "border-l-[#57A773]",
    };
  }
  if (pct >= 50) {
    return {
      key: "review.band.watch",
      badge: "border-[#F1E5C0] bg-[#FBF3DB] text-[#956400]",
      rail: "border-l-[#D9A441]",
    };
  }
  return {
    key: "review.band.priority",
    badge: "border-[#F6D4D5] bg-[#FDEBEC] text-[#9F2F2D]",
    rail: "border-l-[#D75656]",
  };
}

/** Severity badge */
function SeverityBadge({ severity, t }: { severity: "high" | "medium" | "low"; t: (key: string) => string }) {
  return (
    <span className={cn("text-[11px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0", SEV[severity])}>
      {t(`review.severity.${severity}`)}
    </span>
  );
}

/** Collapsible dimension card */
function DimensionCard({
  dim,
  issues,
  index,
  t,
}: {
  dim: ReviewDimension;
  issues: CvIssue[];
  index: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasLongRationale = dim.rationale.length > 120;
  const pct = Math.round(dim.score20 * 5);
  const tone = dimensionTone(dim.score20);
  const visibleIssues = expanded ? issues : issues.slice(0, 2);
  const hiddenIssues = Math.max(issues.length - visibleIssues.length, 0);

  return (
    <div
      className={cn(CARD, "overflow-hidden border-l-4 animate-in fade-in duration-500", tone.rail)}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center sm:p-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold tabular-nums text-[#9AA1A6]">0{index + 1}</span>
            <h3 className="text-[15px] font-black leading-tight text-[#2F3437]">{t(`review.dims.${dim.key}`)}</h3>
            <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold", tone.badge)}>
              {t(tone.key)}
            </span>
            <span className="rounded-full border border-[#EAEAEA] bg-[#FBFBFA] px-2.5 py-1 text-[11px] font-bold text-[#787774]">
              {t("review.priorityCount", { count: issues.length })}
            </span>
          </div>

          <p className={cn("text-[13px] leading-relaxed text-[#5F666B]", !expanded && hasLongRationale && "line-clamp-1")}>
            {dim.rationale}
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#787774]">{t("review.scoreLabel")}</span>
            <span className="font-mono text-lg font-black tabular-nums text-[#2F3437]">{pct}%</span>
          </div>
          <DimScoreBar score20={dim.score20} />
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="border-t border-[#F1F1EF] bg-[#FBFBFA] px-3 py-2 sm:px-4">
          <ul className="grid gap-2 lg:grid-cols-2">
          {visibleIssues.map((issue, i) => (
            <li key={i} className="min-w-0 text-[13px] text-[#2F3437]">
              <div className="flex items-start gap-2 rounded-lg bg-white px-3 py-2">
                <SeverityBadge severity={issue.severity} t={t} />
                <div className="min-w-0">
                  <p className="line-clamp-2 font-medium leading-relaxed">{issue.detail}</p>
                  {issue.suggestion && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#787774]">
                      <span className="font-bold text-[#2F3437]">{t("review.suggestionLabel")} </span>{issue.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
          </ul>
          {(hasLongRationale || hiddenIssues > 0) && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 inline-flex items-center gap-1 rounded text-xs font-bold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? t("review.seeLess") : hiddenIssues > 0 ? t("review.moreIssues", { count: hiddenIssues }) : t("review.seeMore")}
            </button>
          )}
        </div>
      )}

      {issues.length === 0 && (
        <div className="border-t border-[#DCE9D7] bg-[#EDF3EC] px-3 py-2 text-xs font-bold text-[#346538] sm:px-4">
          <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {t("review.noIssues")}
          </div>
        </div>
      )}
    </div>
  );
}

export function DiagnosisStep2Review() {
  const { t, i18n } = useTranslation("diagnosis");
  const {
    reviewData,
    apiError,
    goBack,
    reset,
    showJdInput,
    setShowJdInput,
    jobDescription,
    lastCvId,
    targetRole,
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
  const compareJdMutation = useCompareJdMutation();
  const diagnosisLang = i18n.language?.startsWith("vi") ? "vi" : "en";

  // Prefetch W11 as soon as the CV review has enough context. The visible
  // InterviewPrepPack still renders in the Market tab and reuses this cache.
  useInterviewPlanQuery(lastCvId, targetRole, diagnosisLang);

  const compareFromCvReview = async () => {
    if (!lastCvId) {
      toast({ title: t("review.toastMissingCvTitle"), description: t("review.toastMissingCvDesc"), variant: "destructive" });
      return;
    }
    if (!jobDescription.trim()) { return toast({ title: t("review.toastMissingJdTitle"), description: t("review.toastMissingJdDesc"), variant: "destructive" }); }

    const previousReviewData = reviewData;
    setShowJdInput(false);
    setTargetStep("results");
    setApiError(null);
    setReviewData(null);
    setLoadingProgress(0);
    setLoadingMsgIdx(0);
    setIsAnalyzing(true);

    try {
      const jdMatch = await compareJdMutation.mutateAsync({
        cvId: lastCvId,
        jdText: jobDescription.trim(),
        targetRole,
      });
      setReviewData(previousReviewData ? { ...previousReviewData, jdMatch } : null);
      setHasActivatedJdMode(true);
      setApiError(null);
      setStep("results");
    } catch (error) {
      const gateCode = extractAiGateCode(error);
      const message =
        gateCode === "JD_CONTENT_INSUFFICIENT"
          ? t("aiGate.jdThin")
          : gateCode === "CV_CONTENT_INSUFFICIENT"
            ? t("aiGate.cvUnreadable")
            : getApiErrorMessage(error, "Failed to compare CV with job description.");
      setHasActivatedJdMode(false);
      setReviewData(previousReviewData ?? null);
      setApiError(message);
      toast({ title: t("review.toastFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      setLoadingProgress(0);
    }
  };

  /** "Sửa CV & tải PDF": nạp CV đã chẩn đoán vào Builder rồi mở Builder (edit → live preview → render PDF). */
  const handleEditCv = () => {
    const parsed = reviewData?.parsedCv;
    const seedDoc: CanonicalCvDocument | null =
      reviewData?.document ??
      (parsed
        ? {
            language: "en",
            contact: {
              name: parsed.name ?? null,
              email: parsed.email ?? null,
              phone: parsed.phone ?? null,
              location: null,
              links: [],
            },
            summary: parsed.summary ?? "",
            education: [],
            experience: [],
            projects: [],
            skills: { technical: parsed.skills ?? [], soft: [], languages: [], tools: [] },
            certifications: [],
            activities: [],
          }
        : null);

    if (!seedDoc) {
      toast({ title: t("review.editNoDataTitle"), description: t("review.editNoDataDesc"), variant: "destructive" });
      return;
    }

    const builder = useCvBuilderStore.getState();
    builder.hydrateFromCanonical(seedDoc);
    if (targetRole) builder.setCareerTarget("targetPosition", getRoleLabel(targetRole));
    setStep("builder");
  };

  const overallCvScore = reviewData?.overallScore ?? 0;
  const atsScore = reviewData?.breakdown.ats ?? 0;
  const dimensions = reviewData?.dimensions ?? [];

  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 800;
    const startScore = 0;
    const endScore = overallCvScore;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.floor(easeProgress * (endScore - startScore) + startScore);

      setDisplayedScore(currentScore);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [overallCvScore]);

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

  /* ── Distribute issues across dim cards ── */
  const allIssues = reviewData?.issues ?? [];
  const issueGroups: CvIssue[][] = dimensions.length > 0
    ? dimensions.map((_, i) => {
        const perDim = Math.ceil(allIssues.length / dimensions.length);
        return allIssues.slice(i * perDim, (i + 1) * perDim);
      })
    : [allIssues];

  const [rawOpen, setRawOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'skills' | 'market'>('audit');

  const currentLang = useTranslation().i18n.language?.startsWith("vi") ? "vi" : "en";
  const tabLabels = {
    vi: {
      audit: "Kiểm tra CV",
      skills: "Phân tích Kỹ năng",
      market: "Cơ hội & Thị trường",
    },
    en: {
      audit: "CV Audit",
      skills: "Skills Analysis",
      market: "Market & Careers",
    }
  }[currentLang];

  return (
    <div className="animate-in fade-in duration-500" style={{ '--tw-translate-y': '12px' } as React.CSSProperties}>
      {/* Back button */}
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm font-semibold text-[#787774] hover:text-primary mb-6 transition-colors group focus-visible:ring-2 focus-visible:ring-primary/40 rounded w-fit"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> {t("review.backToUpload")}
      </button>

      {apiError && (
        <div className={cn(CARD, "mb-6 border-[#F6D4D5] bg-[#FDEBEC]")}>
          <div className="p-4 text-sm text-[#9F2F2D] font-medium">{apiError}</div>
        </div>
      )}

      {/* ── Redesigned Premium Header Dashboard ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Card 1: Circular Score Gauge */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-5 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-slate-300 group">
          <div className="absolute -right-10 -top-10 w-24 h-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/8 transition-all duration-500" />
          <CircularScoreGauge score={overallCvScore} displayedScore={displayedScore} />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#787774] block mb-1">
              {t("review.heroTitle")}
            </span>
            <div className="leading-tight">
              <BandPill score={overallCvScore} t={t} />
            </div>
            {overallCvScore >= 70 && (
              <p className="text-[11px] text-[#346538] font-medium mt-2 leading-relaxed">
                {t("review.praiseHigh")}
              </p>
            )}
          </div>
        </div>

        {/* Card 2: ATS Match & Target Role */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-slate-300 group">
          <div className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/8 transition-all duration-500" />
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">
              {t("review.atsTitle")}
            </span>
            <h3 className="text-sm font-black text-slate-800 mt-1 truncate">
              {targetRole ? getRoleLabel(targetRole) : "N/A"}
            </h3>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-[#787774] font-medium">ATS Match Score</span>
              <span className="font-mono text-slate-800">{atsScore}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
              <div
                className={cn("h-full rounded-full transition-all duration-1000", atsScore >= 70 ? "bg-[#346538]" : atsScore >= 50 ? "bg-[#956400]" : "bg-[#9F2F2D]")}
                style={{ width: `${atsScore}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-[#787774] leading-relaxed line-clamp-1">{t("review.atsNote")}</p>
          </div>
        </div>

        {/* Card 3: Quick Action Panel */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-slate-300">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Bảng điều khiển nhanh</h4>
            <p className="text-[11px] text-[#787774] mt-0.5 leading-relaxed">
              Tối ưu CV của bạn với AI Builder hoặc dán mô tả công việc (JD) để đối chiếu sâu.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              onClick={handleEditCv}
              size="sm"
              className="rounded-lg gap-1.5 text-xs font-bold bg-[#2F3437] text-white hover:bg-[#1f2426] active:scale-[0.98] transition-all justify-center shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5" /> Sửa & Tải PDF
            </Button>
            <Button
              onClick={() => setShowJdInput(true)}
              size="sm"
              variant="outline"
              className="rounded-lg gap-1.5 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-700 active:scale-[0.98] transition-all justify-center"
            >
              <Briefcase className="w-3.5 h-3.5" /> So sánh JD
            </Button>
          </div>
        </div>
      </div>

      {/* Honest input-quality disclosure — renders only when the extracted text looks unreliable. */}
      <ExtractionQualityBanner quality={reviewData?.extraction_quality} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        {/* LEFT COLUMN: Tabs & Active Panel */}
        <div className="min-w-0 space-y-5">
          {showJdInput ? (
            <div className="animate-in fade-in slide-in-from-top-3 duration-300">
              <JobDescriptionInput
                compact
                showActions
                onCancel={() => setShowJdInput(false)}
                onAnalyze={compareFromCvReview}
              />
            </div>
          ) : (
            <>
              {/* Tab selector */}
              <div className="flex border border-slate-200/60 bg-slate-100/60 p-1.5 rounded-2xl gap-1 shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                <button
                  onClick={() => setActiveTab('audit')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200",
                    activeTab === 'audit'
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  {tabLabels.audit}
                </button>
                <button
                  onClick={() => setActiveTab('skills')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200",
                    activeTab === 'skills'
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  )}
                >
                  <Brain className="w-4 h-4" />
                  {tabLabels.skills}
                </button>
                <button
                  onClick={() => setActiveTab('market')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200",
                    activeTab === 'market'
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  )}
                >
                  <TrendingUp className="w-4 h-4" />
                  {tabLabels.market}
                </button>
              </div>

              {/* Tab Panel contents */}
              <div className="space-y-5">
                {activeTab === 'audit' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Top Summary prioritized checklist */}
                    {reviewData?.top_summary && <TopSummaryCard summary={reviewData.top_summary} />}

                    {/* Breakdown Dimension Cards */}
                    {dimensions.length > 0 ? (
                      <section className="space-y-3">
                        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between px-1">
                          <div>
                            <h2 className="text-base font-black text-slate-800">{t("review.breakdownTitle")}</h2>
                            <p className="text-xs text-[#787774]">{t("review.breakdownDesc")}</p>
                          </div>
                          <span className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#787774] shadow-sm">
                            {t("review.priorityCount", { count: allIssues.length })}
                          </span>
                        </div>
                        <div className="grid gap-3">
                          {dimensions.map((dim, i) => (
                            <DimensionCard key={dim.key} dim={dim} issues={issueGroups[i] ?? []} index={i} t={t} />
                          ))}
                        </div>
                      </section>
                    ) : (
                      allIssues.length > 0 && (
                        <div className={cn(CARD, "p-5")}>
                          <h3 className="text-sm font-bold text-slate-800 mb-3">Issues</h3>
                          <ul className="space-y-2">
                            {allIssues.map((issue, i) => (
                              <li key={i} className="flex items-start gap-2 text-[13px] text-slate-800">
                                <SeverityBadge severity={issue.severity} t={t} />
                                <span className="font-medium">{issue.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    )}

                    {/* Raw parsed accordion */}
                    <div className={cn(CARD, "overflow-hidden hover:border-slate-350 transition-all duration-200")}>
                      <button
                        type="button"
                        onClick={() => setRawOpen(!rawOpen)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <div>
                          <h3 className="text-xs font-bold text-slate-800">{t("review.rawParsedTitle")}</h3>
                          <p className="text-[11px] text-[#787774] mt-0.5">{t("review.rawParsedDesc")}</p>
                        </div>
                        {rawOpen ? <ChevronUp className="w-4 h-4 text-[#787774]" /> : <ChevronDown className="w-4 h-4 text-[#787774]" />}
                      </button>
                      {rawOpen && (
                        <div className="border-t border-[#EAEAEA] p-4 bg-slate-50/30">
                          <pre className="text-[10px] font-mono text-[#787774] leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                            {JSON.stringify(reviewData?.parsedCv ?? {}, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'skills' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Skill chips */}
                    {reviewData?.skills_extracted && reviewData.skills_extracted.length > 0 && (
                      <SkillsExtractedCard skills={reviewData.skills_extracted} />
                    )}

                    {/* Skill relevance */}
                    {reviewData?.skills_relevance_breakdown && (
                      <SkillsRelevanceCard breakdown={reviewData.skills_relevance_breakdown} />
                    )}

                    {/* Evidence Ledger */}
                    {reviewData?.evidence_ledger?.items?.length ? (
                      <EvidenceLedgerCard ledger={reviewData.evidence_ledger} />
                    ) : null}

                    {/* GitHub Evidence */}
                    <GithubEvidence cvId={lastCvId} document={reviewData?.document} />
                  </div>
                )}

                {activeTab === 'market' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Job Recommendations */}
                    <JobRecommendations cvId={lastCvId} />

                    {/* AI trends insight */}
                    <AiTrendsInsight cvId={lastCvId} role={targetRole} />

                    {/* Skill gaps trends */}
                    <SkillGapTrends cvId={lastCvId} />

                    {/* Interview preparation pack */}
                    <InterviewPrepPack cvId={lastCvId} role={targetRole} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Document Preview (Sticky) */}
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <DocumentPreview />
        </aside>
      </div>

      {/* Small Clean Footer instead of large CTA block */}
      {!showJdInput && (
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-[#787774]">
          <p>SkillBridge CV Diagnosis Report</p>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 font-semibold text-[#787774] hover:text-slate-800 hover:underline transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {t("review.startOver")}
          </button>
        </div>
      )}
    </div>
  );
}
