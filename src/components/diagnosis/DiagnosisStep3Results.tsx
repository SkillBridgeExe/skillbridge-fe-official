import React, { memo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertCircle, X, ArrowLeft, ArrowRight, Share2, Download,
  Sparkles, TrendingUp, Target, Lightbulb, Zap, Shield, Code, Users, RotateCcw,
  ChevronDown, ChevronUp
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip
} from "recharts";
import { Link } from "react-router-dom";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { downloadOriginalCvFile } from "@/services/diagnosis.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { GapReportCard } from "./GapReportCard";
import type { CvJdMatch, EvidenceLedger, EvidenceStrength, InferredSkill, SkillMatchItem } from "@shared/api";

/* ── Design tokens (§0b) ── */
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

/* ── Flat Mono Score Display ── */
const FlatScore = memo(function FlatScore({ target, label }: { target: number; label: string }) {
  const [displayed, setDisplayed] = useState(0);
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion) { setDisplayed(target); return; }
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setDisplayed(Math.round(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, prefersReducedMotion]);

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${label}: ${target}%`}>
      <div className="flex items-baseline gap-1">
        <span className="text-[64px] font-mono tabular-nums font-black text-[#2F3437] leading-none tracking-[-0.02em]">
          {displayed}
        </span>
        <span className="text-sm text-[#787774] font-medium">%</span>
      </div>
      <span className="text-[11px] font-bold text-[#787774] uppercase tracking-widest mt-1">{label}</span>
    </div>
  );
});

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

/* ── Main Component ── */
function MatchDepthSummary({
  jdMatch,
  t,
}: {
  jdMatch: CvJdMatch | null | undefined;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (!jdMatch?.scoring_breakdown) return null;
  const breakdown = jdMatch.scoring_breakdown;
  const coverage = Math.round((jdMatch.required_coverage ?? 0) * 100);

  return (
    <div className={cn(CARD, "p-5")}>
      <h3 className="text-sm font-bold text-[#2F3437] mb-3">{t("matchDepth.whyScore")}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#DCE9D7] bg-[#EDF3EC] p-3">
          <p className="text-[10px] font-bold uppercase text-[#346538]">{t("results.matched")}</p>
          <p className="font-mono text-xl font-bold text-[#346538]">{breakdown.matched_count}</p>
        </div>
        <div className="rounded-xl border border-[#F1E5C0] bg-[#FBF3DB] p-3">
          <p className="text-[10px] font-bold uppercase text-[#956400]">{t("results.partial")}</p>
          <p className="font-mono text-xl font-bold text-[#956400]">{breakdown.partial_count}</p>
        </div>
        <div className="rounded-xl border border-[#F6D4D5] bg-[#FDEBEC] p-3">
          <p className="text-[10px] font-bold uppercase text-[#9F2F2D]">{t("results.missing")}</p>
          <p className="font-mono text-xl font-bold text-[#9F2F2D]">{breakdown.missing_count}</p>
        </div>
        <div className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-3">
          <p className="text-[10px] font-bold uppercase text-[#787774]">{t("matchDepth.coverage")}</p>
          <p className="font-mono text-xl font-bold text-[#2F3437]">{coverage}%</p>
        </div>
      </div>
      {jdMatch.experience_fit?.status && jdMatch.experience_fit.status !== "unknown" && (
        <p className="mt-3 text-xs font-medium text-[#787774]">
          {t(`matchDepth.fit.${jdMatch.experience_fit.status}`)}
          {jdMatch.experience_fit.confidence !== "high" && ` · ${t("matchDepth.fit.estimate")}`}
        </p>
      )}
      {breakdown.cap_applied && (
        <p className="mt-2 text-xs font-medium text-[#956400]">{t("matchDepth.capped")}</p>
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
    <div className={cn(CARD, "p-5")}>
      <h3 className="text-sm font-bold text-[#2F3437]">{t("matchDepth.inferredTitle")}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#787774]">{t("matchDepth.inferredHint")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
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

export function DiagnosisStep3Results() {
  const { t } = useTranslation("diagnosis");
  const { goBack, scanAgain, skillTab, setSkillTab, reviewData, jobDescription, lastCvId } = useDiagnosisStore();
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

  /* ── Confetti for high scores ── */
  const confettiFired = useRef(false);
  useEffect(() => {
    if (matchScore >= 85 && !confettiFired.current) {
      confettiFired.current = true;
      import("canvas-confetti").then((mod) => {
        const fire = mod.default;
        fire({ particleCount: 120, spread: 80, origin: { y: 0.6 }, zIndex: 9999 });
        setTimeout(() => fire({ particleCount: 60, spread: 100, origin: { y: 0.5 }, zIndex: 9999 }), 300);
      }).catch(() => { /* silent */ });
    }
  }, [matchScore]);

  /* ── Dynamic UX copy ── */
  const scoreMessage = matchScore >= 85
    ? t("results.scoreMsg.excellent")
    : matchScore >= 80
      ? t("results.scoreMsg.strong")
      : matchScore >= 50
        ? t("results.scoreMsg.decent")
        : t("results.scoreMsg.weak");

  return (
    <div className="space-y-6 animate-in fade-in duration-600">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button onClick={goBack} className="flex items-center gap-1.5 text-sm font-semibold text-[#787774] hover:text-primary transition-colors group focus-visible:ring-2 focus-visible:ring-primary/40 rounded">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> {t("results.backToReview")}
        </button>
        <div className="flex items-center gap-3">
          <Button onClick={handleShare} variant="outline" size="sm" className="rounded-lg gap-2 text-xs font-semibold border-[#EAEAEA] text-[#2F3437] hover:bg-[#F1F1EF] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40">
            <Share2 className="w-3.5 h-3.5" /> {t("results.share")}
          </Button>
          <Button onClick={handleDownload} disabled={!lastCvId} variant="outline" size="sm" className="rounded-lg gap-2 text-xs font-semibold border-[#EAEAEA] text-[#2F3437] hover:bg-[#F1F1EF] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40">
            <Download className="w-3.5 h-3.5" /> {t("results.download")}
          </Button>
        </div>
      </div>

      {/* Row 1: Score + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Score card */}
        <div className={cn(CARD, "lg:col-span-2 flex flex-col items-center justify-center py-10")}>
          <div className="text-[11px] uppercase tracking-widest text-[#787774] font-bold mb-4">
            {isJdMode ? t("results.overallMatch") : t("results.overallScore")}
          </div>
          <FlatScore target={matchScore} label={scoreLabel} />
          {/* Band message */}
          <p className="text-xs text-[#787774] font-medium mt-4 text-center px-6 max-w-xs">
            {scoreMessage}
          </p>

          {isJdMode ? (
            <div className="grid grid-cols-3 gap-3 w-full mt-6 px-6">
              <div className="flex flex-col items-center p-3 bg-[#EDF3EC] rounded-xl border border-[#DCE9D7]">
                <CheckCircle2 className="w-4 h-4 text-[#346538] mb-1" />
                <span className="text-xl font-mono tabular-nums font-bold text-[#346538]">{presentCount}</span>
                <span className="text-[10px] text-[#346538] font-bold uppercase mt-0.5">{t("results.matched")}</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-[#FBF3DB] rounded-xl border border-[#F1E5C0]">
                <AlertCircle className="w-4 h-4 text-[#956400] mb-1" />
                <span className="text-xl font-mono tabular-nums font-bold text-[#956400]">{partialCount}</span>
                <span className="text-[10px] text-[#956400] font-bold uppercase mt-0.5">{t("results.partial")}</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-[#FDEBEC] rounded-xl border border-[#F6D4D5]">
                <X className="w-4 h-4 text-[#9F2F2D] mb-1" />
                <span className="text-xl font-mono tabular-nums font-bold text-[#9F2F2D]">{missingCount}</span>
                <span className="text-[10px] text-[#9F2F2D] font-bold uppercase mt-0.5">{t("results.missing")}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 w-full mt-6 px-6">
              <div className="flex flex-col items-center p-3 bg-[#F1F1EF] rounded-xl border border-[#E3E3E0]">
                <Shield className="w-4 h-4 text-[#787774] mb-1" />
                <span className="text-xl font-mono tabular-nums font-bold text-[#2F3437]">{reviewData?.breakdown.ats ?? 0}</span>
                <span className="text-[10px] text-[#787774] font-bold uppercase mt-0.5">{t("results.ats")}</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-[#F1F1EF] rounded-xl border border-[#E3E3E0]">
                <Code className="w-4 h-4 text-[#787774] mb-1" />
                <span className="text-xl font-mono tabular-nums font-bold text-[#2F3437]">{reviewData?.breakdown.structure ?? 0}</span>
                <span className="text-[10px] text-[#787774] font-bold uppercase mt-0.5">{t("results.structure")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Radar Chart */}
        <div className={cn(CARD, "lg:col-span-3")}>
          <div className="border-b border-[#EAEAEA] p-5">
            <h3 className="text-base font-bold text-[#2F3437]">{t("results.radarTitle")}</h3>
            <p className="text-xs text-[#787774] mt-0.5">
              {isJdMode ? t("results.radarDescJd") : t("results.radarDescNoJd")}
            </p>
          </div>
          <div className="p-5">
            {isJdMode && radarData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#E3E3E0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#787774", fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAEAEA", fontSize: 12, fontWeight: 600, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }} formatter={(value: number, name: string) => [`${value}%`, name === "you" ? t("results.radarYou") : t("results.radarRequired")]} />
                    <Radar name="required" dataKey="required" stroke="#E3E3E0" fill="#E3E3E0" fillOpacity={0.3} strokeDasharray="4 2" />
                    <Radar name="you" dataKey="you" stroke="#2F3437" fill="#2F3437" fillOpacity={0.1} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#2F3437]"><div className="w-3 h-1 rounded-full bg-[#2F3437]" /><span>{t("results.radarYou")}</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#787774]"><div className="w-3 h-0.5 bg-[#E3E3E0]" style={{ borderTop: "1px dashed #E3E3E0" }} /><span>{t("results.radarRequired")}</span></div>
                </div>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-[#787774]">{t("results.radarEmpty")}</p>
            )}
          </div>
        </div>
      </div>

      {isJdMode && <MatchDepthSummary jdMatch={jdMatch} t={t} />}

      {/* Row 2: Keyword Table */}
      <div className={CARD}>
        <div className="border-b border-[#EAEAEA] p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#2F3437]">
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
            <div className="flex gap-1 mt-4 p-1 bg-[#F1F1EF] rounded-lg w-fit">
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
        </div>
        <div className="p-5">
          {isJdMode && (
            <div className="hidden md:flex items-center gap-4 pb-3 border-b border-[#F1F1EF] text-[11px] font-bold uppercase tracking-wider text-[#787774] px-0">
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
      </div>

      {isJdMode && <InferredSkillsBlock skills={jdMatch?.inferred_skills} t={t} />}

      {/* Gap Report hợp nhất (BE #43/#49) — chỉ khi match đã persist trên BE */}
      {isJdMode && jdMatch?.match_id && <GapReportCard matchId={jdMatch.match_id} />}

      {/* Row 3: AI Insights */}
      <div className={cn(CARD, "overflow-hidden")}>
        <div className="border-b border-[#EAEAEA] p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#2F3437]">
            <Sparkles className="w-5 h-5 text-primary" /> {t("results.insightsTitle")}
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#F1F1EF]">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EDF3EC] text-[#346538] flex items-center justify-center shrink-0"><Shield className="w-4 h-4" /></div>
              <h4 className="text-sm font-bold text-[#2F3437]">{t("results.strengths")}</h4>
            </div>
            <ul className="space-y-3">
              {(strengths.length > 0 ? strengths : [t("results.strengthsEmpty")]).map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#2F3437] font-medium"><TrendingUp className="w-4 h-4 mt-0.5 shrink-0 text-[#346538]" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FDEBEC] text-[#9F2F2D] flex items-center justify-center shrink-0"><Target className="w-4 h-4" /></div>
              <h4 className="text-sm font-bold text-[#2F3437]">{t("results.gaps")}</h4>
            </div>
            <ul className="space-y-3">
              {(criticalGaps.length > 0 ? criticalGaps : [t("results.gapsEmpty")]).map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#2F3437] font-medium"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#9F2F2D]" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F1F1EF] text-[#787774] flex items-center justify-center shrink-0"><Lightbulb className="w-4 h-4" /></div>
              <h4 className="text-sm font-bold text-[#2F3437]">{t("results.actionPlan")}</h4>
            </div>
            <ul className="space-y-3">
              {(actionPlan.length > 0 ? actionPlan : [t("results.actionPlanEmpty")]).map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#2F3437] font-medium"><Zap className="w-4 h-4 mt-0.5 shrink-0 text-[#787774]" />{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA footer — de-glassed from dark gradient to simple bordered card */}
        <div className="m-4 p-6 bg-[#FBFBFA] border border-[#EAEAEA] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-bold text-[#2F3437] text-base">{t("results.roadmapTitle")}</p>
            <p className="text-sm text-[#787774] mt-1">{t("results.roadmapDesc")}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={scanAgain}
              className="h-12 rounded-lg gap-2 text-sm font-semibold text-[#787774] hover:bg-[#F1F1EF] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <RotateCcw className="w-4 h-4" /> {t("results.scanAgain")}
            </Button>
            <Button className="h-12 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm text-sm font-bold shrink-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40" asChild>
              <Link to="/roadmap-generator" className="px-6 flex items-center h-full gap-2">
                {t("results.generatePlan")} <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

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
    <Card className="bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 border-b border-[#EAEAEA] hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex flex-col items-start gap-1">
          <h3 className="text-base font-bold text-[#2F3437] flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
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
        <div className="p-5 bg-slate-50">
          <div className="bg-white border border-[#EAEAEA] rounded-lg p-4 max-h-80 overflow-y-auto text-[13px] leading-relaxed text-[#2F3437] whitespace-pre-wrap font-normal">
            {highlightedNodes.length > 0 ? highlightedNodes : jobDescription}
          </div>
        </div>
      )}
    </Card>
  );
});
