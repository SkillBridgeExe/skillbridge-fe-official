import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { CheckGroupData } from "@/lib/diagnosis-report";
import type { CvScoreBreakdown } from "@shared/api";

interface ScoreRailProps {
  overallScore: number;
  groups: CheckGroupData[];
  breakdown?: CvScoreBreakdown;
  activeGroupId?: string;
}

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const scrollToGroup = (groupId: string) => {
  const element = document.getElementById(`group-${groupId}`);
  if (!element) return;
  
  const behavior = prefersReduced() ? "auto" : "smooth";
  
  // Custom scroll options respecting smooth scrolling and top offset
  const offset = 96; // sticky header offset
  const bodyRect = document.body.getBoundingClientRect().top;
  const elementRect = element.getBoundingClientRect().top;
  const elementPosition = elementRect - bodyRect;
  const offsetPosition = elementPosition - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior
  });
};

export function ScoreRail({ overallScore, groups, breakdown }: ScoreRailProps) {
  const { t } = useTranslation("diagnosis");

  // Determine band label and color style based on overallScore
  const band = overallScore >= 70
    ? { key: "review.band.strong", color: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]", stroke: "#346538" }
    : overallScore >= 50
      ? { key: "review.band.watch", color: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]", stroke: "#956400" }
      : { key: "review.band.priority", color: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]", stroke: "#9F2F2D" };

  // SVG parameters for full circle donut
  const size = 110;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  // Map category to breakdown scores
  const getCategoryScore = (groupId: string): number | undefined => {
    if (!breakdown) return undefined;
    switch (groupId) {
      case "ats":
        return breakdown.ats;
      case "content":
        return breakdown.structure;
      case "skills":
        return breakdown.skills;
      case "ai_eval":
        return breakdown.experience;
      default:
        return undefined;
    }
  };

  return (
    <aside className="w-full">
      {/* Mobile view (<md): horizontal scrollable chip bar */}
      <div className="md:hidden sticky top-14 bg-white/95 backdrop-blur z-20 py-2 border-b border-[#EAEAEA] overflow-x-auto flex items-center gap-2 -mx-4 px-4 scrollbar-none">
        {groups.map((group) => {
          const score = getCategoryScore(group.id);
          const hasIssues = group.issueCount > 0;

          return (
            <button
              key={group.id}
              onClick={() => scrollToGroup(group.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-semibold text-[#2F3437] transition-all hover:bg-slate-50 shrink-0",
                "active:scale-[0.98]"
              )}
            >
              <span>{group.label}</span>
              {score !== undefined && (
                <span className="font-mono opacity-60">({score})</span>
              )}
              {hasIssues ? (
                <span className="rounded-full bg-[#FDEBEC] text-[#9F2F2D] border border-[#F6D4D5] px-1 text-[9px] font-bold">
                  {group.issueCount}
                </span>
              ) : (
                <span className="w-3.5 h-3.5 rounded-full bg-[#EDF3EC] flex items-center justify-center border border-[#DCE9D7]">
                  <Check className="w-2.5 h-2.5 text-[#346538]" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop view (>=md): vertical rail sidebar */}
      <div className="hidden md:flex flex-col gap-6 sticky top-24 max-w-[200px]">
        {/* Donut Score & Band Label */}
        <div className="flex flex-col items-center p-4 border border-[#EAEAEA] bg-white rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.02)]">
          <div className="relative w-[110px] h-[110px] flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {/* Background Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#F1F1EF"
                strokeWidth={strokeWidth}
              />
              {/* Foreground progress */}
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
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center leading-none">
              <span className="font-mono text-2xl font-black text-[#2F3437]">{overallScore}</span>
              <span className="text-[10px] font-bold text-[#A1A1A1] uppercase mt-0.5">/ 100</span>
            </div>
          </div>
          <span className={cn("mt-3 rounded px-2 py-0.5 text-[10px] font-bold border text-center uppercase tracking-wide", band.color)}>
            {t(band.key)}
          </span>
        </div>

        {/* Categories checklist */}
        <div className="flex flex-col gap-1.5">
          {groups.map((group) => {
            const score = getCategoryScore(group.id);
            const hasIssues = group.issueCount > 0;
            const barColor = score !== undefined && score >= 70
              ? "bg-[#346538]"
              : score !== undefined && score >= 50
                ? "bg-[#956400]"
                : "bg-[#9F2F2D]";

            return (
              <button
                key={group.id}
                onClick={() => scrollToGroup(group.id)}
                className="w-full text-left p-3 rounded-lg border border-transparent hover:border-[#EAEAEA] hover:bg-slate-50 transition-all group flex flex-col gap-2"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-[#2F3437] group-hover:text-ink-accent truncate pr-2">
                    {group.label}
                  </span>
                  
                  {hasIssues ? (
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-[#FDEBEC] text-[#9F2F2D] border border-[#F6D4D5] whitespace-nowrap">
                      {t("report.rail.issuesBadge", { count: group.issueCount, defaultValue: `${group.issueCount} cần sửa` })}
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-[#EDF3EC] flex items-center justify-center border border-[#DCE9D7] shrink-0">
                      <Check className="w-2.5 h-2.5 text-[#346538]" />
                    </span>
                  )}
                </div>

                {score !== undefined && (
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold leading-none">
                      <span>{t("review.scoreLabel")}</span>
                      <span>{score}%</span>
                    </div>
                    <div className="w-full h-1 bg-[#F1F1EF] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
