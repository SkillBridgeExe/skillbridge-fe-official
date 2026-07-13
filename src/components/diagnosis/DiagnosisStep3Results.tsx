import React, { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertCircle, AlertTriangle, X,
  Sparkles, TrendingUp, Target, Shield, Code, Users,
  ChevronDown, ChevronUp, RotateCcw,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip
} from "recharts";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { ENABLE_DIAGNOSIS_ADDONS } from "@/lib/runtime-config";
import { useTranslation } from "react-i18next";
import { TailorChecklist } from "./TailorChecklist";
import { GapReportCard } from "./GapReportCard";
import { MatchInterviewPlanCard } from "./MatchInterviewPlanCard";
import { RoadmapFromMatchSection } from "./RoadmapFromMatchSection";
import { Ribbon, Chapter, SectionRule } from "./editorial";
import { ScoreRail } from "./report/ScoreRail";
import { NextStepsCard } from "./NextStepsCard";
import { ProgressBanner } from "./ProgressBanner";
import { ExtractionQualityBanner } from "./ExtractionQualityBanner";
import type { CvJdMatch, EvidenceLedger, EvidenceStrength, InferredSkill, SkillMatchItem, GapEvidenceItem, GapEmphasisItem } from "@shared/api";
import { useNextStepsQuery, useGapReportQuery, useMatchProgressQuery } from "@/hooks/use-diagnosis";
import { useCompanionStore } from "@/store/useCompanionStore";
import { pickTopNextStep, ctaForStep } from "@/components/companion/skills/diagnosis-results";
import { pickTopProveIt } from "@/components/companion/skills/prove-it";
import { useElementIssuesCompanion } from "@/components/companion/skills/useElementIssuesCompanion";
import { useDiagnosisChatCompanion, CHAT_CONTEXT_ID } from "@/components/companion/skills/useDiagnosisChatCompanion";
import { FitBadge } from "./FitBadge";
import { KeywordTable } from "./report/KeywordTable";
import { buildDiagnosisReport } from "@/lib/diagnosis-report";
import { dimensionIssueSlice } from "@/components/companion/skills/diagnosis-review";
import { seedBuilderFromDocument } from "./edit-in-builder";
import { DocumentPreview } from "./DocumentPreview";
import { JobRecommendations } from "./JobRecommendations";
import { AiTrendsInsight } from "./AiTrendsInsight";
import { SkillGapTrends } from "./SkillGapTrends";
import { InterviewPrepPack } from "./InterviewPrepPack";

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

  const hasPerSkill = !!breakdown.per_skill && breakdown.per_skill.length > 0;
  const sortedSkills = hasPerSkill
    ? [...breakdown.per_skill!].sort((a, b) => b.points_possible - a.points_possible)
    : [];
  const displaySkills = sortedSkills.slice(0, 8);
  const remainingCount = sortedSkills.length - 8;

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

      {hasPerSkill && (
        <div className="border border-[#EAEAEA] rounded-lg bg-[#FBFBFA] p-3 space-y-2">
          <div className="flex flex-col space-y-0.5">
            <h4 className="text-xs font-bold text-[#2F3437]">{t("matchDepth.perSkillTitle")}</h4>
            <p className="text-[11px] text-[#787774] leading-relaxed">{t("matchDepth.perSkillHint")}</p>
          </div>
          <div className="divide-y divide-[#EAEAEA] text-xs">
            {displaySkills.map((row, idx) => {
              let badgeColor = "border-[#787774] text-[#787774]";
              if (row.importance === "REQUIRED") {
                badgeColor = "border-[#9F2F2D] text-[#9F2F2D]";
              } else if (row.importance === "PREFERRED") {
                badgeColor = "border-[#956400] text-[#956400]";
              }

              const earnedColor =
                row.status === "matched"
                  ? "text-[#346538]"
                  : row.status === "partial"
                  ? "text-[#956400]"
                  : "text-[#9F2F2D]";

              return (
                <div key={idx} className="py-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-[#2F3437] font-medium" title={row.display_name}>
                      {row.display_name}
                    </span>
                    <span className={cn("px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0", badgeColor)}>
                      {t(`jdIntel.importance.${row.importance}`, { defaultValue: row.importance.replace(/_/g, " ") })}
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-xs text-[#787774] shrink-0">
                    <span className={cn("font-bold", earnedColor)}>{row.points_earned.toFixed(1)}</span>
                    {" / "}
                    <span>{row.points_possible.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {remainingCount > 0 && (
            <div className="pt-2 border-t border-[#EAEAEA] text-[11px] text-[#787774] italic">
              {t("matchDepth.perSkillMore", { count: remainingCount })}
            </div>
          )}
        </div>
      )}

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

function SystemReadPanel({
  unnormalized,
  evidenceGaps,
  emphasisGaps,
  isLoading,
  isError,
  t,
}: {
  unnormalized?: Array<{ raw_input: string; evidence_text?: string; reason: string }>;
  evidenceGaps?: GapEvidenceItem[];
  emphasisGaps?: GapEmphasisItem[];
  isLoading?: boolean;
  isError?: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const hasUnnormalized = !!unnormalized && unnormalized.length > 0;
  const hasEvidence = !isLoading && !isError && !!evidenceGaps && evidenceGaps.length > 0;
  const hasEmphasis = !isLoading && !isError && !!emphasisGaps && emphasisGaps.length > 0;

  const allEmpty = !hasUnnormalized && !hasEvidence && !hasEmphasis;
  // undefined = legacy row, BE chưa từng trả field này → KHÔNG được claim "đọc đủ mọi kỹ năng".
  const recognitionKnown = unnormalized !== undefined;

  if (allEmpty && (isLoading || isError || !recognitionKnown)) {
    return null;
  }

  return (
    <div className="border border-[#EAEAEA] rounded-lg bg-[#FBFBFA] p-4 space-y-4">
      <h3 className="text-sm font-bold text-[#2F3437]">{t("matchDepth.systemReadTitle")}</h3>

      {allEmpty && !isLoading && !isError && (
        <p className="text-xs text-[#346538] font-medium">{t("matchDepth.systemReadAllClear")}</p>
      )}

      {hasUnnormalized && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#9F2F2D]">{t("matchDepth.droppedTitle")}</h4>
          <p className="text-[11px] text-[#787774] leading-relaxed">{t("matchDepth.droppedHint")}</p>
          <ul className="space-y-1.5 text-xs text-[#2F3437] list-disc list-inside">
            {unnormalized.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                <span className="font-bold">{item.raw_input}</span>
                {item.evidence_text && (
                  <span className="text-[#787774] italic">
                    {" "}&ldquo;{item.evidence_text}&rdquo;
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasEvidence && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#956400]">{t("matchDepth.evidenceGapsTitle")}</h4>
          <p className="text-[11px] text-[#787774] leading-relaxed">{t("matchDepth.evidenceGapsHint")}</p>
          <ul className="space-y-1.5 text-xs text-[#2F3437] list-disc list-inside">
            {evidenceGaps.map((item, idx) => {
              const hasLevels = item.cv_level !== null && item.required_level !== null;
              return (
                <li key={idx} className="leading-relaxed">
                  <span className="font-medium">{item.display_name}</span>
                  {hasLevels && (
                    <span className="font-mono text-[11px] text-[#787774] bg-[#F1F1EF] px-1.5 py-0.5 rounded ml-1.5">
                      L{item.cv_level}/L{item.required_level}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {hasEmphasis && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#2F3437]">{t("matchDepth.emphasisTitle")}</h4>
          <ul className="space-y-1.5 text-xs text-[#2F3437] list-disc list-inside">
            {emphasisGaps.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                <span className="font-semibold">{item.display_name}</span>
                <span className="text-[#787774] ml-1.5">
                  ({t("matchDepth.emphasisCount", { jd: item.jd_count, cv: item.cv_count })})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 *  MAIN COMPONENT — Editorial layout (W24)
 * ════════════════════════════════════════════════════════════════════════ */

interface DiagnosisStep3ResultsProps {
  activeTab: 'audit' | 'cv' | 'market';
}

export function DiagnosisStep3Results({ activeTab }: DiagnosisStep3ResultsProps) {
  const { t, i18n } = useTranslation("diagnosis");
  const { scanAgain, skillTab, setSkillTab, reviewData, jobDescription, lastCvId, targetRole } = useDiagnosisStore();

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

  const matchScore = jdMatch?.matchScore !== undefined ? jdMatch.matchScore : (reviewData?.overallScore ?? null);
  const isDegradedNoBasis = isJdMode && (matchScore === null || jdMatch?.degraded_reasons?.includes("NO_REQUIREMENT_BASIS"));
  const isDegradedUnrecognizedSkills = isJdMode && jdMatch?.degraded_reasons?.includes("CV_SKILLS_UNRECOGNIZED");
  const isUnusable = reviewData?.extraction_quality?.input_quality === "unusable";
  // TRUST': the whole analysis (radar, gap report, tailor, roadmap, interview) is only meaningful
  // when we could actually score the input. When we couldn't (no requirement basis, or the CV text
  // is unreadable), showing those sections would contradict the honest "can't trust this" banner —
  // so gate every downstream chapter on this single flag and offer a re-scan instead.
  const canTrustAnalysis = !isDegradedNoBasis && !isUnusable;

  const presentCount = hardSkills.filter((s) => s.status === "present").length;
  const missingCount = hardSkills.filter((s) => s.status === "missing").length;
  const partialCount = hardSkills.filter((s) => s.status === "partial").length;
  const dimensions = reviewData?.dimensions ?? [];
  const allIssues = reviewData?.issues ?? [];
  const issueGroups = dimensions.length > 0
    ? dimensions.map((_, i) => dimensionIssueSlice(reviewData, i))
    : [allIssues];
  const reportGroups = buildDiagnosisReport(reviewData, t, issueGroups);

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
      suppressAutoOpen: true,
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

  return (
    <div className="h-full flex flex-col lg:flex-row select-none overflow-hidden animate-in fade-in duration-500 w-full">
      {/* LEFT COLUMN: ScoreRail (Width = 300px, border-r, bg-white) */}
      {!isUnusable && !isDegradedNoBasis && (
        <aside className="w-full lg:w-[300px] lg:min-w-[300px] lg:max-w-[300px] border-r border-[#EAEAEA] bg-white p-6 flex flex-col shrink-0 overflow-hidden h-full">
          <ScoreRail
            overallScore={matchScore ?? 0}
            groups={reportGroups}
            breakdown={reviewData?.breakdown}
            verdictMessage=""
          />
        </aside>
      )}

      {/* RIGHT COLUMN: Detail Report (Scrolls on desktop) */}
      <div className="flex-1 lg:overflow-y-auto lg:h-full custom-scrollbar bg-[#FCFCFD] p-6 lg:p-8">
        {isDegradedNoBasis ? (
          <div className={cn(CARD, "mt-6 p-6 text-center space-y-4 max-w-2xl mx-auto")}>
            <AlertTriangle className="w-6 h-6 text-[#956400] mx-auto" />
            <h3 className="text-sm font-bold text-[#2F3437]">
              {t("degraded.noBasisTitle")}
            </h3>
            <p className="text-xs text-[#787774] leading-relaxed max-w-md mx-auto">
              {t("degraded.noBasisBody")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={scanAgain}
              className="gap-1.5 text-xs rounded-full animate-none"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("degraded.noBasisCta", { defaultValue: "Chọn lại vai trò" })}
            </Button>
          </div>
        ) : isUnusable ? (
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
              onClick={scanAgain}
              className="gap-1.5 text-xs rounded-full animate-none"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("degraded.unusableCta", { defaultValue: "Tải lên CV khác" })}
            </Button>
          </div>
        ) : (
          <>
        
        {/* Tab 1: Audit Report */}
        {activeTab === 'audit' && (
          <div className="w-full px-6 lg:px-10 space-y-6">
            {reviewData?.extraction_quality && reviewData.extraction_quality.confidence !== "high" && (
              <div className="pb-6">
                <ExtractionQualityBanner quality={reviewData.extraction_quality} />
              </div>
            )}

            {isJdMode && jdMatch?.fell_back_to_rubric && (
              <div className="flex items-start gap-3 p-4 mx-auto max-w-2xl mb-6 bg-amber-50 border border-amber-200 rounded-xl text-left animate-in fade-in slide-in-from-top-2 shadow-sm">
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

            {isJdMode && isDegradedUnrecognizedSkills && (
              <div className="flex items-start gap-2.5 p-3.5 mx-auto max-w-2xl mb-6 bg-[#F8F9FA] border border-[#EAEAEA] rounded-xl text-left animate-in fade-in slide-in-from-top-2 shadow-sm text-xs text-[#4F5B66]">
                <AlertCircle className="w-4 h-4 text-[#787774] mt-0.5 shrink-0" />
                <div>
                  <p className="leading-relaxed">
                    {t("degraded.unrecognizedSkills")}
                  </p>
                </div>
              </div>
            )}

            {isJdMode && (
              <div className="relative z-10 pb-6">
                <ProgressBanner matchId={jdMatch?.matchId} onExplain={explainProgress} />
              </div>
            )}

            {/* Ribbon Stats / Badges moved to the top of audit tab inside right column */}
            {isJdMode && !isDegradedNoBasis && !isUnusable && (
              <div className="relative z-10 pb-6">
                <div className="bg-white border border-[#EAEAEA] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <span className="text-xs font-semibold text-[#787774]">
                    {t("results.matchStats", { defaultValue: "Thống kê so khớp kỹ năng:" })}
                  </span>
                  <Ribbon
                    matched={presentCount}
                    partial={partialCount}
                    missing={missingCount}
                    coverage={coverage}
                    capApplied={capApplied}
                  />
                  {fitVerdict && <FitBadge fit={fitVerdict} />}
                </div>
              </div>
            )}

            {/* TRUST': actual analysis details */}
            {canTrustAnalysis && (
              <>
                {/* ────────────────────────────────────────────────────────────────────
                 *  CHƯƠNG 1 — Đọc vị: Radar + Narrative
                 * ──────────────────────────────────────────────────────────────────── */}
                {isJdMode && !isDegradedNoBasis && (
                  <>
                    <div id="chapter-radar" className="py-6 md:py-8">
                      <Chapter
                        kicker={`01`}
                        title={t("editorial.chap1")}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 pt-2">
                          {/* Radar */}
                          <div className="lg:col-span-3">
                            {radarData.length > 0 ? (
                                <>
                                  <ResponsiveContainer width="100%" height={280}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                      <PolarGrid stroke="#E3E3E0" />
                                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#787774", fontWeight: 600 }} />
                                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAEAEA", fontSize: 12, fontWeight: 600, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }} formatter={(value: number, name: string) => [`${value}%`, name === "you" ? t("results.radarYou") : t("results.radarRequired")]} />
                                      <Radar name="required" dataKey="required" stroke="#E3E3E0" fill="#E3E3E0" fillOpacity={0.3} strokeDasharray="4 2" />
                                      <Radar name="you" dataKey="you" stroke="#00AEEF" fill="#00AEEF" fillOpacity={0.12} strokeWidth={2} />
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
                            <MatchNarrative jdMatch={jdMatch} t={t} />
                          </div>
                        </div>
                      </Chapter>
                    </div>
                    <SectionRule />
                  </>
                )}

                {/* ────────────────────────────────────────────────────────────────────
                 *  CHƯƠNG 2 — Cần cải thiện ưu tiên (GapReportCard)
                 * ──────────────────────────────────────────────────────────────────── */}
                {ENABLE_DIAGNOSIS_ADDONS && isJdMode && jdMatch?.matchId && (
                  <div id="gap-anchor" className="py-6 md:py-8">
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
                <div id="chapter-skills" className="py-6 md:py-8">
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

                        {/* KeywordTable — keyword frequency × per_skill joined table (renders nothing on old matches) */}
                        {isJdMode && (
                          <KeywordTable
                            keywordFrequency={jdMatch?.keyword_frequency}
                            perSkill={jdMatch?.scoring_breakdown?.per_skill}
                          />
                        )}

                        {/* Inferred Skills */}
                        {isJdMode && <InferredSkillsBlock skills={jdMatch?.inferred_skills} t={t} />}

                        {/* System Read Panel */}
                        {isJdMode && (
                          <SystemReadPanel
                            unnormalized={jdMatch?.unnormalized_cv_skills}
                            evidenceGaps={gapReportQuery.data?.evidence_gaps}
                            emphasisGaps={gapReportQuery.data?.jd_emphasis_gaps}
                            isLoading={gapReportQuery.isLoading}
                            isError={gapReportQuery.isError}
                            t={t}
                          />
                        )}
                      </div>
                    )}
                  </Chapter>
                </div>

                <SectionRule />

                {/* ────────────────────────────────────────────────────────────────────
                 *  CHƯƠNG 4 — Hành động (Tailor + Roadmap + Interview + Insights)
                 * ──────────────────────────────────────────────────────────────────── */}
                <div id="chapter-action" className="py-6 md:py-8">
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
                          <div className="relative h-full overflow-hidden rounded-xl bg-white border border-[#EAEAEA]">
                            <div className="relative h-full flex flex-col p-6">
                              <div className="flex items-center gap-2 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50 shadow-sm">
                                  <Sparkles className="w-5 h-5" />
                                </div>
                                <h4 className="text-lg font-bold text-[#2F3437] tracking-tight">{t("results.actionPlan")}</h4>
                              </div>

                              <ul className="space-y-4 flex-1">
                                {(actionPlan.length > 0 ? actionPlan : [t("results.actionPlanEmpty")]).map((item, i) => (
                                  <li key={i} className="flex items-start gap-3 text-[13px] text-[#2F3437] font-medium leading-relaxed">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2" />
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
                  <div id="chapter-jd" className="py-6 md:py-8">
                    <JdHighlightBlock
                      jobDescription={jobDescription}
                      hardSkills={hardSkills}
                      softSkills={softSkills}
                      t={t}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Your CV */}
        {activeTab === 'cv' && (
          <div className="w-full px-6 lg:px-10 space-y-6 animate-in fade-in duration-300">
            {/* Header bar: Issues Count & Edit button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-xl border border-[#EAEAEA] shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", (reviewData?.issues?.length ?? 0) > 0 ? "bg-[#9F2F2D]" : "bg-[#346538]")} />
                <p className="text-sm font-semibold text-[#2F3437]">
                  {(reviewData?.issues?.length ?? 0) > 0
                    ? t("review.issuesMarked", { count: reviewData?.issues?.length ?? 0, defaultValue: `Tìm thấy ${reviewData?.issues?.length ?? 0} điểm cải thiện trong CV của bạn` })
                    : t("review.noIssuesMarked", { defaultValue: "Tuyệt vời! Không phát hiện lỗi nghiêm trọng nào." })
                  }
                </p>
              </div>
              <Button
                onClick={() => seedBuilderFromDocument(reviewData?.document)}
                size="sm"
                className="bg-[#00AEEF] hover:bg-[#049bd7] text-white font-bold px-4 h-9 rounded-lg text-xs transition-colors shrink-0"
              >
                {t("preview.editOriginal", { defaultValue: "Sửa CV gốc" })}
              </Button>
            </div>

            <div className="w-full max-w-6xl mx-auto bg-white rounded-xl border border-[#EAEAEA] p-6 shadow-sm">
              <DocumentPreview hideEditOriginal />
            </div>
          </div>
        )}

        {/* Tab 3: Market Insights */}
        {activeTab === 'market' && (
          <div className="w-full px-6 lg:px-10 space-y-8 animate-in fade-in duration-300">
            <JobRecommendations cvId={lastCvId} />

            {/* AI trends insight */}
            <AiTrendsInsight cvId={lastCvId} role={targetRole} />

            {/* Skill gaps trends */}
            <SkillGapTrends cvId={lastCvId} />

            {/* Interview preparation pack */}
            <InterviewPrepPack
              cvId={lastCvId}
              role={targetRole}
            />
          </div>
        )}
      </>
    )}
      </div>
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
