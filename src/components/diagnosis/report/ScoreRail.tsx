import { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { CheckGroupData } from "@/lib/diagnosis-report";
import type { CvScoreBreakdown } from "@shared/api";

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
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const scrollToGroup = (groupId: string) => {
  const element = document.getElementById(`group-${groupId}`);
  if (!element) return;

  const behavior = prefersReduced() ? "auto" : "smooth";
  const offset = 96; // sticky header offset
  const bodyRect = document.body.getBoundingClientRect().top;
  const elementRect = element.getBoundingClientRect().top;
  const offsetPosition = elementRect - bodyRect - offset;

  window.scrollTo({ top: offsetPosition, behavior });
};

/** Same 3-band thresholds as dimensionTone/element-issues.ts (70/50). */
const bandOf = (score: number) =>
  score >= 70
    ? { key: "review.band.strong", chip: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]", stroke: "#346538", bar: "bg-[#346538]" }
    : score >= 50
      ? { key: "review.band.watch", chip: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]", stroke: "#956400", bar: "bg-[#956400]" }
      : { key: "review.band.priority", chip: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]", stroke: "#9F2F2D", bar: "bg-[#9F2F2D]" };

export function ScoreRail({ overallScore, groups, breakdown, verdictMessage, actions }: ScoreRailProps) {
  const { t } = useTranslation("diagnosis");
  const band = bandOf(overallScore);

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
    <aside className="w-full">
      {/* Below xl: horizontal scrollable chip bar (at xl the sidebar gets its own grid column) */}
      <div className="xl:hidden sticky top-14 bg-white/95 backdrop-blur z-20 py-2 border-b border-[#EAEAEA] overflow-x-auto flex items-center gap-2 -mx-4 px-4 scrollbar-none">
        {/* Score chip — the only score display below xl now that the hero is gone */}
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

      {/* Desktop (>=xl): report sidebar */}
      <div className="hidden xl:block sticky top-24 rounded-xl border border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
        {/* Donut */}
        <div className="flex flex-col items-center px-6 pt-6 pb-5">
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
        <nav className="border-t border-[#EAEAEA] divide-y divide-[#F1F1EF]">
          {groups.map((group) => {
            const score = getCategoryScore(group.id);
            const hasIssues = group.issueCount > 0;

            return (
              <button
                key={group.id}
                onClick={() => scrollToGroup(group.id)}
                className="w-full text-left px-5 py-3.5 hover:bg-slate-50/60 transition-colors group focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-[#2F3437] group-hover:text-ink-accent truncate">
                    {group.label}
                  </span>
                  {hasIssues ? (
                    <span className="text-[12px] font-bold text-[#9F2F2D] whitespace-nowrap tabular-nums">
                      {t("report.rail.issuesBadge", { count: group.issueCount })}
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-[#EDF3EC] flex items-center justify-center border border-[#DCE9D7] shrink-0">
                      <Check className="w-2.5 h-2.5 text-[#346538]" />
                    </span>
                  )}
                </div>
                {score !== undefined && (
                  <div className="mt-2 w-full h-1.5 bg-[#F1F1EF] rounded-full overflow-hidden">
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
      </div>
    </aside>
  );
}
