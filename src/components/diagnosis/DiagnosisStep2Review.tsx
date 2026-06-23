import { useState, useEffect } from "react";
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
import { useCompareJdMutation, useInterviewPlanQuery, useGapReportQuery } from "@/hooks/use-diagnosis";
import { getApiErrorMessage } from "@/lib/api-error";
import { extractAiGateCode } from "@/lib/ai-input-gate";
import type { ReviewDimension, CvIssue, CanonicalCvDocument } from "@shared/api";
import { VerdictHero, SectionRule, Chapter, StatRow, EditorialTabNav } from "./editorial";
import { useCompanionStore } from "@/store/useCompanionStore";
import { pickTopCompletenessGap, completenessSummary, dimensionIssueSlice } from "@/components/companion/skills/diagnosis-review";
import { useElementIssuesCompanion } from "@/components/companion/skills/useElementIssuesCompanion";
import { useDiagnosisChatCompanion } from "@/components/companion/skills/useDiagnosisChatCompanion";

/* ── Design tokens (§0b DESIGN SPEC) ── */
const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";
const SEV = {
  high:   "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]",
  medium: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
  low:    "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
} as const;

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
      id={`dim-${dim.key}`}
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
              className="mt-2 inline-flex items-center gap-1 rounded text-xs font-bold text-ink-accent hover:underline focus-visible:ring-2 focus-visible:ring-ink-accent/40"
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
    builder.setSeedSourceCvId(lastCvId ?? null);
    if (targetRole) builder.setCareerTarget("targetPosition", getRoleLabel(targetRole));
    setStep("builder");
  };

  const overallCvScore = reviewData?.overallScore ?? 0;
  const atsScore = reviewData?.breakdown.ats ?? 0;
  const dimensions = reviewData?.dimensions ?? [];

  /* ── Dynamic UX copy (HONESTY: band copy from existing keys) ── */
  const scoreMessage = overallCvScore >= 70
    ? t("review.scoreMsg.excellent")
    : overallCvScore >= 55
      ? t("review.scoreMsg.good")
      : overallCvScore >= 40
        ? t("review.scoreMsg.fair")
        : t("review.scoreMsg.poor");

  const scoreLabel = t("review.heroTitle");

  /* ── Distribute issues across dim cards (shared helper = single source of
     truth; the companion's commentary reuses dimensionIssueSlice so its tips are
     byte-identical to these cards'). ── */
  const allIssues = reviewData?.issues ?? [];
  const issueGroups: CvIssue[][] = dimensions.length > 0
    ? dimensions.map((_, i) => dimensionIssueSlice(reviewData, i))
    : [allIssues];

  const [rawOpen, setRawOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'skills' | 'market'>('audit');

  /* ── Companion Pillar 1+2: anchored per-element issues (boundary = parse-done) ──
     The detector layer runs off reviewData (completeness/parse-quality/listed-no-evidence)
     plus jdMatch + the gap report when a JD has been compared. When real issues exist,
     the diagnosis:issue context owns the bubble and the legacy review nudge gates off. */
  const matchId = reviewData?.jdMatch?.matchId;
  const gapReportQuery = useGapReportQuery(matchId, diagnosisLang);
  // Fix D: wait for the gap-report query to settle before the first scan when it
  // is enabled (a JD has been compared). Disabled (no matchId) → isLoading=false →
  // a gap-less scan runs immediately (legitimate honest-empty for gap detectors).
  const issuesReady = !!reviewData?.document && !gapReportQuery.isLoading;
  // Auto-surfacing disabled (owner decision 06-23): this no longer registers/activates
  // the diagnosis:issue context — kept mounted so the detectors stay wired for future
  // chat grounding. The calm corner chat advisor below is the SOLE diagnosis context.
  useElementIssuesCompanion(
    { jdMatch: reviewData?.jdMatch ?? null, reviewData: reviewData ?? null, gapReport: gapReportQuery.data ?? null },
    issuesReady,
  );
  // ── Companion: calm corner chat advisor (the ONLY diagnosis context now) ──
  useDiagnosisChatCompanion(reviewData);
  // The chat advisor owns the bubble while it is registered → the legacy completeness
  // nudge gates off whenever the chat context is live (single-active invariant).
  const chatContextActive = useCompanionStore((s) => !!s.contexts["diagnosis:chat"]);

  /* ── Companion: Step-2 review completeness nudge (#16) ── */
  const completenessGap = pickTopCompletenessGap(reviewData?.document);
  const summary = completenessSummary(reviewData?.document);

  useEffect(() => {
    const store = useCompanionStore.getState();
    // Calm corner advisor (owner decision 06-23): the chat context is the SOLE
    // diagnosis context — the legacy completeness nudge stays gated off whenever the
    // chat advisor is live (single-active). Code retained for future reuse.
    if (!completenessGap || !reviewData?.document || chatContextActive) {
      store.unregisterContext("diagnosis:review");
      return;
    }
    store.registerContext({
      id: "diagnosis:review",
      priority: 10,
      getTurn: () => ({
        skill: "diagnosis_review",
        props: {
          message: t(`companion.review.gap.${completenessGap}`),
          ctaLabel: t("companion.review.cta"),
          onCta: () => {
            useDiagnosisStore.getState().setStep("builder");
            useCompanionStore.getState().dismissActive();
          },
        },
      }),
    });
    store.activateContext("diagnosis:review");
    return () => useCompanionStore.getState().unregisterContext("diagnosis:review");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completenessGap, summary.experiences, summary.skills, chatContextActive]);

  const tabItems = [
    { key: "audit", label: t("review.tabs.audit"), icon: <FileText className="w-4 h-4" /> },
    { key: "skills", label: t("review.tabs.skills"), icon: <Brain className="w-4 h-4" /> },
    { key: "market", label: t("review.tabs.market"), icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <div className="animate-in fade-in duration-500" style={{ '--tw-translate-y': '12px' } as React.CSSProperties}>
      {/* Back button */}
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm font-semibold text-[#787774] hover:text-ink-accent mb-6 transition-colors group focus-visible:ring-2 focus-visible:ring-ink-accent/40 rounded w-fit"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> {t("review.backToUpload")}
      </button>

      {apiError && (
        <div className={cn(CARD, "mb-6 border-[#F6D4D5] bg-[#FDEBEC]")}>
          <div className="p-4 text-sm text-[#9F2F2D] font-medium">{apiError}</div>
        </div>
      )}

      {/* ── VerdictHero (replaces CircularScoreGauge + confetti) ── */}
      <VerdictHero
        target={overallCvScore}
        label={scoreLabel}
        verdictMessage={scoreMessage}
        isJdMode={false}
      />

      {/* ── StatRow (replaces 3 dashboard cards) ── */}
      <div className="flex justify-center">
        <StatRow
          score={overallCvScore}
          atsScore={atsScore}
          role={targetRole ? getRoleLabel(targetRole) : "N/A"}
          scoreMessage={scoreLabel}
          atsNote={t("review.atsNote")}
        />
      </div>

      {/* Quick Actions — i18n (was hardcoded Vietnamese) */}
      <div className="flex justify-center gap-3 mt-2 mb-6">
        <Button
          onClick={handleEditCv}
          size="sm"
          className="rounded-lg gap-1.5 text-xs font-bold bg-primary text-white hover:bg-primary/90 active:scale-[0.98] transition-all justify-center shadow-sm"
        >
          <Pencil className="w-3.5 h-3.5" /> {t("review.quickPanel.editCta")}
        </Button>
        <Button
          onClick={() => setShowJdInput(true)}
          size="sm"
          variant="outline"
          className="rounded-lg gap-1.5 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-700 active:scale-[0.98] transition-all justify-center"
        >
          <Briefcase className="w-3.5 h-3.5" /> {t("review.quickPanel.compareCta")}
        </Button>
      </div>

      <SectionRule />

      {/* Honest input-quality disclosure — renders only when the extracted text looks unreliable. */}
      <ExtractionQualityBanner quality={reviewData?.extraction_quality} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] mt-6">
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
              {/* Tab selector — Editorial underline */}
              <EditorialTabNav
                tabs={tabItems}
                active={activeTab}
                onChange={(key) => setActiveTab(key as 'audit' | 'skills' | 'market')}
              />

              {/* Tab Panel contents */}
              <div className="space-y-5">
                {activeTab === 'audit' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Top Summary prioritized checklist */}
                    {reviewData?.top_summary && (
                      <Chapter kicker={t("review.band.priority")} title={reviewData.top_summary.headline}>
                        <TopSummaryCard summary={reviewData.top_summary} />
                      </Chapter>
                    )}

                    <SectionRule />

                    {/* Breakdown Dimension Cards */}
                    {dimensions.length > 0 ? (
                      <Chapter kicker={t("review.breakdownTitle")} title={t("review.breakdownDesc")}>
                        <div className="flex items-center gap-2 -mt-2 mb-1">
                          <span className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#787774] shadow-sm">
                            {t("review.priorityCount", { count: allIssues.length })}
                          </span>
                        </div>
                        <div className="grid gap-3">
                          {dimensions.map((dim, i) => (
                            <DimensionCard key={dim.key} dim={dim} issues={issueGroups[i] ?? []} index={i} t={t} />
                          ))}
                        </div>
                      </Chapter>
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
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/50 transition-colors focus-visible:ring-2 focus-visible:ring-ink-accent/40"
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
                      <Chapter kicker={t("review.tabs.skills")} title="">
                        <SkillsExtractedCard skills={reviewData.skills_extracted} />
                      </Chapter>
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
                  <div className="space-y-0 animate-in fade-in duration-300">
                    {/* Job Recommendations */}
                    <Chapter kicker="01" title="">
                      <JobRecommendations cvId={lastCvId} />
                    </Chapter>

                    <SectionRule className="my-6" />

                    {/* AI trends insight */}
                    <Chapter kicker="02" title="">
                      <AiTrendsInsight cvId={lastCvId} role={targetRole} />
                    </Chapter>

                    <SectionRule className="my-6" />

                    {/* Skill gaps trends */}
                    <Chapter kicker="03" title="">
                      <SkillGapTrends cvId={lastCvId} />
                    </Chapter>

                    <SectionRule className="my-6" />

                    {/* Interview preparation pack */}
                    <Chapter kicker="04" title="">
                      <InterviewPrepPack cvId={lastCvId} role={targetRole} />
                    </Chapter>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Document Preview (Sticky) — W25 does NOT touch DocumentPreview internals */}
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <DocumentPreview />
        </aside>
      </div>

      {/* Small Clean Footer */}
      {!showJdInput && (
        <div className="mt-8 pt-6 border-t border-[#EAEAEA] flex items-center justify-between text-xs text-[#787774]">
          <p>{t("review.footerNote")}</p>
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
