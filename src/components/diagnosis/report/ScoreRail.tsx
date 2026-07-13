import { ReactNode } from "react";
import { Check, Sparkles, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { CheckGroupData } from "@/lib/diagnosis-report";
import type { CvScoreBreakdown } from "@shared/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { triggerCvDownload } from "@/services/diagnosis.service";

interface ScoreRailProps {
  overallScore: number;
  groups: CheckGroupData[];
  breakdown?: CvScoreBreakdown;
  /** One-line verdict under the donut (the hero is gone in report mode). */
  verdictMessage?: string;
  /** Action buttons under the donut — Jobscan's "Upload & rescan" slot. */
  actions?: ReactNode;
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

/** Same 3-band thresholds as dimensionTone/element-issues.ts (70/50). */
const bandOf = (score: number) =>
  score >= 70
    ? { key: "review.band.strong", chip: "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/5", stroke: "#10B981", bar: "bg-emerald-500" }
    : score >= 50
      ? { key: "review.band.watch", chip: "bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm shadow-amber-500/5", stroke: "#F59E0B", bar: "bg-amber-500" }
      : { key: "review.band.priority", chip: "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm shadow-rose-500/5", stroke: "#EF4444", bar: "bg-rose-500" };

export function ScoreRail({ overallScore, groups, breakdown, verdictMessage, actions }: ScoreRailProps) {
  const { t } = useTranslation("diagnosis");
  const { lastCvId } = useDiagnosisStore();
  const { toast } = useToast();
  const band = bandOf(overallScore);

  const handleAskCompanion = () => {
    const companionStore = useCompanionStore.getState();
    const diagnosisStore = useDiagnosisStore.getState();
    const targetContext = diagnosisStore.step === "results" ? "diagnosis:results" : "diagnosis:review";
    if (companionStore.activeId !== targetContext) {
      companionStore.activateContext(targetContext);
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

  return (
    <aside className="w-full lg:h-full lg:flex lg:flex-col">
      {/* Below lg: horizontal scrollable chip bar (at lg the sidebar gets its own grid column) */}
      <div className="lg:hidden sticky top-14 bg-white/95 backdrop-blur z-20 py-2 border-b border-[#EAEAEA] overflow-x-auto flex items-center gap-2 -mx-4 px-4 scrollbar-none">
        {/* Score chip — the only score display below lg now that the hero is gone */}
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shrink-0", band.chip)}>
          <span className="font-mono text-sm font-black tabular-nums">{overallScore}</span>/100 · {t(band.key)}
        </span>
        {groups.map((group) => (
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
            {t("report.rail.scoreTitle", { defaultValue: "Điểm tương thích" })}
          </h3>
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#F1F1EF" strokeWidth={strokeWidth} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={band.stroke}
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
          <span className={cn("mt-3 rounded-full px-3 py-1 text-[11px] font-bold border uppercase tracking-wide", band.chip)}>
            {t(band.key)}
          </span>
          {verdictMessage && (
            <p className="mt-2.5 text-[13px] leading-relaxed text-[#5F666B] text-center">
              {verdictMessage}
            </p>
          )}
          {actions && <div className="mt-4 w-full">{actions}</div>}
        </div>

        {/* Categories — Jobscan-style rows: label · issues link · thin bar */}
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
