import { ReactNode, useState } from "react";
import { Check, Sparkles, Download, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { CheckGroupData } from "@/lib/diagnosis-report";
import type { CvScoreBreakdown, FitVerdict, FitReasonCode } from "@shared/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { triggerCvDownload } from "@/services/diagnosis.service";
import { CHAT_CONTEXT_ID } from "@/components/companion/skills/useDiagnosisChatCompanion";
import { matchScoreBand } from "@/lib/match-score-band";
import { FitBadge } from "../FitBadge";

/** Match-mode stats passed from DiagnosisStep3Results. */
export interface MatchStatsData {
  matched: number;
  partial: number;
  missing: number;
  coveragePercent?: number;
  fitVerdict?: { verdict: FitVerdict; reasons: FitReasonCode[] } | null;
  /** Unnormalized JD requirements the system could not score. */
  unnormalizedRequirements?: string[];
}

interface ScoreRailProps {
  overallScore: number;
  groups: CheckGroupData[];
  breakdown?: CvScoreBreakdown;
  /** One-line verdict under the donut (the hero is gone in report mode). */
  verdictMessage?: string;
  /** Action buttons under the donut — Jobscan's "Upload & rescan" slot. */
  actions?: ReactNode;
  /**
   * When provided, ScoreRail renders in **match mode**: donut uses match-band
   * thresholds (80/60), shows match stats (matched/partial/missing) instead of
   * review breakdown bars, and displays the FitBadge. When absent, falls back
   * to the original review-mode rendering.
   */
  matchStats?: MatchStatsData;
}

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

const scrollToGroup = (groupId: string) => {
  const targets: string[] = [];
  if (groupId === "ats") {
    targets.push("group-ats", "gap-anchor", "chapter-radar");
  } else if (groupId === "content") {
    targets.push("group-content", "chapter-radar");
  } else if (groupId === "skills") {
    targets.push("group-skills", "chapter-skills");
  } else if (groupId === "ai_eval") {
    targets.push("group-ai_eval", "chapter-action");
  }
  targets.push(`group-${groupId}`, `chapter-${groupId}`);

  let element: HTMLElement | null = null;
  for (const id of targets) {
    element = document.getElementById(id);
    if (element) break;
  }

  if (!element) return;

  const behavior = prefersReduced() ? "auto" : "smooth";
  element.scrollIntoView({ behavior, block: "center" });
};

/** Same 3-band thresholds as dimensionTone/element-issues.ts (70/50). REVIEW mode only. */
const bandOf = (score: number) =>
  score >= 70
    ? { key: "review.band.strong", chip: "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/5", stroke: "#10B981", bar: "bg-emerald-500" }
    : score >= 50
      ? { key: "review.band.watch", chip: "bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm shadow-amber-500/5", stroke: "#F59E0B", bar: "bg-amber-500" }
      : { key: "review.band.priority", chip: "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm shadow-rose-500/5", stroke: "#EF4444", bar: "bg-rose-500" };

export function ScoreRail({ overallScore, groups, breakdown, verdictMessage, actions, matchStats }: ScoreRailProps) {
  const { t } = useTranslation("diagnosis");
  const { lastCvId } = useDiagnosisStore();
  const { toast } = useToast();

  const isMatch = !!matchStats;

  // Pick band: match mode uses shared 80/60 thresholds, review mode uses 70/50.
  const matchBand = isMatch ? matchScoreBand(overallScore) : null;
  const reviewBand = !isMatch ? bandOf(overallScore) : null;

  // Unified shape for the donut
  const bandChip = isMatch ? matchBand!.chip : reviewBand!.chip;
  const bandStroke = isMatch ? matchBand!.stroke : reviewBand!.stroke;
  const bandLabel = isMatch ? t(matchBand!.i18nKey) : t(reviewBand!.key);

  const handleAskCompanion = () => {
    const companionStore = useCompanionStore.getState();
    // Always target the living chat context registered by useDiagnosisChatCompanion
    // on both Step 2 (Review) and Step 3 (Results). The old "diagnosis:results" /
    // "diagnosis:review" contexts are dead since the calm-corner refactor (06-23).
    if (companionStore.activeId !== CHAT_CONTEXT_ID) {
      companionStore.activateContext(CHAT_CONTEXT_ID);
    }
    companionStore.openBubble();
  };

  const handleDownloadCv = async () => {
    if (!lastCvId) return;
    await triggerCvDownload(lastCvId, toast, t);
  };

  // Donut geometry — big and bold, Jobscan-style
  const size = 150;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const getCategoryScore = (groupId: string): number | undefined => {
    if (!breakdown) return undefined;
    switch (groupId) {
      case "ats": return breakdown.ats;
      case "content": return breakdown.structure;
      case "skills": return breakdown.skills;
      case "ai_eval": return breakdown.experience;
      default: return undefined;
    }
  };

  // ── Unnormalized requirements (match mode only) ──
  const unnormalized = matchStats?.unnormalizedRequirements ?? [];
  const hasUnnormalized = unnormalized.length > 0;
  const scoredCount = (matchStats?.matched ?? 0) + (matchStats?.partial ?? 0) + (matchStats?.missing ?? 0);
  const totalWithUnnormalized = scoredCount + unnormalized.length;
  const [unnormalizedExpanded, setUnnormalizedExpanded] = useState(false);

  return (
    <aside className="w-full lg:h-full lg:flex lg:flex-col">
      {/* Below lg: horizontal scrollable chip bar (at lg the sidebar gets its own grid column) */}
      <div className="lg:hidden sticky top-14 bg-white/95 backdrop-blur z-20 py-2 border-b border-[#EAEAEA] overflow-x-auto flex items-center gap-2 -mx-4 px-4 scrollbar-none">
        {/* Score chip — the only score display below lg now that the hero is gone */}
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shrink-0", bandChip)}>
          <span className="font-mono text-sm font-black tabular-nums">{overallScore}</span>/100 · {bandLabel}
        </span>
        {!isMatch && groups.map((group) => (
          <button
            key={group.id}
            onClick={() => scrollToGroup(group.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-semibold text-[#2F3437] transition-all hover:bg-slate-50 shrink-0 active:scale-[0.98]"
          >
            <span>{group.label}</span>
            {group.issueCount > 0 ? (
              <span className="rounded-full bg-[#FDEBEC] text-[#9F2F2D] border border-[#F6D4D5] px-1.5 text-[10px] font-bold tabular-nums">
                {group.issueCount}
              </span>
            ) : (
              <span className="w-3.5 h-3.5 rounded-full bg-[#EDF3EC] flex items-center justify-center border border-[#DCE9D7]">
                <Check className="w-2.5 h-2.5 text-[#346538]" />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Desktop (>=lg): report sidebar contents mapped directly inside parent aside container */}
      <div className="hidden lg:flex flex-col h-full w-full">
        {/* Donut */}
        <div className="flex flex-col items-center mb-5 shrink-0">
          <h3 className="text-xs font-bold text-[#787774] uppercase tracking-wider mb-4">
            {isMatch
              ? t("report.rail.matchScoreTitle", { defaultValue: "Điểm khớp JD" })
              : t("report.rail.scoreTitle", { defaultValue: "Điểm tương thích" })}
          </h3>
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#F1F1EF" strokeWidth={strokeWidth} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={bandStroke}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-all duration-1000 ease-out motion-reduce:transition-none"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center leading-none">
              <span className="font-mono text-5xl font-black tracking-tight text-[#2F3437] tabular-nums">{overallScore}</span>
              <span className="text-[11px] font-bold text-[#A1A1A1] uppercase mt-1">/ 100</span>
            </div>
          </div>
          <span className={cn("mt-3 rounded-full px-3 py-1 text-[11px] font-bold border uppercase tracking-wide", bandChip)}>
            {bandLabel}
          </span>
          {verdictMessage && (
            <p className="mt-2.5 text-[13px] leading-relaxed text-[#5F666B] text-center">
              {verdictMessage}
            </p>
          )}
          {actions && <div className="mt-4 w-full">{actions}</div>}
        </div>

        {/* ── MODE: match → stats + fit badge (no review bars) ── */}
        {isMatch && (
          <div className="border-t border-[#EAEAEA] py-4 space-y-3 w-full">
            {/* Match skill stats: matched / partial / missing */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#346538]" />
                <span className="text-xs font-semibold text-[#346538]">{t("results.matched", { defaultValue: "Khớp" })}</span>
                <span className="ml-auto font-mono text-xs font-bold text-[#2F3437] tabular-nums">{matchStats.matched}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#956400]" />
                <span className="text-xs font-semibold text-[#956400]">{t("results.partial", { defaultValue: "Một phần" })}</span>
                <span className="ml-auto font-mono text-xs font-bold text-[#2F3437] tabular-nums">{matchStats.partial}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-[#9F2F2D]" />
                <span className="text-xs font-semibold text-[#9F2F2D]">{t("results.missing", { defaultValue: "Thiếu" })}</span>
                <span className="ml-auto font-mono text-xs font-bold text-[#2F3437] tabular-nums">{matchStats.missing}</span>
              </div>
            </div>

            {/* Coverage percent */}
            {matchStats.coveragePercent !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#787774] font-medium">
                  {t("report.rail.matchCoverage", { defaultValue: "Độ phủ yêu cầu" })}
                </span>
                <span className="font-mono font-bold text-[#2F3437] tabular-nums">
                  {matchStats.coveragePercent}%
                </span>
              </div>
            )}

            {/* Fit verdict badge */}
            {matchStats.fitVerdict && (
              <div className="pt-1">
                <FitBadge fit={matchStats.fitVerdict} />
              </div>
            )}

            {/* Unnormalized requirements chip (amber warning) */}
            {hasUnnormalized && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setUnnormalizedExpanded((v) => !v)}
                  className="w-full flex items-start gap-2 p-2.5 rounded-lg bg-[#FBF3DB] border border-[#F1E5C0] text-left transition-colors hover:bg-[#F8EDCA]"
                  aria-expanded={unnormalizedExpanded}
                >
                  <Info className="w-3.5 h-3.5 text-[#956400] mt-0.5 shrink-0" />
                  <span className="text-[11px] leading-relaxed text-[#956400]">
                    {t("report.rail.unnormalizedChip", {
                      scored: scoredCount,
                      total: totalWithUnnormalized,
                      unscored: unnormalized.length,
                      defaultValue: `Chấm trên ${scoredCount}/${totalWithUnnormalized} yêu cầu đọc được — ${unnormalized.length} yêu cầu ngoài phạm vi chưa đánh giá được`,
                    })}
                  </span>
                </button>
                {unnormalizedExpanded && (
                  <ul className="mt-1.5 ml-5 space-y-0.5 list-disc text-[10px] text-[#956400]">
                    {unnormalized.map((name, idx) => (
                      <li key={idx}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MODE: review → categories (Jobscan-style rows) ── */}
        {!isMatch && (
          <nav className="border-t border-[#EAEAEA] divide-y divide-[#F1F1EF] w-full flex-1">
            {groups.map((group) => {
              const score = getCategoryScore(group.id);
              const hasIssues = group.issueCount > 0;

              return (
                <button
                  key={group.id}
                  onClick={() => scrollToGroup(group.id)}
                  className="w-full text-left py-3.5 lg:py-5 hover:bg-slate-50/60 transition-colors group focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink-accent/40 flex flex-col"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="text-[13px] font-bold text-[#2F3437] group-hover:text-ink-accent truncate">
                      {group.label}
                    </span>
                    {hasIssues ? (
                      <span className="text-[12px] font-bold text-[#00AEEF] whitespace-nowrap tabular-nums hover:underline">
                        {t("report.rail.issuesBadge", { count: group.issueCount, defaultValue: `${group.issueCount} lỗi` })}
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-[#EDF3EC] flex items-center justify-center border border-[#DCE9D7] shrink-0">
                        <Check className="w-2.5 h-2.5 text-[#346538]" />
                      </span>
                    )}
                  </div>
                  {score !== undefined && (
                    <div className="mt-2 w-full h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700 motion-reduce:transition-none", bandOf(score).bar)}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Divider */}
        <div className="border-t border-[#EAEAEA]" />

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <Button
            variant="ghost"
            onClick={handleAskCompanion}
            className="w-full justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white hover:from-sky-600 hover:to-indigo-600 shadow-md shadow-sky-500/10 hover:shadow-lg hover:shadow-sky-500/20 transition-all font-bold text-[13px] h-10 rounded-xl border-0"
          >
            <Sparkles className="w-4 h-4" />
            {t("report.rail.askCompanion")}
          </Button>

          {lastCvId && (
            <Button
              variant="outline"
              onClick={handleDownloadCv}
              className="w-full justify-center gap-2 border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all font-semibold text-[13px] h-10 rounded-xl"
            >
              <Download className="w-4 h-4" />
              {t("report.rail.downloadCv")}
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
