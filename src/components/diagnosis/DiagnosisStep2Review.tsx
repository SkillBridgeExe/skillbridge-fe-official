import { useState, useEffect, useCallback } from "react";
import { usePostHog } from "@posthog/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RotateCcw, ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from "lucide-react";
import { DocumentPreview } from "./DocumentPreview";
import { JobDescriptionInput } from "./JobDescriptionInput";
import { EvidenceLedgerCard, SkillsExtractedCard, SkillsRelevanceCard, TopSummaryCard } from "./DiagnosisInsights";
import { ScoreRail } from "./report/ScoreRail";
import { CheckGroup } from "./report/CheckGroup";
import { buildDiagnosisReport } from "@/lib/diagnosis-report";
import { seedBuilderFromDocument } from "./edit-in-builder";
import { ExtractionQualityBanner } from "./ExtractionQualityBanner";
import { JobRecommendations } from "./JobRecommendations";
import { SkillGapTrends } from "./SkillGapTrends";
import { AiTrendsInsight } from "./AiTrendsInsight";
import { InterviewPrepPack } from "./InterviewPrepPack";
import { GithubEvidence } from "./GithubEvidence";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCompareJdMutation, useInterviewPlanQuery, useGapReportQuery } from "@/hooks/use-diagnosis";
import { getApiErrorCode, getApiErrorMessage, isThrottledError } from "@/lib/api-error";
import { extractAiGateCode } from "@/lib/ai-input-gate";
import type { CvIssue } from "@shared/api";
import type { DiagnosisChatFocus } from "@/types/companion";
import { useCompanionStore } from "@/store/useCompanionStore";
import { pickTopCompletenessGap, completenessSummary, dimensionIssueSlice } from "@/components/companion/skills/diagnosis-review";
import { useElementIssuesCompanion } from "@/components/companion/skills/useElementIssuesCompanion";
import {
  CHAT_CONTEXT_ID,
  useDiagnosisChatCompanion,
} from "@/components/companion/skills/useDiagnosisChatCompanion";
import type { CheckRowData } from "@/lib/diagnosis-report";
/* ── Design tokens (§0b DESIGN SPEC) ── */
const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

const bandOf = (score: number) =>
  score >= 70
    ? { key: "review.band.strong", chip: "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/5" }
    : score >= 50
      ? { key: "review.band.watch", chip: "bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm shadow-amber-500/5" }
      : { key: "review.band.priority", chip: "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm shadow-rose-500/5" };

interface DiagnosisStep2ReviewProps {
  activeTab: 'audit' | 'cv' | 'market';
  setActiveTab: (tab: 'audit' | 'cv' | 'market') => void;
}

export function DiagnosisStep2Review({ activeTab }: DiagnosisStep2ReviewProps) {
  const { t, i18n } = useTranslation("diagnosis");
  const {
    reviewData,
    apiError,
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
  const dimensions = reviewData?.dimensions ?? [];

  /* ── A4: Unusable-quality gate (replicates Step3 pattern) ── */
  const isUnusable = reviewData?.extraction_quality?.input_quality === "unusable";


  /* ── Distribute issues across dim cards (shared helper = single source of
     truth; the companion's commentary reuses dimensionIssueSlice so its tips are
     byte-identical to these cards'). ── */
  const allIssues = reviewData?.issues ?? [];
  const issueGroups: CvIssue[][] = dimensions.length > 0
    ? dimensions.map((_, i) => dimensionIssueSlice(reviewData, i))
    : [allIssues];
  const reportGroups = buildDiagnosisReport(reviewData, t, issueGroups);

  const [rawOpen, setRawOpen] = useState(false);


  const issuesCount = reviewData?.bullet_feedback?.filter(fb =>
    fb.quantified === false ||
    fb.weakOpener === true ||
    fb.verbFirst === false ||
    fb.firstPerson === true
  ).length ?? 0;

  const handleEditOriginal = () => seedBuilderFromDocument(reviewData?.document);

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
  const chat = useDiagnosisChatCompanion(reviewData, chatFocus, revealCard, lastCvId);
  // Wave 2 entry point: "ask the dolphin about THIS dimension" — prefill + send the
  // code-authored question and force the bubble open (explainProgress recipe).
  const askDimension = useCallback(
    (item: CheckRowData) => {
      chat.sendQuestion(
        t("companion.chat.askDimensionQ", { name: item.label, score: item.score }),
        "cv_audit",
      );
      useCompanionStore.getState().activateContext(CHAT_CONTEXT_ID);
      useCompanionStore.setState({ bubbleOpen: true });
    },
    [chat, t],
  );
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
      suppressAutoOpen: true,
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

  return (
    <div className="h-full flex flex-col lg:flex-row select-none overflow-hidden animate-in fade-in duration-500">
      {/* LEFT COLUMN: ScoreRail (Width = 300px, border-r, bg-white) */}
      {!isUnusable && (
        <aside className="w-full lg:w-[300px] lg:min-w-[300px] lg:max-w-[300px] border-r border-[#EAEAEA] bg-white p-6 flex flex-col shrink-0 overflow-hidden h-full">
          <ScoreRail
            overallScore={overallCvScore}
            groups={reportGroups}
            breakdown={reviewData?.breakdown}
            verdictMessage=""
          />
        </aside>
      )}

      {/* RIGHT COLUMN: Detail Report & Interactive Content */}
      <div className="flex-1 lg:overflow-y-auto lg:h-full custom-scrollbar bg-[#FCFCFD] p-6 lg:p-8">
        {apiError && (
          <div className={cn(CARD, "mb-6 border-[#E3E0D8] bg-[#FBFBFA]")}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#956400]" />
              <p className="min-w-0 flex-1 text-[13px] text-[#787774] font-medium">{apiError}</p>
              <button
                type="button"
                onClick={reset}
                className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-primary hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t("review.startOver")}
              </button>
            </div>
          </div>
        )}

        {/* Extraction Quality Banner */}
        <ExtractionQualityBanner quality={reviewData?.extraction_quality} />

        {isUnusable ? (
          <div className={cn(CARD, "mt-6 p-6 text-center space-y-4 max-w-2xl mx-auto")}>
            <AlertTriangle className="w-6 h-6 text-[#956400] mx-auto" />
            <h3 className="text-sm font-bold text-[#2F3437]">
              {t("degraded.unusableTitle")}
            </h3>
            <p className="text-xs text-[#787774] leading-relaxed max-w-md mx-auto">
              {t("degraded.unusableBody")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="gap-1.5 text-xs rounded-full"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("degraded.unusableCta", { defaultValue: "Upload a clearer CV" })}
            </Button>
          </div>
        ) : (
          <div className="w-full px-2 lg:px-4">
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
                {activeTab === 'audit' && (
                  <div className="animate-in fade-in duration-300 space-y-6">
                    {/* Check groups */}
                    <div className="min-w-0 space-y-6">
                      {/* Top Summary prioritized checklist */}
                      {reviewData?.top_summary && (
                        <div className="space-y-4">
                          {/* Priority strip dense line */}
                          <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-[#2F3437] py-2 border-b border-[#EAEAEA] mb-2">
                            <span className="font-mono font-black text-[15px]">{overallCvScore}/100</span>
                            <span className={cn("px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider shrink-0", bandOf(overallCvScore).chip)}>
                              {t(bandOf(overallCvScore).key)}
                            </span>
                            <span className="text-[#EAEAEA] mx-1">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById("top-summary-checklist");
                                if (el) {
                                  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
                                  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
                                }
                              }}
                              className="text-[#00AEEF] hover:underline font-bold"
                            >
                              {t("review.prioritizedActionsCount", { count: reviewData.top_summary.prioritized_actions.length, defaultValue: `${reviewData.top_summary.prioritized_actions.length} việc nên sửa trước` })}
                            </button>
                          </div>
                          {reviewData.top_summary.headline && (
                            <p className="text-[13px] text-[#787774] truncate" title={reviewData.top_summary.headline}>
                              {reviewData.top_summary.headline}
                            </p>
                          )}
                          
                          <div id="top-summary-checklist" className="scroll-mt-24">
                            <TopSummaryCard summary={reviewData.top_summary} />
                          </div>
                        </div>
                      )}

                      {/* CheckGroups */}
                      {reportGroups.map((group) => (
                        <CheckGroup key={group.id} group={group} onAskDimension={askDimension}>
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

                {activeTab === 'cv' && (
                  <div className="animate-in fade-in duration-300 space-y-6">
                    {/* Header bar: Issues Count & Edit button */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-xl border border-[#EAEAEA] shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", issuesCount > 0 ? "bg-[#9F2F2D]" : "bg-[#346538]")} />
                        <p className="text-sm font-semibold text-[#2F3437]">
                          {issuesCount > 0
                            ? t("review.issuesMarked", { count: issuesCount })
                            : t("review.noIssuesMarked")
                          }
                        </p>
                      </div>
                      <Button
                        onClick={handleEditOriginal}
                        size="sm"
                        className="bg-[#00AEEF] hover:bg-[#049bd7] text-white font-bold px-4 h-9 rounded-lg text-xs transition-colors shrink-0"
                      >
                        {t("preview.editOriginal")}
                      </Button>
                    </div>

                    <div className="w-full max-w-6xl mx-auto bg-white rounded-xl border border-[#EAEAEA] p-6 shadow-sm">
                      <DocumentPreview hideEditOriginal />
                    </div>
                  </div>
                )}

                {activeTab === 'market' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <JobRecommendations cvId={lastCvId} />

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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
