import React, { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { matchScoreBand } from "@/lib/match-score-band";
import {
  CheckCircle2, AlertCircle, AlertTriangle, X,
  Sparkles, TrendingUp, Target, Shield, Code, Users,
  ChevronDown, ChevronUp, RotateCcw,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip
} from "recharts";
import { resolveDiagnosisCvDisplayName, useDiagnosisStore } from "@/store/useDiagnosisStore";
import { ENABLE_DIAGNOSIS_ADDONS } from "@/lib/runtime-config";
import { useTranslation } from "react-i18next";
import { TailorChecklist } from "./TailorChecklist";
import { GapReportCard } from "./GapReportCard";
import { MatchInterviewPlanCard } from "./MatchInterviewPlanCard";
import { RoadmapFromMatchSection } from "./RoadmapFromMatchSection";
import { Chapter, SectionRule } from "./editorial";
import { ScoreRail } from "./report/ScoreRail";
import { NextStepsCard } from "./NextStepsCard";
import { ProgressBanner } from "./ProgressBanner";
import { ExtractionQualityBanner } from "./ExtractionQualityBanner";
import { MatchSkillsMatrix } from "./MatchSkillsMatrix";
import type { CvJdMatch, EvidenceLedger, EvidenceStrength, InferredSkill, SkillMatchItem, GapEvidenceItem, GapEmphasisItem } from "@shared/api";
import { useNextStepsQuery, useGapReportQuery, useMatchProgressQuery } from "@/hooks/use-diagnosis";
import { useCompanionStore } from "@/store/useCompanionStore";
import { pickTopNextStep, ctaForStep } from "@/components/companion/skills/diagnosis-results";
import { pickTopProveIt } from "@/components/companion/skills/prove-it";
import { useElementIssuesCompanion } from "@/components/companion/skills/useElementIssuesCompanion";
import { useDiagnosisChatCompanion, CHAT_CONTEXT_ID } from "@/components/companion/skills/useDiagnosisChatCompanion";
import { KeywordTable } from "./report/KeywordTable";
import { buildDiagnosisReport } from "@/lib/diagnosis-report";
import { dimensionIssueSlice } from "@/components/companion/skills/diagnosis-review";
import { seedBuilderFromDocument } from "./edit-in-builder";
import { DocumentPreview } from "./DocumentPreview";
import { CvJdDualPanel } from "./report/CvJdDualPanel";
import { JobRecommendations } from "./JobRecommendations";
import { AiTrendsInsight } from "./AiTrendsInsight";
import { SkillGapTrends } from "./SkillGapTrends";
import { InterviewPrepPack } from "./InterviewPrepPack";

/* ── Design tokens (§0b — editorial W24) ── */
const CARD = "bg-white border border-slate-200/60 rounded-xl shadow-sm";
const MAX_INSIGHT_ITEMS = 3;

/** "sql_server" → "SQL Server" (từ ≤3 ký tự viết hoa cả từ — đủ cho các canonical satisfies hiện có). */
function prettyCanonical(canonical: string): string {
  return canonical
    .split("_")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function evidenceStrengthClass(strength: EvidenceStrength): string {
  if (strength === "demonstrated") return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
  if (strength === "listed_only") return "bg-amber-50 text-amber-700 border-amber-200/60";
  return "bg-slate-100 text-slate-500 border-slate-200/60";
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
    present: { icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, badge: "bg-emerald-50 text-emerald-700 border-emerald-200/60", label: t("results.found") },
    partial:  { icon: <AlertCircle  className="w-5 h-5 text-amber-600" />, badge: "bg-amber-50 text-amber-700 border-amber-200/60", label: t("results.partial") },
    missing:  { icon: <X            className="w-5 h-5 text-rose-600" />, badge: "bg-rose-50 text-rose-700 border-rose-200/60", label: t("results.missing") },
  }[skill.status];

  return (
    <div
      className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm flex flex-col gap-3 animate-in fade-in duration-500 hover:shadow-md transition-shadow"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 mt-0.5">
            {statusConfig.icon}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900 break-words">{skill.name}</span>
              {evidenceStrength && (
                <span
                  className={cn("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0", evidenceStrengthClass(evidenceStrength))}
                  title={t(`evidence.strength.${evidenceStrength}`)}
                >
                  {t(`evidence.strength.${evidenceStrength}`)}
                </span>
              )}
            </div>

            {typeof skill.gap_levels === "number" && skill.gap_levels > 0 && (
              <p className="text-[11px] font-medium text-amber-700">
                {t("matchDepth.gapLevels", { count: skill.gap_levels })}
              </p>
            )}
            {skill.satisfied_by && (
              <p className="text-[11px] font-medium text-slate-500">
                {t("matchDepth.satisfiedBy", { from: prettyCanonical(skill.satisfied_by) })}
              </p>
            )}
          </div>
        </div>

        <span className={cn("text-[10px] font-bold px-2 py-1 rounded border text-center shrink-0 uppercase tracking-wider", statusConfig.badge)}>
          {statusConfig.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 w-full bg-slate-50 p-2.5 rounded-lg border border-slate-100/50 mt-1">
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              skill.status === "present" ? "bg-emerald-500" : skill.status === "partial" ? "bg-amber-500" : "bg-rose-500"
            )}
            style={{ width: `${skill.cvScore}%`, transitionDelay: `${index * 60}ms` }}
          />
        </div>
        <span className="font-mono tabular-nums text-xs font-black text-slate-900 shrink-0">{skill.cvScore}%</span>
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
  const matchBand = matchScoreBand(jdMatch.matchScore ?? coverage);
  const band = matchBand.band === "strong" ? "strong" : matchBand.band === "moderate" ? "good" : "low";

  const isSuspect = jdMatch.score_explanation?.cv_input_quality === "suspect" || jdMatch.score_explanation?.cv_input_quality === "unusable" || jdMatch.degraded_reasons?.includes("CV_INPUT_SUSPECT");
  const perSkills = breakdown.per_skill ?? [];
  // A suspect extraction can still produce a numeric score, but its per-skill
  // statuses are not trustworthy enough to present as definitive claims.
  const requiredMissing = isSuspect ? [] : perSkills.filter(s => s.importance === "REQUIRED" && s.status === "missing");
  const coreMatched = isSuspect ? [] : perSkills.filter(s => s.status === "matched");

  return (
    <div className="space-y-5">
      {isSuspect && (
        <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[13px] text-rose-800 leading-relaxed font-medium">
            {t("matchDepth.states.cv_parse_suspect", { defaultValue: "Hệ thống phát hiện định dạng CV có thể làm giảm khả năng trích xuất chính xác." })}
          </p>
        </div>
      )}

      {/* AI Headline & Assessment */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          {t("matchDepth.analysisHeadline", { defaultValue: "Nhận định năng lực từ AI" })}
        </h4>
        <div className="text-[13.5px] text-slate-800 leading-relaxed font-medium">
          {isSuspect ? (
            <p>{t("matchDepth.inputQualityBody", { defaultValue: "CV cần được đọc lại trước khi kết luận kỹ năng nào đang thiếu." })}</p>
          ) : jdMatch.score_explanation ? (
            <p>
              {t(`matchDepth.states.${jdMatch.score_explanation.state}`, {
                matched: breakdown.matched_count,
                partial: breakdown.partial_count,
                missing: breakdown.missing_count,
                defaultValue: `Bạn đã đáp ứng ${breakdown.matched_count} kỹ năng, nhưng còn thiếu ${breakdown.missing_count} kỹ năng yêu cầu trong JD.`
              })}
            </p>
          ) : (
            <p>{t(`matchDepth.bandRationale.${band}`)}</p>
          )}
        </div>
      </div>

      {/* Priority Missing Skills */}
      {requiredMissing.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-bold text-rose-700">
              {t("results.priorityMissingTitle", { defaultValue: "Kỹ năng bắt buộc cần bổ sung:" })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {requiredMissing.slice(0, 8).map((s) => (
              <span
                key={s.canonical_name}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs"
              >
                {s.display_name}
              </span>
            ))}
            {requiredMissing.length > 8 && (
              <span className="text-xs font-bold text-slate-400 self-center pl-1">
                +{requiredMissing.length - 8}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Top Matched Skills */}
      {coreMatched.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-emerald-700">
              {t("results.topMatchedTitle", { defaultValue: "Điểm mạnh nổi bật đã khớp:" })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {coreMatched.slice(0, 8).map((s) => (
              <span
                key={s.canonical_name}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs"
              >
                {s.display_name}
              </span>
            ))}
            {coreMatched.length > 8 && (
              <span className="text-xs font-bold text-slate-400 self-center pl-1">
                +{coreMatched.length - 8}
              </span>
            )}
          </div>
        </div>
      )}

      {breakdown.cap_applied && (
        <p className="text-xs font-medium text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200/70">
          {t("matchDepth.capped", { defaultValue: "Điểm số bị giới hạn do thiếu một số kỹ năng bắt buộc cốt lõi." })}
        </p>
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
      <h3 className="text-sm font-bold text-slate-900">{t("matchDepth.inferredTitle")}</h3>
      <p className="text-xs leading-relaxed text-slate-500">{t("matchDepth.inferredHint")}</p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill.canonical_name}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 shadow-sm transition-shadow hover:shadow-md"
            title={skill.reason ?? undefined}
          >
            {skill.display_name}
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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
    <div className="border border-slate-200/60 rounded-xl bg-white p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-900">{t("matchDepth.systemReadTitle")}</h3>

      {allEmpty && !isLoading && !isError && (
        <p className="text-xs text-emerald-700 font-medium">{t("matchDepth.systemReadAllClear")}</p>
      )}

      {hasUnnormalized && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-rose-700">{t("matchDepth.droppedTitle")}</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">{t("matchDepth.droppedHint")}</p>
          <ul className="space-y-2 text-xs text-slate-900 list-disc list-inside bg-rose-50/50 p-3 rounded-lg border border-rose-100">
            {unnormalized.map((item, idx) => (
              <li key={idx} className="leading-relaxed marker:text-rose-400">
                <span className="font-bold">{item.raw_input}</span>
                {item.evidence_text && (
                  <span className="text-slate-500 italic block pl-4 mt-0.5 border-l-2 border-slate-200 ml-2">
                    &ldquo;{item.evidence_text}&rdquo;
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasEvidence && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-amber-700">{t("matchDepth.evidenceGapsTitle")}</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">{t("matchDepth.evidenceGapsHint")}</p>
          <ul className="space-y-2 text-xs text-slate-900 list-disc list-inside bg-amber-50/50 p-3 rounded-lg border border-amber-100">
            {evidenceGaps.map((item, idx) => {
              const hasLevels = item.cv_level !== null && item.required_level !== null;
              return (
                <li key={idx} className="leading-relaxed marker:text-amber-400">
                  <span className="font-medium">{item.display_name}</span>
                  {hasLevels && (
                    <span className="font-mono text-[10px] text-amber-700 bg-amber-100/50 px-1.5 py-0.5 rounded ml-2 border border-amber-200">
                      L{item.cv_level} / L{item.required_level}
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
          <h4 className="text-xs font-bold text-slate-900">{t("matchDepth.emphasisTitle")}</h4>
          <ul className="space-y-2 text-xs text-slate-900 list-disc list-inside bg-slate-50 p-3 rounded-lg border border-slate-100">
            {emphasisGaps.map((item, idx) => (
              <li key={idx} className="leading-relaxed marker:text-slate-400">
                <span className="font-semibold">{item.display_name}</span>
                <span className="text-slate-500 ml-1.5">
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

import type { ReportTab } from "@/pages/user/Diagnosis";

interface DiagnosisStep3ResultsProps {
  activeTab: ReportTab;
}

export function DiagnosisStep3Results({ activeTab }: DiagnosisStep3ResultsProps) {
  const { t, i18n } = useTranslation("diagnosis");
  const { scanAgain, skillTab, setSkillTab, reviewData, jobDescription, lastCvId, targetRole, cvFile, cvDisplayName, isFromBuilder, builderCvName } = useDiagnosisStore();

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
  const coverage = jdMatch ? Math.round((jdMatch.required_coverage ?? 0) * 100) : undefined;
  const isDegradedNoBasis = isJdMode && (matchScore === null || jdMatch?.degraded_reasons?.includes("NO_REQUIREMENT_BASIS"));
  const isDegradedUnrecognizedSkills = isJdMode && jdMatch?.degraded_reasons?.includes("CV_SKILLS_UNRECOGNIZED");
  const inputQuality = jdMatch?.score_explanation?.cv_input_quality ?? reviewData?.extraction_quality?.input_quality;
  const isUnusable = inputQuality === "unusable";
  const isSuspect = inputQuality === "suspect" || inputQuality === "unusable" || jdMatch?.degraded_reasons?.includes("CV_INPUT_SUSPECT");
  // TRUST': the whole analysis (radar, gap report, tailor, roadmap, interview) is only meaningful
  // when we could actually score the input. When we couldn't (no requirement basis, or the CV text
  // is unreadable), showing those sections would contradict the honest "can't trust this" banner —
  // so gate every downstream chapter on this single flag and offer a re-scan instead.
  const canTrustAnalysis = !isDegradedNoBasis && !isUnusable && !isSuspect;

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
    .filter((name): name is string => Boolean(name));
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
    canTrustAnalysis,
  );
  // ProgressBanner "Giải thích thêm" — hand off to the chat advisor: prefill + send
  // the same grounded question the chip offers, and open the chat bubble.
  const explainProgress = useCallback(() => {
    chat.sendQuestion(t("companion.chat.progressChip"));
    useCompanionStore.getState().activateContext(CHAT_CONTEXT_ID);
    // Force bubble open even if dismissed (cf. CompanionShell.handleDolphinClick)
    useCompanionStore.setState({ bubbleOpen: true });
  }, [chat, t]);
  // Wave 2 entry point: "ask the dolphin about THIS gap" — same recipe, gap-scoped focus.
  const askGap = useCallback(
    (displayName: string) => {
      chat.sendQuestion(t("companion.chat.askGapQ", { name: displayName }), "gap_results");
      useCompanionStore.getState().activateContext(CHAT_CONTEXT_ID);
      useCompanionStore.setState({ bubbleOpen: true });
    },
    [chat, t],
  );
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

  return (
    <div className="min-h-full flex flex-col lg:flex-row animate-in fade-in duration-500 w-full">
      {/* LEFT COLUMN: ScoreRail (Width = 300px, border-r, bg-white) */}
      {!isUnusable && !isDegradedNoBasis && (
        <aside className="w-full lg:w-[300px] lg:min-w-[300px] lg:max-w-[300px] border-r border-slate-200/60 bg-white p-6 flex flex-col shrink-0 lg:h-full">
          <ScoreRail
            overallScore={matchScore ?? 0}
            groups={reportGroups}
            breakdown={reviewData?.breakdown}
            verdictMessage=""
            matchStats={isJdMode ? {
              matched: presentCount,
              partial: partialCount,
              missing: missingCount,
              inputQuality,
              coveragePercent: coverage,
              fitVerdict: fitVerdict ?? undefined,
              unnormalizedRequirements: unnormalizedSkillNames,
            } : undefined}
          />
        </aside>
      )}

      {/* RIGHT COLUMN: Detail Report (Scrolls on desktop) */}
      <div className="flex-1 lg:overflow-y-auto lg:h-full custom-scrollbar bg-slate-50 p-6 lg:p-8">
        {isDegradedNoBasis ? (
          <div className={cn(CARD, "mt-6 p-6 text-center space-y-4 max-w-2xl mx-auto")}>
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">
              {t("degraded.noBasisTitle")}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
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
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">
              {t("degraded.unusableTitle")}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
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
        ) : isSuspect ? (
          <div className={cn(CARD, "mt-6 p-6 text-center space-y-4 max-w-2xl mx-auto") }>
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">
              {t("matchDepth.inputQualityTitle", { defaultValue: "Kết quả tạm tính" })}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              {t("matchDepth.inputQualityBody", { defaultValue: "CV cần được đọc lại trước khi kết luận kỹ năng nào đang thiếu. Hãy thử tải lên bản PDF có lớp văn bản rõ hơn." })}
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

        {/* Tab 1: Audit Report / Fit */}
        {(activeTab === 'audit' || activeTab === 'fit') && (
          <div className="w-full px-2 lg:px-4 space-y-8">
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
              <div className="flex items-start gap-2.5 p-3.5 mx-auto max-w-2xl mb-6 bg-slate-50 border border-slate-200/60 rounded-xl text-left animate-in fade-in slide-in-from-top-2 shadow-sm text-xs text-slate-600">
                <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
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

            {/* TRUST': actual analysis details */}
            {canTrustAnalysis && (
              <>
                {/* ────────────────────────────────────────────────────────────────────
                 *  CHƯƠNG 1 — Đọc vị: Radar + Narrative + MatchSkillsMatrix
                 * ──────────────────────────────────────────────────────────────────── */}
                {isJdMode && !isDegradedNoBasis && (
                  <>
                    <div id="chapter-radar" className="py-4 md:py-6 space-y-8">
                      <Chapter
                        kicker={`01`}
                        title={t("editorial.chap1", { defaultValue: "Đọc vị năng lực & Ma trận kỹ năng" })}
                      >
                        {/* Single Unified Card */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                            {/* Left: Radar Chart (5 cols) */}
                            <div className="lg:col-span-5 flex flex-col items-center justify-center">
                              <div className="w-full mb-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center lg:text-left">
                                  {t("results.radarTitle", { defaultValue: "Biểu đồ phân bố năng lực" })}
                                </h4>
                                <p className="text-xs text-slate-500 text-center lg:text-left">
                                  {t("results.radarSubtitle", { defaultValue: "Mức độ đáp ứng các nhóm kỹ năng trọng yếu" })}
                                </p>
                              </div>
                              {radarData.length > 0 ? (
                                <div className="w-full">
                                  <ResponsiveContainer width="100%" height={260}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                      <PolarGrid stroke="hsl(var(--border))" />
                                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} />
                                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, fontWeight: 600, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }} formatter={(value: number, name: string) => [`${value}%`, name === "you" ? t("results.radarYou") : t("results.radarRequired")]} />
                                      <Radar name="required" dataKey="required" stroke="hsl(var(--border))" fill="hsl(var(--border))" fillOpacity={0.3} strokeDasharray="4 2" />
                                      <Radar name="you" dataKey="you" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} strokeWidth={2} />
                                    </RadarChart>
                                  </ResponsiveContainer>
                                  <div className="flex justify-center gap-6 mt-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-ink-accent"><div className="w-3 h-1 rounded-full bg-ink-accent" /><span>{t("results.radarYou")}</span></div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><div className="w-3 h-0.5 bg-slate-200 border-t border-dashed border-slate-200" /><span>{t("results.radarRequired")}</span></div>
                                  </div>
                                </div>
                              ) : (
                                <p className="py-16 text-center text-sm text-slate-500">{t("results.radarEmpty")}</p>
                              )}
                            </div>

                            {/* Right: Narrative Breakdown (7 cols) */}
                            <div className="lg:col-span-7 lg:border-l lg:border-slate-100 lg:pl-8 flex flex-col justify-center">
                              <MatchNarrative jdMatch={jdMatch} t={t} />
                            </div>
                          </div>
                        </div>
                      </Chapter>

                      {/* Full Match Skills Breakdown Matrix */}
                      {!isSuspect && jdMatch?.scoring_breakdown?.per_skill && jdMatch.scoring_breakdown.per_skill.length > 0 && (
                        <div className="pt-2">
                          <MatchSkillsMatrix skills={jdMatch.scoring_breakdown.per_skill} />
                        </div>
                      )}
                    </div>
                    <SectionRule />
                  </>
                )}

                {/* ────────────────────────────────────────────────────────────────────
                 *  CHƯƠNG 2 — Cần cải thiện ưu tiên (GapReportCard)
                 * ──────────────────────────────────────────────────────────────────── */}
                {ENABLE_DIAGNOSIS_ADDONS && isJdMode && jdMatch?.matchId && !isSuspect && (
                  <div id="gap-anchor" className="py-6 md:py-8">
                    <Chapter
                      kicker="02"
                      title={t("editorial.chap2")}
                    >
                      <GapReportCard matchId={jdMatch.matchId} onAsk={askGap} />
                    </Chapter>
                  </div>
                )}

                {ENABLE_DIAGNOSIS_ADDONS && isJdMode && jdMatch?.matchId && !isSuspect && <SectionRule />}

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
                              <h3 className="text-sm font-bold text-slate-900">
                                {isJdMode ? t("results.gapTitle") : t("results.gapTitleNoJd")}
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {isJdMode ? t("results.gapDescJd") : t("results.gapDescNoJd")}
                              </p>
                            </div>
                            {isJdMode && (
                              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 w-fit">
                                <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />{activeSkills.filter(s => s.status === "present").length} {t("results.found")}</span>
                                <span className="flex items-center gap-1.5 text-amber-700"><AlertCircle className="w-3.5 h-3.5" />{activeSkills.filter(s => s.status === "partial").length} {t("results.partial")}</span>
                                <span className="flex items-center gap-1.5 text-rose-700"><X className="w-3.5 h-3.5" />{activeSkills.filter(s => s.status === "missing").length} {t("results.missing")}</span>
                              </div>
                            )}
                          </div>

                          {isJdMode && (
                            <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-lg w-fit">
                              <button onClick={() => setSkillTab("hard")} className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all", skillTab === "hard" ? "bg-white text-primary shadow-[0_1px_3px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-900")}>
                                <Code className="w-4 h-4" /> {t("results.hardSkills")}
                                {skillTab === "hard" && <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px] leading-none font-mono tabular-nums">{hardSkills.length}</span>}
                              </button>
                              <button onClick={() => setSkillTab("soft")} className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all", skillTab === "soft" ? "bg-white text-primary shadow-[0_1px_3px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-900")}>
                                <Users className="w-4 h-4" /> {t("results.softSkills")}
                                {skillTab === "soft" && <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px] leading-none font-mono tabular-nums">{softSkills.length}</span>}
                              </button>
                            </div>
                          )}

                          <div className="mt-2">
                            {isJdMode && activeSkills.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeSkills.map((skill, i) => (
                                  <KeywordRow
                                    key={`${skill.name}-${i}`}
                                    skill={skill}
                                    index={i}
                                    t={t}
                                    evidenceStrength={findEvidenceStrength(skill, reviewData?.evidence_ledger)}
                                  />
                                ))}
                              </div>
                            ) : isJdMode ? (
                              <p className="py-6 text-sm text-slate-500">{t("results.gapEmpty")}</p>
                            ) : null}
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
                      {isJdMode && !isSuspect && (
                        <TailorChecklist
                          matchId={jdMatch?.matchId}
                          cvId={lastCvId}
                          document={reviewData?.document}
                        />
                      )}

                      {/* Interview Plan */}
                      {isJdMode && jdMatch?.matchId && !isSuspect && <MatchInterviewPlanCard matchId={jdMatch.matchId} />}

                      {/* Next Steps (Companion) */}
                      {isJdMode && jdMatch?.matchId && !isSuspect && <NextStepsCard matchId={jdMatch.matchId} />}

                      {/* AI Insights: Tabbed Assessment & Magic Card */}
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                        {/* Tabbed Assessment (Strengths / Gaps) */}
                        <div className="lg:col-span-3 space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2 px-1">
                            <button
                              onClick={() => setInsightTab("strengths")}
                              className={cn(
                                "px-4 py-2 text-sm font-bold transition-all relative rounded-t-lg hover:bg-slate-50",
                                insightTab === "strengths" ? "text-emerald-700" : "text-slate-500"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4" /> {t("results.strengths")}
                              </div>
                              {insightTab === "strengths" && <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-emerald-700" />}
                            </button>
                            <button
                              onClick={() => setInsightTab("gaps")}
                              className={cn(
                                "px-4 py-2 text-sm font-bold transition-all relative rounded-t-lg hover:bg-slate-50",
                                insightTab === "gaps" ? "text-rose-700" : "text-slate-500"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4" /> {t("results.gaps")}
                              </div>
                              {insightTab === "gaps" && <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-rose-700" />}
                            </button>
                          </div>

                          <div className={cn(CARD, "p-6 min-h-[280px]")}>
                            {insightTab === "strengths" ? (
                              <div className="space-y-4 animate-in fade-in duration-500">
                                <ul className="space-y-3">
                                  {(strengths.length > 0 ? strengths : [t("results.strengthsEmpty")]).map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-900 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                      <TrendingUp className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700" />{item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="space-y-4 animate-in fade-in duration-500">
                                <ul className="space-y-3">
                                  {(criticalGaps.length > 0 ? criticalGaps : [t("results.gapsEmpty")]).map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-900 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-700" />{item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* The Magic Card (Action Plan) */}
                        <div className="lg:col-span-2">
                          <div className="relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/60">
                            <div className="relative h-full flex flex-col p-6">
                              <div className="flex items-center gap-2 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50 shadow-sm">
                                  <Sparkles className="w-5 h-5" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 tracking-tight">{t("results.actionPlan")}</h4>
                              </div>

                              <ul className="space-y-4 flex-1">
                                {(actionPlan.length > 0 ? actionPlan : [t("results.actionPlanEmpty")]).map((item, i) => (
                                  <li key={i} className="flex items-start gap-3 text-[13px] text-slate-900 font-medium leading-relaxed">
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
                      {isJdMode && jdMatch?.matchId && !isSuspect && (
                        <RoadmapFromMatchSection matchId={jdMatch?.matchId} onScanAgain={scanAgain} />
                      )}
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

        {/* Tab 2: Your CV / CV & JD */}
        {(activeTab === 'cv' || activeTab === 'cv_jd') && (
          <div className="w-full px-2 lg:px-4 space-y-8 animate-in fade-in duration-300">
            {isJdMode ? (
              <CvJdDualPanel
                cvName={resolveDiagnosisCvDisplayName({
                  cvFileName: cvFile?.name ?? null,
                  cvDisplayName,
                  isFromBuilder,
                  builderCvName,
                  fallback: t("review.fallbackCvName", { defaultValue: "CV chưa đặt tên" }),
                })}
                jdText={jobDescription}
                jdTitle={jdMatch?.job_title || jdMatch?.target_role || undefined}
                jdSourceUrl={jdMatch?.source_url || undefined}
                onEditOriginal={() => seedBuilderFromDocument(reviewData?.document)}
              />
            ) : (
              <>
                {/* Header bar: Issues Count & Edit button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200/60 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", (reviewData?.issues?.length ?? 0) > 0 ? "bg-rose-700" : "bg-emerald-700")} />
                    <p className="text-sm font-semibold text-slate-900">
                      {(reviewData?.issues?.length ?? 0) > 0
                        ? t("review.issuesMarked", { count: reviewData?.issues?.length ?? 0, defaultValue: `Tìm thấy ${reviewData?.issues?.length ?? 0} điểm cải thiện trong CV của bạn` })
                        : t("review.noIssuesMarked", { defaultValue: "Tuyệt vời! Không phát hiện lỗi nghiêm trọng nào." })
                      }
                    </p>
                  </div>
                  <Button
                    onClick={() => seedBuilderFromDocument(reviewData?.document)}
                    size="sm"
                    className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 h-9 rounded-lg text-xs transition-colors shrink-0"
                  >
                    {t("preview.editOriginal", { defaultValue: "Sửa CV gốc" })}
                  </Button>
                </div>

                <div className="w-full max-w-6xl mx-auto bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm">
                  <DocumentPreview hideEditOriginal />
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 3: Market Insights / Jobs */}
        {(activeTab === 'market' || activeTab === 'jobs') && (
          <div className="w-full px-2 lg:px-4 space-y-10 animate-in fade-in duration-300">
            <JobRecommendations
              key={lastCvId ?? "no-cv"}
              cvId={lastCvId}
              targetRole={targetRole}
            />

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
      present: "bg-emerald-50 text-emerald-700 rounded px-0.5 font-medium border border-emerald-200/50",
      partial: "bg-amber-50 text-amber-700 rounded px-0.5 font-medium border border-amber-200/50",
      missing: "bg-rose-50 text-rose-700 rounded px-0.5 font-medium border border-rose-200/50 underline decoration-dotted decoration-1",
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
    <div className="border-t border-slate-200/60 mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 px-1 hover:bg-slate-50/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex flex-col items-start gap-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-ink-accent" />
            {t("results.jdHighlightTitle")}
          </h3>
          {isOpen && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {t("results.matched")}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {t("results.partial")}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 underline decoration-dotted">
                {t("results.missing")}
              </span>
            </div>
          )}
        </div>
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
          {toggleText}
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {isOpen && (
        <div className="pb-5 px-1">
          <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-4 max-h-80 overflow-y-auto text-[13px] leading-relaxed text-slate-900 whitespace-pre-wrap font-normal">
            {highlightedNodes.length > 0 ? highlightedNodes : jobDescription}
          </div>
        </div>
      )}
    </div>
  );
});
