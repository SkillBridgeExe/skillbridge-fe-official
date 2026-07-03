import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, Loader2, Target } from "lucide-react";
import { useGapReportQuery } from "@/hooks/use-diagnosis";
import type { GapItem } from "@shared/api";

interface DiagnosisIssueTrackerProps {
  matchId: string;
  onInspectIssue: (issue: GapItem) => void;
}

export function DiagnosisIssueTracker({ matchId, onInspectIssue }: DiagnosisIssueTrackerProps) {
  const { t, i18n } = useTranslation("diagnosis");
  const lang: "vi" | "en" = i18n.language?.startsWith("vi") ? "vi" : "en";
  
  const { data, isLoading, isError } = useGapReportQuery(matchId, lang);

  const issues = useMemo(() => {
    if (!data?.gap_items) return [];
    return [...data.gap_items]
      .filter((g) => g.cv_status !== "matched")
      .sort((a, b) => b.severity - a.severity);
  }, [data?.gap_items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#787774]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> {t("gapReport.loading")}
      </div>
    );
  }

  if (isError || !data) {
    return <div className="py-6 text-center text-[#9F2F2D]">{t("gapReport.error")}</div>;
  }

  if (issues.length === 0) {
    return (
      <div className="py-12 text-center border rounded-xl border-[#EAEAEA] bg-white">
        <CheckCircle2 className="w-10 h-10 text-[#346538] mx-auto mb-3" />
        <h3 className="text-sm font-bold text-[#2F3437]">{t("results.gapEmpty", { defaultValue: "Tuyệt vời, không tìm thấy lỗi nào đáng kể!" })}</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-[#2F3437] flex items-center gap-2">
            <Target className="w-5 h-5 text-ink-accent" />
            {t("results.whatToFixNext", { defaultValue: "What to fix next" })}
          </h3>
          <p className="text-xs text-[#787774] mt-1">
            {t("results.issueTrackerDesc", { defaultValue: "Click on any issue to see details and AI recommendations." })}
          </p>
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#787774] bg-[#FBFBFA] px-3 py-1.5 rounded-lg border border-[#EAEAEA]">
          {issues.length} {t("results.issuesCount", { defaultValue: "Issues Found" })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EAEAEA] shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:flex items-center gap-4 p-4 border-b border-[#F1F1EF] text-[11px] font-bold uppercase tracking-wider text-[#787774] bg-[#FBFBFA]">
          <div className="w-3 shrink-0" />
          <div className="flex-1">{t("results.thIssue", { defaultValue: "Issue" })}</div>
          <div className="w-32 shrink-0">{t("results.thAction", { defaultValue: "Action" })}</div>
          <div className="w-24 shrink-0 text-right">{t("results.thSeverity", { defaultValue: "Severity" })}</div>
        </div>

        {/* Issue Rows */}
        <div className="divide-y divide-[#F1F1EF]">
          {issues.map((issue, i) => {
            const isTopPriority = i === 0;
            const severityColor = 
              issue.severity >= 0.66 ? "bg-[#9F2F2D]" : 
              issue.severity >= 0.33 ? "bg-[#956400]" : 
              "bg-[#787774]";
            
            const severityLabel = 
              issue.severity >= 0.66 ? t("gapReport.severity.high") : 
              issue.severity >= 0.33 ? t("gapReport.severity.med") : 
              t("gapReport.severity.low");

            const statusStyle = {
              partial: "text-[#956400] bg-[#FBF3DB]",
              unproven: "text-[#956400] bg-[#FBF3DB]",
              missing: "text-[#9F2F2D] bg-[#FDEBEC]",
              overclaimed: "text-[#9F2F2D] bg-[#FDEBEC]",
            }[issue.cv_status] || "text-[#787774] bg-[#F1F1EF]";

            return (
              <div
                key={issue.requirement_id || issue.canonical_name}
                onClick={() => onInspectIssue(issue)}
                className="group flex flex-col md:flex-row md:items-center gap-4 p-4 hover:bg-[#FBFBFA] cursor-pointer transition-colors"
              >
                {/* Severity Dot Indicator */}
                <div className="hidden md:flex w-3 shrink-0 items-center justify-center">
                  <div className={cn("w-2 h-2 rounded-full shadow-sm", severityColor)} />
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-bold text-[#2F3437] truncate group-hover:text-ink-accent transition-colors">
                      {issue.display_name}
                    </span>
                    {isTopPriority && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-ink-accent text-white shadow-sm">
                        Top Priority
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#787774] leading-relaxed line-clamp-1">
                    {issue.recommended_next_action}
                  </p>
                </div>

                {/* Status / Fixability Action */}
                <div className="w-auto md:w-32 shrink-0 flex items-center">
                  <span className={cn("px-2 py-0.5 rounded border text-[11px] font-bold border-transparent", statusStyle)}>
                    {t(`gapReport.fix.${issue.fixability}`, { defaultValue: issue.fixability })}
                  </span>
                </div>

                {/* Severity Label (Mobile uses label, Desktop aligned right) */}
                <div className="hidden md:flex w-24 shrink-0 justify-end items-center text-[11px] font-bold text-[#787774]">
                  {severityLabel}
                  <ChevronRight className="w-4 h-4 ml-2 text-[#EAEAEA] group-hover:text-ink-accent transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
