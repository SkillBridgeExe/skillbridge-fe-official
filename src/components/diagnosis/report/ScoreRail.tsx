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
import { diagnosisScoreStatus } from "@/lib/diagnosis-score-status";

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
      <div
        data-testid="score-rail-mobile"
        className="lg:hidden sticky top-0 bg-white/95 backdrop-blur z-20 py-2 border-b border-slate-200 overflow-x-auto flex items-center gap-2 -mx-4 px-4 scrollbar-none"
      >
        {/* Score chip — the only score display below lg now that the hero is gone */}
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shrink-0", bandChip)}>
          <span className="font-mono text-sm font-black tabular-nums">{overallScore}</span>/100 · {bandLabel}
        </span>
        {isMatch && matchStats && (
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-slate-900">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" />
              {matchStats.matched}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700">
              <AlertTriangle className="w-3 h-3" />
              {matchStats.partial}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-700">
              <XCircle className="w-3 h-3" />
              {matchStats.missing}
            </span>
          </div>
        )}
        {!isMatch && groups.map((group) => {
          const status = diagnosisScoreStatus(group.score);
          const passed = group.issueCount === 0 && (status === "pass" || status === "unknown");
          return (
            <button
              key={group.id}
              onClick={() => scrollToGroup(group.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-all hover:bg-slate-50 shrink-0 active:scale-[0.98]"
            >
              <span>{group.label}</span>
              {group.issueCount > 0 ? (
                <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-1.5 text-[10px] font-bold tabular-nums">
                  {group.issueCount}
                </span>
              ) : passed ? (
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200">
                  <Check className="w-2.5 h-2.5 text-emerald-700" />
                </span>
              ) : status === "warn" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop (>=lg): report sidebar contents mapped directly inside parent aside container */}
      <div
        data-testid="score-rail-desktop"
        className="hidden lg:flex min-h-0 flex-col h-full w-full overflow-y-auto overscroll-contain"
      >
        {/* Donut */}
        <div className="flex flex-col items-center mb-5 shrink-0">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            {isMatch
              ? t("review.matchScoreTitle", { defaultValue: "Điểm khớp CV–JD" })
              : t("report.rail.scoreTitle", { defaultValue: "Điểm tương thích" })}
          </h3>
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
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
              <span className="font-mono text-5xl font-black tracking-tight text-slate-900 tabular-nums">{overallScore}</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase mt-1">/ 100</span>
            </div>
          </div>
          <span className={cn("mt-3 rounded-full px-3 py-1 text-[11px] font-bold border uppercase tracking-wide", bandChip)}>
            {bandLabel}
          </span>
          {verdictMessage && (
            <p className="mt-2.5 text-[13px] leading-relaxed text-slate-600 text-center">
              {verdictMessage}
            </p>
          )}
          {actions && <div className="mt-4 w-full">{actions}</div>}
        </div>

        {/* ── MODE: match → stats + fit badge (no review bars) ── */}
        {isMatch && (
          <div className="border-t border-slate-200 py-4 space-y-3 w-full">
            {/* Match skill stats: matched / partial / missing */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span className="text-xs font-semibold text-emerald-700">{t("results.matched", { defaultValue: "Khớp" })}</span>
                <span className="ml-auto font-mono text-xs font-bold text-slate-900 tabular-nums">{matchStats.matched}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-xs font-semibold text-amber-700">{t("results.partial", { defaultValue: "Một phần" })}</span>
                <span className="ml-auto font-mono text-xs font-bold text-slate-900 tabular-nums">{matchStats.partial}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-rose-700" />
                <span className="text-xs font-semibold text-rose-700">{t("results.missing", { defaultValue: "Thiếu" })}</span>
                <span className="ml-auto font-mono text-xs font-bold text-slate-900 tabular-nums">{matchStats.missing}</span>
              </div>
            </div>

            {/* Coverage percent */}
            {matchStats.coveragePercent !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {t("report.rail.matchCoverage", { defaultValue: "Độ phủ yêu cầu" })}
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
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
                  className="w-full flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-left transition-colors hover:bg-amber-100"
                  aria-expanded={unnormalizedExpanded}
                >
                  <Info className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
                  <span className="text-[11px] leading-relaxed text-amber-700">
                    {t("report.rail.unnormalizedChip", {
                      scored: scoredCount,
                      total: totalWithUnnormalized,
                      unscored: unnormalized.length,
                      defaultValue: `Chấm trên ${scoredCount}/${totalWithUnnormalized} yêu cầu đọc được — ${unnormalized.length} yêu cầu ngoài phạm vi chưa đánh giá được`,
                    })}
                  </span>
                </button>
                {unnormalizedExpanded && (
                  <ul className="mt-1.5 ml-5 space-y-0.5 list-disc text-[10px] text-amber-700">
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
          <nav className="border-t border-slate-200 divide-y divide-slate-100 w-full flex-1">
            {groups.map((group) => {
              const score = getCategoryScore(group.id);
              const status = diagnosisScoreStatus(score ?? group.score);
              const hasIssues = group.issueCount > 0;
              const passed = !hasIssues && (status === "pass" || status === "unknown");

              return (
                <button
                  key={group.id}
                  onClick={() => scrollToGroup(group.id)}
                  className="w-full text-left py-3.5 lg:py-5 hover:bg-slate-50/60 transition-colors group focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink-accent/40 flex flex-col"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="text-[13px] font-bold text-slate-900 group-hover:text-ink-accent truncate">
                      {group.label}
                    </span>
                    {hasIssues ? (
                      <span className="text-[12px] font-bold text-sky-500 whitespace-nowrap tabular-nums hover:underline">
                        {t("report.rail.issuesBadge", { count: group.issueCount, defaultValue: `${group.issueCount} lỗi` })}
                      </span>
                    ) : passed ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200 shrink-0">
                        <Check className="w-2.5 h-2.5 text-emerald-700" />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-[11px] font-bold whitespace-nowrap",
                          status === "warn" ? "text-amber-700" : "text-rose-700",
                        )}
                      >
                        {t(status === "warn" ? "report.rail.needsImprovement" : "report.rail.notMet")}
                      </span>
                    )}
                  </div>
                  {score !== undefined && (
                    <div className="mt-2 w-full h-3 bg-slate-200 rounded-full overflow-hidden">
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
        <div className="border-t border-slate-200" />

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
