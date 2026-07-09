import React, { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertCircle, AlertTriangle, X, ArrowLeft, Share2, Download,
  Sparkles, TrendingUp, Target, Shield, Code, Users,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip
} from "recharts";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { ENABLE_DIAGNOSIS_ADDONS } from "@/lib/runtime-config";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { downloadOriginalCvFile } from "@/services/diagnosis.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { TailorChecklist } from "./TailorChecklist";
import { GapReportCard } from "./GapReportCard";
import { MatchInterviewPlanCard } from "./MatchInterviewPlanCard";
import { RoadmapFromMatchSection } from "./RoadmapFromMatchSection";
import { VerdictHero, Ribbon, Chapter, SectionRule } from "./editorial";
import { NextStepsCard } from "./NextStepsCard";
import { ProgressBanner } from "./ProgressBanner";
import type { CvJdMatch, EvidenceLedger, EvidenceStrength, InferredSkill, SkillMatchItem } from "@shared/api";
import { useNextStepsQuery, useGapReportQuery, useMatchProgressQuery } from "@/hooks/use-diagnosis";
import { useCompanionStore } from "@/store/useCompanionStore";
import { pickTopNextStep, ctaForStep } from "@/components/companion/skills/diagnosis-results";
import { pickTopProveIt } from "@/components/companion/skills/prove-it";
import { useElementIssuesCompanion } from "@/components/companion/skills/useElementIssuesCompanion";
import { useDiagnosisChatCompanion, CHAT_CONTEXT_ID } from "@/components/companion/skills/useDiagnosisChatCompanion";
import { ScoreBreakdownPopover } from "./ScoreBreakdownPopover";
import { FitBadge } from "./FitBadge";

/* ── Design tokens (§0b — editorial W24) ── */
const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";
const MAX_INSIGHT_ITEMS = 3;

/** "sql_server" → "SQL Server" (từ ≤3 ký tự viết hoa cả từ — đủ cho các canonical satisfies hiện có). */
function prettyCanonical(canonical: string): string {
  return canonical
    .split("_")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function evidenceStrengthClass(strength: EvidenceStrength): string {
  if (strength === "demonstrated") return "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]";
  if (strength === "listed_only") return "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]";
  return "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]";
}

function findEvidenceStrength(skill: SkillMatchItem, ledger?: EvidenceLedger | null): EvidenceStrength | null {
  if (skill.status === "missing" || !skill.canonical_name || !ledger?.items?.length) return null;
  return ledger.items.find((item) => item.skill_canonical === skill.canonical_name)?.strength ?? null;
}

function truncateText(value: string, maxLength = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/* ── KeywordRow ── */
function KeywordRow({
  skill,
  index,
  t,
  evidenceStrength,
}: {
  skill: SkillMatchItem;
  index: number;
  t: (key: string, options?: Record<string, unknown>) => string;
  evidenceStrength?: EvidenceStrength | null;
}) {
  const statusConfig = {
    present: { icon: <CheckCircle2 className="w-4 h-4 text-[#346538]" />, badge: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]", label: t("results.found") },
    partial:  { icon: <AlertCircle  className="w-4 h-4 text-[#956400]" />, badge: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]", label: t("results.partial") },
    missing:  { icon: <X            className="w-4 h-4 text-[#9F2F2D]" />, badge: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]", label: t("results.missing") },
  }[skill.status];

  return (
    <div
      className="flex items-center gap-4 py-3 border-b border-[#F1F1EF] last:border-0 animate-in fade-in duration-500"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <div className="w-6 flex justify-center shrink-0">{statusConfig.icon}</div>
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-[#2F3437] truncate">{skill.name}</span>
          {evidenceStrength && (
            <span
              className={cn("hidden sm:inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold shrink-0", evidenceStrengthClass(evidenceStrength))}
              title={t(`evidence.strength.${evidenceStrength}`)}
            >
              {t(`evidence.strength.${evidenceStrength}`)}
            </span>
          )}
        </div>
        {typeof skill.gap_levels === "number" && skill.gap_levels > 0 && (
          <p className="mt-0.5 text-[11px] font-medium text-[#956400]">
            {t("matchDepth.gapLevels", { count: skill.gap_levels })}
          </p>
        )}
        {skill.satisfied_by && (
          // BE #51: requirement được thỏa bởi skill CON trên CV (sql ← SQL Server) — nói thật nguồn điểm.
          <p className="mt-0.5 text-[11px] font-medium text-[#787774]">
            {t("matchDepth.satisfiedBy", { from: prettyCanonical(skill.satisfied_by) })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 w-40 shrink-0">
        <div className="flex-1 h-1.5 bg-[#F1F1EF] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              skill.status === "present" ? "bg-[#346538]" : skill.status === "partial" ? "bg-[#956400]" : "bg-[#9F2F2D]"
            )}
            style={{ width: `${skill.cvScore}%`, transitionDelay: `${index * 60}ms` }}
          />
        </div>
        <span className="font-mono tabular-nums text-xs text-[#787774] w-9 text-right shrink-0">{skill.cvScore}%</span>
      </div>
      <div className="w-24 shrink-0 flex justify-end md:justify-center">
        <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded border w-[72px] text-center", statusConfig.badge)}>{statusConfig.label}</span>
      </div>
    </div>
  );
}

/* ── MatchDepthSummary (narrative panel for Chương 1) ── */
function MatchNarrative({
  jdMatch,
  t,
}: {
  jdMatch: CvJdMatch | null | undefined;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (!jdMatch?.scoring_breakdown) return null;
  const breakdown = jdMatch.scoring_breakdown;
  const coverage = Math.round((jdMatch.required_coverage ?? 0) * 100);
  const band = coverage >= 80 ? "strong" : coverage >= 60 ? "good" : coverage >= 40 ? "fair" : "low";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-[#2F3437]">{t("matchDepth.whyScore")}</h3>
      <div className="space-y-2 text-[13px] text-[#2F3437] leading-relaxed">
        <p>
          <span className="font-mono tabular-nums font-bold text-[#346538]">{breakdown.matched_count}</span> {t("results.matched")}
          {" · "}
          <span className="font-mono tabular-nums font-bold text-[#956400]">{breakdown.partial_count}</span> {t("results.partial")}
          {" · "}
          <span className="font-mono tabular-nums font-bold text-[#9F2F2D]">{breakdown.missing_count}</span> {t("results.missing")}
          {" · "}
          <span className="font-mono tabular-nums font-bold text-[#787774]">{coverage}%</span> {t("matchDepth.coverage")}
        </p>
        <p className="text-[12px] text-[#787774] leading-relaxed">{t(`matchDepth.bandRationale.${band}`)}</p>
      </div>
      {breakdown.cap_applied && (
        <p className="text-xs font-medium text-[#956400]">{t("matchDepth.capped")}</p>
      )}
    </div>
  );
}

function InferredSkillsBlock({
  skills,
  t,
}: {
  skills?: InferredSkill[];
  t: (key: string) => string;
}) {
  if (!skills?.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-[#2F3437]">{t("matchDepth.inferredTitle")}</h3>
      <p className="text-xs leading-relaxed text-[#787774]">{t("matchDepth.inferredHint")}</p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill.canonical_name}
            className="inline-flex items-center gap-1 rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] px-2.5 py-1 text-xs font-semibold text-[#2F3437]"
            title={skill.reason ?? undefined}
          >
            {skill.display_name}
            <span className="text-[10px] font-bold text-[#787774]">
              {t(`matchDepth.inferred.${skill.tag}`)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 *  MAIN COMPONENT — Editorial layout (W24)
 * ════════════════════════════════════════════════════════════════════════ */

export function DiagnosisStep3Results() {
  const { t, i18n } = useTranslation("diagnosis");
  const { goBack, scanAgain, skillTab, setSkillTab, reviewData, jobDescription, lastCvId, targetRole } = useDiagnosisStore();
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: t("results.shareCopied") });
    } catch {
      toast({ title: t("results.shareCopied"), description: window.location.href });
    }
  };

  const handleDownload = async () => {
    if (!lastCvId) return;
    try {
      const blob = await downloadOriginalCvFile(lastCvId);
      const ext = blob.type.includes("png") ? "png"
        : blob.type.includes("webp") ? "webp"
        : blob.type.includes("jpeg") || blob.type.includes("jpg") ? "jpg"
        : "pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `skillbridge-cv.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: t("results.downloadFailed"), description: getApiErrorMessage(err, ""), variant: "destructive" });
    }
  };

  const jdMatch = reviewData?.jdMatch;
  const isJdMode = Boolean(jdMatch);

  const hardSkills = jdMatch?.hardSkills ?? [];
  const softSkills = jdMatch?.softSkills ?? [];
  const activeSkills = skillTab === "hard" ? hardSkills : softSkills;
  const radarData = jdMatch?.radar ?? [];
  const strengths = (reviewData?.strengths ?? []).slice(0, MAX_INSIGHT_ITEMS).map((item) => truncateText(item));
  const criticalGaps = (jdMatch?.criticalGaps ?? reviewData?.issues.slice(0, MAX_INSIGHT_ITEMS).map((issue) => issue.title) ?? [])
    .slice(0, MAX_INSIGHT_ITEMS)
    .map((item) => truncateText(item));
  const actionPlan = (reviewData?.actionPlan ?? []).slice(0, MAX_INSIGHT_ITEMS).map((item) => truncateText(item));

  const matchScore = jdMatch?.matchScore ?? reviewData?.overallScore ?? 0;
  const scoreLabel = isJdMode ? t("results.scoreLabelMatch") : t("results.scoreLabelCv");
  const presentCount = hardSkills.filter((s) => s.status === "present").length;
  const missingCount = hardSkills.filter((s) => s.status === "missing").length;
  const partialCount = hardSkills.filter((s) => s.status === "partial").length;

  /* ── Dynamic UX copy (HONESTY: only existing band copy, no AI text) ── */
  const scoreMessage = matchScore >= 85
    ? t("results.scoreMsg.excellent")
    : matchScore >= 80
      ? t("results.scoreMsg.strong")
      : matchScore >= 50
        ? t("results.scoreMsg.decent")
        : t("results.scoreMsg.weak");

  /* ── Rubric Fallback Warning Strings ── */
  const unnormalizedSkillsList = jdMatch?.unnormalized_jd_requirements || [];
  const unnormalizedSkillNames = unnormalizedSkillsList
    .map((skill) => skill.raw_input || readLegacyName(skill))
    .filter(Boolean);
  const fallbackSkillsString = unnormalizedSkillNames.length > 5
    ? unnormalizedSkillNames.slice(0, 5).join(", ") + "…"
    : unnormalizedSkillNames.join(", ") || "...";

  /* ── Skill Details collapse ── */
  const [detailsOpen, setDetailsOpen] = useState(false);

  /* ── Companion: register results context (auto-pop once, honest-empty) ── */
  const nextStepsLang = i18n.language.startsWith("vi") ? "vi" : "en";
  const nextStepsQuery = useNextStepsQuery(jdMatch?.matchId, nextStepsLang);
  const topStep = pickTopNextStep(nextStepsQuery.data?.steps ?? []);

  /* ── Companion Pillar 1+2: anchored per-element issues (subsumes results/proveit) ──
     Fetch the gap report (gap_items + jd_intelligence) so the detector layer has
     its full inputs, then collect + register on data-loaded (boundary). When real
     issues exist, the hook gates off the legacy results/proveit contexts below. */
  const gapReportQuery = useGapReportQuery(jdMatch?.matchId, nextStepsLang);
  // Fix D: don't scan mid-flight. When the gap-report query is enabled (JD mode
  // with a matchId) the first collect must wait for it to settle, else the gap_item
  // / deal_breaker detectors run with gapReport=undefined → only 3 detectors → []
  // → no bubble. When the query is disabled (no matchId / add-ons off) a gap-less
  // scan is a legitimate honest-empty, so reviewData alone gates the scan.
  const gapReportSettled = !gapReportQuery.isLoading; // false only while actively fetching an enabled query
  const issuesReady = !!reviewData && gapReportSettled;
  // Fit verdict: the gap report ALWAYS carries `fit` on fresh reports, while the
  // persisted jdMatch.fit is often null on older matches — prefer the live report.
  const fitVerdict = gapReportQuery.data?.fit ?? jdMatch?.fit ?? null;
  // Auto-surfacing disabled (owner decision 06-23): this no longer registers/activates
  // the diagnosis:issue context — kept mounted so the detectors stay wired for future
  // chat grounding. The calm corner chat advisor below is the SOLE diagnosis context.
  useElementIssuesCompanion(
    { jdMatch: jdMatch ?? null, reviewData: reviewData ?? null, gapReport: gapReportQuery.data ?? null },
    issuesReady,
  );
  // ── Companion: calm corner chat advisor (the ONLY diagnosis context now) ──
  // Step 3 is a single Skill-Gap section → fixed focus so the advisor frames its
  // opener + answers around the gap results in view. Step 3 has no tabs, so the
  // reveal is a plain scroll (no-op-safe when the element doesn't exist).
  const revealCard = useCallback((anchorId: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  // Progress vs last scan (deterministic, no LLM) — feeds both the ProgressBanner
  // and the chat companion's progress-aware chip below.
  const progressQuery = useMatchProgressQuery(jdMatch?.matchId);
  /* Prove-it (#13): a JD-relevant skill is listed on the CV but lacks concrete
     evidence. The chat advisor turns this into a 0-LLM local coaching chip. */
  const provedItem = pickTopProveIt(
    jdMatch?.hardSkills ?? [],
    jdMatch?.softSkills ?? [],
    reviewData?.evidence_ledger,
  );
  // matchId already works here; pass lastCvId too so the advisor still chats on a
  // CV-only result view (no JD compared) via the CV-only route.
  const chat = useDiagnosisChatCompanion(
    reviewData,
    "gap_results",
    revealCard,
    lastCvId,
    progressQuery.data ?? null,
    provedItem,
  );
  // ProgressBanner "Giải thích thêm" — hand off to the chat advisor: prefill + send
  // the same grounded question the chip offers, and open the chat bubble.
  const explainProgress = useCallback(() => {
    chat.sendQuestion(t("companion.chat.progressChip"));
    useCompanionStore.getState().activateContext(CHAT_CONTEXT_ID);
    // Force bubble open even if dismissed (cf. CompanionShell.handleDolphinClick)
    useCompanionStore.setState({ bubbleOpen: true });
  }, [chat, t]);
  // The chat advisor owns the bubble while registered → the legacy results/proveit
  // nudges gate off whenever the chat context is live (single-active invariant).
  const chatContextActive = useCompanionStore((s) => !!s.contexts["diagnosis:chat"]);

  useEffect(() => {
    const store = useCompanionStore.getState();
    // Calm corner advisor (owner decision 06-23): the chat context is the SOLE
    // diagnosis context — the legacy next-step nudge stays gated off whenever the
    // chat advisor is live (single-active). Code retained for future reuse.
    // Read chatLive FRESH (not the stale subscribed closure): the chat hook above
    // registers diagnosis:chat in an effect that commits before this one, but the
    // subscribed `chatContextActive` is still false on the mount render — trusting it
    // would let this nudge activate + steal activeId, then null it on cleanup, leaving
    // the Step-3 chat bubble unreachable (same bug fixed in Step 2).
    const chatLive = chatContextActive || !!store.contexts["diagnosis:chat"];
    if (!topStep || provedItem || chatLive) {
      store.unregisterContext("diagnosis:results");
      return;
    }
    const cta = ctaForStep(topStep);
    store.registerContext({
      id: "diagnosis:results",
      priority: 10,
      anchorId: "gap-anchor",
      getTurn: () => ({
        skill: "diagnosis_results",
        props: {
          action: topStep.action,
          ctaKind: cta,
          onCta: () => {
            const el =
              document.getElementById(cta === "builder" ? "cv-builder-anchor" : "roadmap-anchor") ??
              document.getElementById("roadmap-anchor");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
            useCompanionStore.getState().dismissActive();
          },
        },
      }),
    });
    store.activateContext("diagnosis:results");
    return () => useCompanionStore.getState().unregisterContext("diagnosis:results");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topStep?.canonical, topStep?.action, provedItem?.skill_canonical, chatContextActive]);

  /* ── AI Insights Tab ── */
  const [insightTab, setInsightTab] = useState<"strengths" | "gaps">("strengths");

  /* ── Ribbon data ── */
  const coverage = jdMatch?.required_coverage != null
    ? Math.round(jdMatch.required_coverage * 100)
    : undefined;
  const capApplied = jdMatch?.scoring_breakdown?.cap_applied ?? false;

  /* ── Kicker text ── */
  const kickerText = targetRole
    ? t("editorial.kicker", { role: targetRole })
    : t("editorial.kickerGeneric");

  return (
    <div className="space-y-0 animate-in fade-in duration-600">

      {/* ────────────────────────────────────────────────────────────────────
       *  MASTHEAD — kicker + actions + VerdictHero + Ribbon
       * ──────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto space-y-2 pb-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-1.5 text-sm font-semibold text-[#787774] hover:text-[#2F3437] transition-colors group focus-visible:ring-2 focus-visible:ring-primary/40 rounded">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> {t("results.backToReview")}
          </button>
          <div className="flex items-center gap-3">
            <Button onClick={handleShare} variant="outline" size="sm" className="rounded-lg gap-2 text-xs font-semibold text-[#2F3437] border-[#EAEAEA] bg-white hover:bg-[#FBFBFA] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40">
              <Share2 className="w-3.5 h-3.5" /> {t("results.share")}
            </Button>
            <Button onClick={handleDownload} disabled={!lastCvId} variant="outline" size="sm" className="rounded-lg gap-2 text-xs font-semibold text-[#2F3437] border-[#EAEAEA] bg-white hover:bg-[#FBFBFA] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50">
              <Download className="w-3.5 h-3.5" /> {t("results.download")}
            </Button>
          </div>
        </div>

        {/* Kicker */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#787774] text-center pt-6">
          {kickerText}
        </p>

        {isJdMode && jdMatch?.fell_back_to_rubric && (
          <div className="flex items-start gap-3 p-4 mx-auto max-w-2xl mt-4 bg-amber-50 border border-amber-200 rounded-xl text-left animate-in fade-in slide-in-from-top-2 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">{t("rubricFallback.title")}</h4>
              <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                {targetRole
                  ? t("rubricFallback.body", { role: targetRole, skills: fallbackSkillsString })
                  : t("rubricFallback.bodyNoRole", { skills: fallbackSkillsString })}
              </p>
            </div>
          </div>
        )}

        {/* Verdict Hero — wrap label with score breakdown popover (#14) when JD mode */}
        <VerdictHero
          target={matchScore}
          label={
            isJdMode ? (
              <ScoreBreakdownPopover jdMatch={jdMatch}>
                {scoreLabel}
              </ScoreBreakdownPopover>
            ) : (
              scoreLabel
            )
          }
          verdictMessage={scoreMessage}
          isJdMode={isJdMode}
          rubricBand={jdMatch?.rubric_band ?? reviewData?.skills_relevance_breakdown?.rubric_band}
          bandTooltip={t("band.tooltip")}
        />

        {/* W44: Microcopy — honest distinction between CV score and JD match score */}
        {isJdMode && (
          <p className="text-[11px] text-[#787774] text-center max-w-md mx-auto mt-2 leading-relaxed">
            {t("results.scoreDistinction", {
              defaultValue: "JD match score ≠ CV quality score: one measures how well your CV covers this JD's requirements, the other measures presentation quality.",
            })}
          </p>
        )}

        {/* Ribbon — inline stats + deal-breaker chips */}
        {isJdMode && (
          <div className="flex flex-col items-center justify-center gap-3 mt-4">
            <Ribbon
              matched={presentCount}
              partial={partialCount}
              missing={missingCount}
              coverage={coverage}
              capApplied={capApplied}
            />
            {fitVerdict && <FitBadge fit={fitVerdict} className="mt-1" />}
          </div>
        )}

        {/* CV-only sub-scores */}
        {!isJdMode && (
          <div className="flex justify-center gap-8 text-[13px] font-semibold tabular-nums py-2">
            <span className="text-[#787774]">
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              ATS <span className="font-mono text-[#2F3437]">{reviewData?.breakdown.ats ?? 0}</span>
            </span>
            <span className="text-[#787774]">
              <Code className="w-3.5 h-3.5 inline mr-1" />
              {t("results.structure")} <span className="font-mono text-[#2F3437]">{reviewData?.breakdown.structure ?? 0}</span>
            </span>
          </div>
        )}
      </div>

      <SectionRule />

      {isJdMode && (
        <div className="relative z-10 max-w-4xl mx-auto">
          <ProgressBanner matchId={jdMatch?.matchId} onExplain={explainProgress} />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
       *  CHƯƠNG 1 — Đọc vị: Radar + Narrative
       * ──────────────────────────────────────────────────────────────────── */}
      <div className="py-12 md:py-16">
        <Chapter
          kicker={`01`}
          title={t("editorial.chap1")}
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 pt-2">
            {/* Radar */}
            <div className="lg:col-span-3">
              {isJdMode && radarData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#E3E3E0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#787774", fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAEAEA", fontSize: 12, fontWeight: 600, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }} formatter={(value: number, name: string) => [`${value}%`, name === "you" ? t("results.radarYou") : t("results.radarRequired")]} />
                      <Radar name="required" dataKey="required" stroke="#E3E3E0" fill="#E3E3E0" fillOpacity={0.3} strokeDasharray="4 2" />
                      <Radar name="you" dataKey="you" stroke="#00AEFF" fill="#00AEFF" fillOpacity={0.12} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-ink-accent"><div className="w-3 h-1 rounded-full bg-ink-accent" /><span>{t("results.radarYou")}</span></div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#787774]"><div className="w-3 h-0.5 bg-[#E3E3E0]" style={{ borderTop: "1px dashed #E3E3E0" }} /><span>{t("results.radarRequired")}</span></div>
                  </div>
                </>
              ) : (
                <p className="py-16 text-center text-sm text-[#787774]">{t("results.radarEmpty")}</p>
              )}
            </div>

            {/* Narrative ("Vì sao điểm này") */}
            <div className="lg:col-span-2 flex flex-col justify-center">
              {isJdMode && <MatchNarrative jdMatch={jdMatch} t={t} />}
              {!isJdMode && (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-[#787774]">
                    {isJdMode ? t("results.radarDescJd") : t("results.radarDescNoJd")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Chapter>
      </div>

      <SectionRule />

      {/* ────────────────────────────────────────────────────────────────────
       *  CHƯƠNG 2 — Cần cải thiện ưu tiên (GapReportCard)
       * ──────────────────────────────────────────────────────────────────── */}
      {/* Guard the WHOLE chapter behind the same flag GapReportCard checks internally —
          a disabled flag must not render a chapter title over an empty body (reads as broken). */}
      {ENABLE_DIAGNOSIS_ADDONS && isJdMode && jdMatch?.matchId && (
        <div id="gap-anchor" className="py-12 md:py-16">
          <Chapter
            kicker="02"
            title={t("editorial.chap2")}
          >
            <GapReportCard matchId={jdMatch.matchId} />
          </Chapter>
        </div>
      )}

      {ENABLE_DIAGNOSIS_ADDONS && isJdMode && jdMatch?.matchId && <SectionRule />}

      {/* ────────────────────────────────────────────────────────────────────
       *  CHƯƠNG 3 — Chi tiết (collapsible)
       * ──────────────────────────────────────────────────────────────────── */}
      <div className="py-12 md:py-16">
        <Chapter
          kicker="03"
          title={t("editorial.chap3")}
        >
          {/* Collapse toggle */}
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-ink-accent hover:text-ink-accent/80 transition-colors focus-visible:ring-2 focus-visible:ring-ink-accent/40 rounded"
          >
            {detailsOpen ? t("editorial.hideDetails") : t("editorial.showDetails")}
            {detailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {detailsOpen && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Keyword Table */}
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#2F3437]">
                      {isJdMode ? t("results.gapTitle") : t("results.gapTitleNoJd")}
                    </h3>
                    <p className="text-xs text-[#787774] mt-0.5">
                      {isJdMode ? t("results.gapDescJd") : t("results.gapDescNoJd")}
                    </p>
                  </div>
                  {isJdMode && (
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider bg-[#FBFBFA] px-3 py-1.5 rounded-lg border border-[#EAEAEA] w-fit">
                      <span className="flex items-center gap-1.5 text-[#346538]"><CheckCircle2 className="w-3.5 h-3.5" />{activeSkills.filter(s => s.status === "present").length} {t("results.found")}</span>
                      <span className="flex items-center gap-1.5 text-[#956400]"><AlertCircle className="w-3.5 h-3.5" />{activeSkills.filter(s => s.status === "partial").length} {t("results.partial")}</span>
                      <span className="flex items-center gap-1.5 text-[#9F2F2D]"><X className="w-3.5 h-3.5" />{activeSkills.filter(s => s.status === "missing").length} {t("results.missing")}</span>
                    </div>
                  )}
                </div>

                {isJdMode && (
                  <div className="flex gap-1 mb-4 p-1 bg-[#F1F1EF] rounded-lg w-fit">
                    <button onClick={() => setSkillTab("hard")} className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all", skillTab === "hard" ? "bg-white text-primary shadow-[0_1px_3px_rgba(15,23,42,0.08)]" : "text-[#787774] hover:text-[#2F3437]")}>
                      <Code className="w-4 h-4" /> {t("results.hardSkills")}
                      {skillTab === "hard" && <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px] leading-none font-mono tabular-nums">{hardSkills.length}</span>}
                    </button>
                    <button onClick={() => setSkillTab("soft")} className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all", skillTab === "soft" ? "bg-white text-primary shadow-[0_1px_3px_rgba(15,23,42,0.08)]" : "text-[#787774] hover:text-[#2F3437]")}>
                      <Users className="w-4 h-4" /> {t("results.softSkills")}
                      {skillTab === "soft" && <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px] leading-none font-mono tabular-nums">{softSkills.length}</span>}
                    </button>
                  </div>
                )}

                {isJdMode && (
                  <div className="hidden md:flex items-center gap-4 pb-3 border-b border-[#F1F1EF] text-[11px] font-bold uppercase tracking-wider text-[#787774]">
                    <div className="w-6 shrink-0" />
                    <span className="flex-1">{t("results.thSkill")}</span>
                    <span className="w-40 shrink-0 text-left pl-2">{t("results.thScore")}</span>
                    <span className="w-24 shrink-0 text-center">{t("results.thStatus")}</span>
                  </div>
                )}
                <div>
                  {isJdMode && activeSkills.length > 0 ? activeSkills.map((skill, i) => (
                    <KeywordRow
                      key={`${skill.name}-${i}`}
                      skill={skill}
                      index={i}
                      t={t}
                      evidenceStrength={findEvidenceStrength(skill, reviewData?.evidence_ledger)}
                    />
                  )) : (
                    <p className="py-6 text-sm text-[#787774]">{t("results.gapEmpty")}</p>
                  )}
                </div>
              </div>

              {/* Inferred Skills */}
              {isJdMode && <InferredSkillsBlock skills={jdMatch?.inferred_skills} t={t} />}
            </div>
          )}
        </Chapter>
      </div>

      <SectionRule />

      {/* ────────────────────────────────────────────────────────────────────
       *  CHƯƠNG 4 — Hành động (Tailor + Roadmap + Interview + Insights)
       * ──────────────────────────────────────────────────────────────────── */}
      <div className="py-12 md:py-16">
        <Chapter
          kicker="04"
          title={t("editorial.chap4")}
        >
          <div className="space-y-6">
            {/* Tailor */}
            {isJdMode && (
              <TailorChecklist
                matchId={jdMatch?.matchId}
                cvId={lastCvId}
                document={reviewData?.document}
              />
            )}

            {/* Interview Plan */}
            {isJdMode && jdMatch?.matchId && <MatchInterviewPlanCard matchId={jdMatch.matchId} />}

            {/* Next Steps (Companion) */}
            {isJdMode && jdMatch?.matchId && <NextStepsCard matchId={jdMatch.matchId} />}

            {/* AI Insights: Tabbed Assessment & Magic Card */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Tabbed Assessment (Strengths / Gaps) */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 px-1">
                  <button
                    onClick={() => setInsightTab("strengths")}
                    className={cn(
                      "px-4 py-2 text-sm font-bold transition-all relative rounded-t-lg hover:bg-slate-50",
                      insightTab === "strengths" ? "text-[#346538]" : "text-[#787774]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" /> {t("results.strengths")}
                    </div>
                    {insightTab === "strengths" && <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[#346538]" />}
                  </button>
                  <button
                    onClick={() => setInsightTab("gaps")}
                    className={cn(
                      "px-4 py-2 text-sm font-bold transition-all relative rounded-t-lg hover:bg-slate-50",
                      insightTab === "gaps" ? "text-[#9F2F2D]" : "text-[#787774]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" /> {t("results.gaps")}
                    </div>
                    {insightTab === "gaps" && <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[#9F2F2D]" />}
                  </button>
                </div>

                <div className={cn(CARD, "p-6 min-h-[280px]")}>
                  {insightTab === "strengths" ? (
                    <div className="space-y-4 animate-in fade-in duration-500">
                      <ul className="space-y-3">
                        {(strengths.length > 0 ? strengths : [t("results.strengthsEmpty")]).map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-[#2F3437] font-medium leading-relaxed bg-[#FBFBFA] p-3.5 rounded-xl border border-[#EAEAEA]/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <TrendingUp className="w-4 h-4 mt-0.5 shrink-0 text-[#346538]" />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-500">
                      <ul className="space-y-3">
                        {(criticalGaps.length > 0 ? criticalGaps : [t("results.gapsEmpty")]).map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-[#2F3437] font-medium leading-relaxed bg-[#FBFBFA] p-3.5 rounded-xl border border-[#EAEAEA]/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#9F2F2D]" />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* The Magic Card (Action Plan) */}
              <div className="lg:col-span-2">
                <div className="relative h-full overflow-hidden rounded-2xl bg-white shadow-lg border border-indigo-100 group">
                  {/* Glowing background */}
                  <div className="absolute -inset-2 opacity-30 blur-2xl bg-gradient-to-br from-indigo-300 via-purple-300 to-emerald-300 pointer-events-none transition-opacity duration-1000 group-hover:opacity-50" />

                  <div className="relative h-full flex flex-col p-6 bg-white/60 backdrop-blur-3xl z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50 shadow-sm">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h4 className="text-lg font-bold text-[#2F3437] tracking-tight">{t("results.actionPlan")}</h4>
                    </div>

                    <ul className="space-y-4 flex-1">
                      {(actionPlan.length > 0 ? actionPlan : [t("results.actionPlanEmpty")]).map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-[13px] text-[#2F3437] font-medium leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2 shadow-[0_0_4px_rgba(99,102,241,0.5)]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA + inline learning roadmap derived from this match's GapReport */}
            <div id="roadmap-anchor">
              <RoadmapFromMatchSection matchId={jdMatch?.matchId} onScanAgain={scanAgain} />
            </div>
          </div>
        </Chapter>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
       *  JD HIGHLIGHT (collapse, bottom — giữ)
       * ──────────────────────────────────────────────────────────────────── */}
      {isJdMode && jobDescription && (
        <JdHighlightBlock
          jobDescription={jobDescription}
          hardSkills={hardSkills}
          softSkills={softSkills}
          t={t}
        />
      )}
    </div>
  );
}

function readLegacyName(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || !("name" in value)) return undefined;
  const name = (value as { name?: unknown }).name;
  return typeof name === "string" ? name : undefined;
}

/* ── helper và component JD Highlight ── */
interface MatchRange {
  start: number;
  end: number;
  skillName: string;
  status: "present" | "partial" | "missing";
}

const getHighlightedJd = (text: string, skills: SkillMatchItem[]) => {
  if (!text) return [];
  const matches: MatchRange[] = [];
  const sortedSkills = [...skills].sort((a, b) => b.name.length - a.name.length);
  
  for (const skill of sortedSkills) {
    const skillName = skill.name.trim();
    if (!skillName) continue;
    
    const isSingleWord = !/\s/.test(skillName);
    const escaped = skillName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = isSingleWord ? `\\b${escaped}\\b` : escaped;
    const regex = new RegExp(pattern, "gi");
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = regex.lastIndex;
      
      const isOverlapping = matches.some(
        m => (start >= m.start && start < m.end) || (end > m.start && end <= m.end) || (start <= m.start && end >= m.end)
      );
      
      if (!isOverlapping) {
        matches.push({
          start,
          end,
          skillName,
          status: skill.status
        });
      }
    }
  }
  
  matches.sort((a, b) => a.start - b.start);
  
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  
  matches.forEach((m, idx) => {
    if (m.start > lastIndex) {
      nodes.push(text.substring(lastIndex, m.start));
    }
    
    const matchedText = text.substring(m.start, m.end);
    const classes = {
      present: "bg-[#EDF3EC] text-[#346538] rounded px-0.5 font-medium border border-[#DCE9D7]/50",
      partial: "bg-[#FBF3DB] text-[#956400] rounded px-0.5 font-medium border border-[#F1E5C0]/50",
      missing: "bg-[#FDEBEC] text-[#9F2F2D] rounded px-0.5 font-medium border border-[#F6D4D5]/50 underline decoration-dotted decoration-1",
    }[m.status];
    
    nodes.push(
      <mark key={idx} className={classes}>
        {matchedText}
      </mark>
    );
    
    lastIndex = m.end;
  });
  
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }
  
  return nodes;
};

const JdHighlightBlock = memo(function JdHighlightBlock({
  jobDescription,
  hardSkills,
  softSkills,
  t
}: {
  jobDescription: string;
  hardSkills: SkillMatchItem[];
  softSkills: SkillMatchItem[];
  t: (key: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const allSkills = React.useMemo(() => [...hardSkills, ...softSkills], [hardSkills, softSkills]);
  
  const highlightedNodes = React.useMemo(() => {
    return getHighlightedJd(jobDescription, allSkills);
  }, [jobDescription, allSkills]);

  const toggleText = isOpen ? t("results.collapse") : t("results.expand");

  return (
    <div className="border-t border-[#EAEAEA] mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 px-1 hover:bg-slate-50/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex flex-col items-start gap-1">
          <h3 className="text-sm font-bold text-[#2F3437] flex items-center gap-2">
            <Target className="w-4 h-4 text-ink-accent" />
            {t("results.jdHighlightTitle")}
          </h3>
          {isOpen && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EDF3EC] text-[#346538] border border-[#DCE9D7]">
                {t("results.matched")}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FBF3DB] text-[#956400] border border-[#F1E5C0]">
                {t("results.partial")}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FDEBEC] text-[#9F2F2D] border border-[#F6D4D5] underline decoration-dotted">
                {t("results.missing")}
              </span>
            </div>
          )}
        </div>
        <span className="text-xs font-semibold text-[#787774] flex items-center gap-1">
          {toggleText}
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {isOpen && (
        <div className="pb-5 px-1">
          <div className="bg-[#FBFBFA] border border-[#EAEAEA] rounded-lg p-4 max-h-80 overflow-y-auto text-[13px] leading-relaxed text-[#2F3437] whitespace-pre-wrap font-normal">
            {highlightedNodes.length > 0 ? highlightedNodes : jobDescription}
          </div>
        </div>
      )}
    </div>
  );
});
