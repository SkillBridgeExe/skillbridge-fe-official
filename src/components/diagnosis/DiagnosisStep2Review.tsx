import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Download, RotateCcw, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { DocumentPreview } from "./DocumentPreview";
import { JobDescriptionInput } from "./JobDescriptionInput";
import { SkillsExtractedCard, SkillsRelevanceCard, TopSummaryCard } from "./DiagnosisInsights";
import { JobRecommendations } from "./JobRecommendations";
import { SkillGapTrends } from "./SkillGapTrends";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCompareJdMutation } from "@/hooks/use-diagnosis";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ReviewDimension, CvIssue } from "@shared/api";

/* ── Design tokens (§0b DESIGN SPEC) ── */
const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";
const SEV = {
  high:   "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]",
  medium: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
  low:    "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
} as const;

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

/** Severity badge */
function SeverityBadge({ severity, t }: { severity: "high" | "medium" | "low"; t: (key: string) => string }) {
  return (
    <span className={cn("text-[11px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0", SEV[severity])}>
      {t(`review.severity.${severity}`)}
    </span>
  );
}

/** Collapsible dimension card */
function DimensionCard({ dim, issues, index, t }: { dim: ReviewDimension; issues: CvIssue[]; index: number; t: (key: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const hasLongRationale = dim.rationale.length > 120;

  return (
    <div
      className={cn(CARD, "p-5 animate-in fade-in duration-500")}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold text-[#2F3437]">{t(`review.dims.${dim.key}`)}</h3>
        <span className="font-mono tabular-nums text-xs text-[#787774] shrink-0">{Math.round(dim.score20 * 5)}%</span>
      </div>
      <DimScoreBar score20={dim.score20} />

      {/* Rationale */}
      <p className={cn("text-xs text-[#787774] mt-3 leading-relaxed", !expanded && hasLongRationale && "line-clamp-3")}>
        {dim.rationale}
      </p>
      {hasLongRationale && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-semibold text-primary hover:underline mt-1 focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
        >
          {expanded ? t("review.seeLess") : t("review.seeMore")}
        </button>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-[#F1F1EF] pt-3">
          {issues.map((issue, i) => (
            <li key={i} className="text-[13px] text-[#2F3437]">
              <div className="flex items-start gap-2">
                <SeverityBadge severity={issue.severity} t={t} />
                <span className="font-medium leading-relaxed">{issue.detail}</span>
              </div>
              {issue.suggestion && (
                <p className="ml-[calc(theme(spacing.1.5)+theme(spacing.12))] mt-1 text-[11px] text-[#787774] leading-snug">
                  {issue.suggestion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DiagnosisStep2Review() {
  const { t } = useTranslation("diagnosis");
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
      const message = getApiErrorMessage(error, "Failed to compare CV with job description.");
      setHasActivatedJdMode(false);
      setReviewData(previousReviewData ?? null);
      setApiError(message);
      toast({ title: t("review.toastFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      setLoadingProgress(0);
    }
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

  /* ── Raw parsed accordion ── */
  const [rawOpen, setRawOpen] = useState(false);

  return (
    <div className="animate-in fade-in duration-500" style={{ '--tw-translate-y': '12px' } as React.CSSProperties}>
      {/* Back button */}
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm font-semibold text-[#787774] hover:text-primary mb-4 transition-colors group focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> {t("review.backToUpload")}
      </button>

      {apiError && (
        <div className={cn(CARD, "mb-6 border-[#F6D4D5] bg-[#FDEBEC]")}>
          <div className="p-4 text-sm text-[#9F2F2D] font-medium">{apiError}</div>
        </div>
      )}

      {/* Lead: "fix these first" */}
      {reviewData?.top_summary && <TopSummaryCard summary={reviewData.top_summary} />}

      {/* ── Overall Score Hero ── */}
      <div className={cn(CARD, "mb-6 p-6")}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Flat mono score */}
          <div className="flex flex-col items-center shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-[56px] font-mono tabular-nums font-black text-[#2F3437] leading-none tracking-[-0.02em]">
                {displayedScore}
              </span>
              <span className="text-sm text-[#787774] font-medium">/100</span>
            </div>
            <BandPill score={overallCvScore} t={t} />
            {overallCvScore >= 70 && (
              <p className="text-[12px] text-[#346538] font-medium mt-1 text-center max-w-[150px] leading-snug">
                {t("review.praiseHigh")}
              </p>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-[#2F3437]">{t("review.heroTitle")}</h2>
            {/* ATS mini */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">{t("review.atsTitle")}</span>
              <span className="font-mono tabular-nums text-xs text-[#2F3437] font-semibold">{atsScore}%</span>
              <div className="w-16 h-1 bg-[#F1F1EF] rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", atsScore >= 70 ? "bg-[#346538]" : atsScore >= 50 ? "bg-[#956400]" : "bg-[#9F2F2D]")}
                  style={{ width: `${atsScore}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-[#787774] mt-1">{t("review.atsNote")}</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-lg gap-2 text-xs font-semibold border-[#EAEAEA] text-[#2F3437] hover:bg-[#F1F1EF] active:scale-[0.98] transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Download className="w-3.5 h-3.5" /> {t("review.exportReport")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Dimension Cards + Insights */}
        <div className="space-y-4">
          {/* 4 Dimension cards from BE */}
          {dimensions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dimensions.map((dim, i) => (
                <DimensionCard key={dim.key} dim={dim} issues={issueGroups[i] ?? []} index={i} t={t} />
              ))}
            </div>
          ) : (
            /* Fallback: render issues as flat list if no dimensions */
            allIssues.length > 0 && (
              <div className={cn(CARD, "p-5")}>
                <h3 className="text-sm font-bold text-[#2F3437] mb-3">Issues</h3>
                <ul className="space-y-2">
                  {allIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#2F3437]">
                      <SeverityBadge severity={issue.severity} t={t} />
                      <span className="font-medium">{issue.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}

          {/* Skill chips */}
          {reviewData?.skills_extracted && reviewData.skills_extracted.length > 0 && (
            <SkillsExtractedCard skills={reviewData.skills_extracted} />
          )}

          {/* Skill relevance */}
          {reviewData?.skills_relevance_breakdown && (
            <SkillsRelevanceCard breakdown={reviewData.skills_relevance_breakdown} />
          )}

          {/* Raw parsed accordion */}
          <div className={cn(CARD, "overflow-hidden")}>
            <button
              type="button"
              onClick={() => setRawOpen(!rawOpen)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-[#FBFBFA] transition-colors focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div>
                <h3 className="text-sm font-bold text-[#2F3437]">{t("review.rawParsedTitle")}</h3>
                <p className="text-xs text-[#787774] mt-0.5">{t("review.rawParsedDesc")}</p>
              </div>
              {rawOpen ? <ChevronUp className="w-4 h-4 text-[#787774]" /> : <ChevronDown className="w-4 h-4 text-[#787774]" />}
            </button>
            {rawOpen && (
              <div className="border-t border-[#EAEAEA] p-4">
                <pre className="text-[11px] font-mono text-[#787774] leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(reviewData?.parsedCv ?? {}, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Document Preview (Sticky) */}
        <DocumentPreview />
      </div>

      {/* Moat L2 — top job thật + skill-gap thị trường (W8) */}
      <JobRecommendations cvId={lastCvId} />
      <SkillGapTrends cvId={lastCvId} />

      {/* CTA Row */}
      <div className="mt-8 pt-6 border-t border-[#EAEAEA]">
        {!showJdInput ? (
          <div className={cn(CARD, "p-5 flex flex-col sm:flex-row items-center justify-between gap-4")}>
            <div>
              <p className="font-bold text-[#2F3437] text-base">{t("review.deeperTitle")}</p>
              <p className="text-sm text-[#787774] mt-0.5">{t("review.deeperDesc")}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button
                variant="ghost"
                onClick={reset}
                className="rounded-lg text-sm font-semibold text-[#787774] hover:bg-[#F1F1EF] gap-2 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <RotateCcw className="w-4 h-4" /> {t("review.startOver")}
              </Button>
              <Button
                onClick={() => setShowJdInput(true)}
                className="rounded-lg px-6 bg-primary hover:bg-primary/90 text-white shadow-sm text-sm font-semibold gap-2 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Briefcase className="w-4 h-4" /> {t("review.compareJd")}
              </Button>
            </div>
          </div>
        ) : (
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
