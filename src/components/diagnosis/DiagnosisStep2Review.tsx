import { useState, useEffect, useCallback } from "react";
import { usePostHog } from "@posthog/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, RotateCcw, Briefcase, ChevronDown, ChevronUp, TrendingUp, FileText } from "lucide-react";
import { DocumentPreview } from "./DocumentPreview";
import { JobDescriptionInput } from "./JobDescriptionInput";
import { EvidenceLedgerCard, SkillsExtractedCard, SkillsRelevanceCard, TopSummaryCard } from "./DiagnosisInsights";
import { ScoreRail } from "./report/ScoreRail";
import { CheckGroup } from "./report/CheckGroup";
import { buildDiagnosisReport } from "@/lib/diagnosis-report";
import { ExtractionQualityBanner } from "./ExtractionQualityBanner";
import { JobRecommendations } from "./JobRecommendations";
import { SkillGapTrends } from "./SkillGapTrends";
import { AiTrendsInsight } from "./AiTrendsInsight";
import { InterviewPrepPack } from "./InterviewPrepPack";
import { GithubEvidence } from "./GithubEvidence";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { getRoleLabel } from "@/constants/it-roles";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCompareJdMutation, useInterviewPlanQuery, useGapReportQuery } from "@/hooks/use-diagnosis";
import { getApiErrorCode, getApiErrorMessage, isThrottledError } from "@/lib/api-error";
import { extractAiGateCode } from "@/lib/ai-input-gate";
import type { CvIssue } from "@shared/api";
import type { DiagnosisChatFocus } from "@/types/companion";
import { VerdictHero, Chapter, StatRow, EditorialTabNav } from "./editorial";
import { useCompanionStore } from "@/store/useCompanionStore";
import { pickTopCompletenessGap, completenessSummary, dimensionIssueSlice } from "@/components/companion/skills/diagnosis-review";
import { useElementIssuesCompanion } from "@/components/companion/skills/useElementIssuesCompanion";
import { useDiagnosisChatCompanion } from "@/components/companion/skills/useDiagnosisChatCompanion";

/* ── Design tokens (§0b DESIGN SPEC) ── */
const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

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
  const posthog = usePostHog();
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

    const scanProperties = {
      mode: "cv_jd",
      cv_source: "existing_review",
      cv_id: lastCvId,
      target_role: targetRole,
    };
    posthog?.capture("cv_scan_started", scanProperties);

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
      posthog?.capture("cv_scan_completed", {
        ...scanProperties,
        match_id: jdMatch.matchId,
        match_score: jdMatch.matchScore,
      });
      setReviewData(previousReviewData ? { ...previousReviewData, jdMatch } : null);
      setHasActivatedJdMode(true);
      setApiError(null);
      setStep("results");
    } catch (error) {
      const gateCode = extractAiGateCode(error);
      const message =
        isThrottledError(error)
          ? t("upload.throttled")
          : gateCode === "JD_CONTENT_INSUFFICIENT"
            ? t("aiGate.jdThin")
            : gateCode === "CV_CONTENT_INSUFFICIENT"
              ? t("aiGate.cvUnreadable")
              : getApiErrorMessage(error, "Failed to compare CV with job description.");
      posthog?.capture("cv_scan_failed", {
        ...scanProperties,
        error_code: gateCode ?? getApiErrorCode(error) ?? "unknown",
      });
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
  const reportGroups = buildDiagnosisReport(reviewData, t, issueGroups);

  const [rawOpen, setRawOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'market'>('audit');

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
  // Tab → chat focus so the advisor's opener + answers are context-relevant to the
  // section in view. Switching tabs just swaps the opener text (same single context).
  const chatFocus: DiagnosisChatFocus =
    activeTab === "market" ? "market_careers" : "cv_audit";
  // Reveal a cited card — but NEVER auto-switch tabs. Only scroll to the card if it is
  // already mounted on the CURRENT tab. Force-switching tabs on a citation yanks the user
  // out of the section they're reading (e.g. asking a Market question and being teleported
  // to CV Audit because the answer cited a dimension) — disorienting and off-topic. If the
  // cited card lives on another tab, we simply don't scroll; the answer text still names it.
  const revealCard = useCallback((anchorId: string) => {
    if (typeof document === "undefined") return;
    // Cited anchor may live inside a collapsed CheckGroup — ask it to open first,
    // then scroll on the next frame once the row is mounted.
    window.dispatchEvent(new CustomEvent("sb-reveal-anchor", { detail: anchorId }));
    requestAnimationFrame(() => {
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(anchorId)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    });
  }, []);
  // Pass lastCvId so the advisor works on a CV-only scan (no JD match): when there's
  // no matchId, the hook/service post to the CV-only route grounded in the CV review.
  useDiagnosisChatCompanion(reviewData, chatFocus, revealCard, lastCvId);
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
    // Read chatLive FRESH from the store, not just the subscribed closure value: on
    // the mount pass `chatContextActive` is still false (the chat hook registers its
    // context in an effect that COMMITS AFTER this render), so trusting the closure
    // would let this legacy nudge briefly activate — stealing activeId and then
    // nulling it on cleanup, which leaves the chat bubble unreachable. The chat hook
    // is declared above this effect, so its registration has already committed here.
    const chatLive = chatContextActive || !!store.contexts["diagnosis:chat"];
    if (!completenessGap || !reviewData?.document || chatLive) {
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
        label={t("review.overallScore")}
        verdictMessage={scoreMessage}
        isJdMode={false}
        breakdown={reviewData?.breakdown}
        rubricBand={reviewData?.skills_relevance_breakdown?.rubric_band}
      />

      {/* ── Metadata & Actions ── */}
      <div className="mx-auto max-w-lg mt-1 mb-10 flex flex-col items-center gap-6">
        <StatRow
          score={overallCvScore}
          atsScore={atsScore}
          atsCheck={null} // Ngừng dùng AtsBreakdownPopover tại màn này
          role={targetRole ? getRoleLabel(targetRole) : "N/A"}
          scoreMessage={scoreLabel}
          atsNote={t("review.atsNote")}
        />

        <div className="flex w-full justify-center gap-4">
          <Button
            onClick={() => setShowJdInput(true)}
            size="sm"
            variant="outline"
            className="rounded-full gap-2 px-6 h-10 text-sm font-bold border-[#EAEAEA] hover:bg-[#FBFBFA] text-[#2F3437] active:scale-[0.98] transition-all"
          >
            <Briefcase className="w-4 h-4" /> {t("review.quickPanel.compareCta")}
          </Button>
        </div>
      </div>

      {/* Honest input-quality disclosure — renders only when the extracted text looks unreliable. */}
      <ExtractionQualityBanner quality={reviewData?.extraction_quality} />

      {/* Audit tab gets the full Jobscan anatomy at xl: rail | checks | document — three
          siblings on the page grid instead of a rail squeezed inside the tab column. */}
      <div
        className={cn(
          "grid grid-cols-1 gap-6 mt-6",
          activeTab === "audit" && !showJdInput
            ? "xl:grid-cols-[240px_minmax(0,1fr)_minmax(340px,380px)]"
            : "xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]",
        )}
      >
        {/* RAIL COLUMN (xl only, audit only) — below xl the rail renders inside the tab panel */}
        {activeTab === "audit" && !showJdInput && (
          <div className="hidden xl:block min-w-0">
            <ScoreRail
              overallScore={overallCvScore}
              groups={reportGroups}
              breakdown={reviewData?.breakdown}
            />
          </div>
        )}

        {/* MAIN COLUMN: Tabs & Active Panel */}
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
                onChange={(key) => setActiveTab(key as 'audit' | 'market')}
              />

              {/* Tab Panel contents */}
              <div className="space-y-5">
                {activeTab === 'audit' && (
                  <div className="animate-in fade-in duration-300 space-y-4">
                    {/* ScoreRail below xl (mobile chips / md sidebar-less) — at xl it lives on the page grid */}
                    <div className="xl:hidden">
                      <ScoreRail
                        overallScore={overallCvScore}
                        groups={reportGroups}
                        breakdown={reviewData?.breakdown}
                      />
                    </div>

                    {/* Check groups */}
                    <div className="min-w-0 space-y-4">
                      {/* Top Summary prioritized checklist */}
                      {reviewData?.top_summary && (
                        <Chapter kicker={t("review.band.priority")} title={reviewData.top_summary.headline}>
                          <TopSummaryCard summary={reviewData.top_summary} />
                        </Chapter>
                      )}

                      {/* CheckGroups */}
                      {reportGroups.map((group) => (
                        <CheckGroup key={group.id} group={group}>
                          {/* Custom slot for Skills */}
                          {group.id === "skills" && (
                            <div className="space-y-4 mt-4">
                              {reviewData?.skills_extracted && reviewData.skills_extracted.length > 0 && (
                                <SkillsExtractedCard skills={reviewData.skills_extracted} />
                              )}
                              {reviewData?.skills_relevance_breakdown && (
                                <SkillsRelevanceCard breakdown={reviewData.skills_relevance_breakdown} />
                              )}
                              {reviewData?.evidence_ledger?.items?.length ? (
                                <EvidenceLedgerCard ledger={reviewData.evidence_ledger} />
                              ) : null}
                              <GithubEvidence cvId={lastCvId} document={reviewData?.document} />
                            </div>
                          )}
                        </CheckGroup>
                      ))}

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
                  </div>
                )}

                {activeTab === 'market' && (
                  <div className="space-y-0 animate-in fade-in duration-300">
                    {/* Job Recommendations */}
                    <Chapter kicker="01" title="">
                      <JobRecommendations cvId={lastCvId} />
                    </Chapter>

                    {/* AI trends insight */}
                    <AiTrendsInsight cvId={lastCvId} role={targetRole} />

                    {/* Skill gaps trends */}
                    <SkillGapTrends cvId={lastCvId} />

                    {/* Interview preparation pack */}
                    <InterviewPrepPack
                      cvId={lastCvId}
                      role={targetRole}
                      onCompareJd={() => {
                        setShowJdInput(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
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
