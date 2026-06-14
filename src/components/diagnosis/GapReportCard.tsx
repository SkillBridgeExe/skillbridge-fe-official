import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ClipboardList, TrendingUp, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { useGapReportQuery } from "@/hooks/use-diagnosis";
import type { GapReportDto } from "@shared/api";

/**
 * Báo cáo gap hợp nhất (GET /api/cv-matches/:matchId/gap-report — BE #43/#49).
 * Deterministic phía BE, KHÔNG tốn quota chấm — card tự fetch khi có matchId.
 * Mọi số liệu (jd_count/cv_count/%, posting_count) là số thật từ BE; FE chỉ render.
 */
export function GapReportCard({ matchId }: { matchId: string }) {
  const { t, i18n } = useTranslation("diagnosis");
  const lang: "vi" | "en" = i18n.language?.startsWith("vi") ? "vi" : "en";

  const { data, isLoading, isError } = useGapReportQuery(matchId, lang) as {
    data: GapReportDto | undefined;
    isLoading: boolean;
    isError: boolean;
  };

  if (isLoading) {
    return (
      <Card className="border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <CardContent className="p-6 flex items-center gap-2 text-sm text-[#787774]">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("gapReport.loading")}
        </CardContent>
      </Card>
    );
  }
  if (isError || !data) {
    return (
      <Card className="border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <CardContent className="p-6 text-sm text-[#9F2F2D]">{t("gapReport.error")}</CardContent>
      </Card>
    );
  }

  const market = data.jd_market_position;
  const impliedMissing = market.available
    ? market.implied.filter((s) => !s.covered).slice(0, 5)
    : [];

  return (
    <Card className="border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <ClipboardList className="w-3.5 h-3.5" />
            {t("gapReport.title")}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {data.source_of_requirements === "jd_extraction"
              ? t("gapReport.sourceJd")
              : t("gapReport.sourceRubric")}
          </span>
        </div>

        {/* Recommended actions — việc đáng làm trước, số liệu thật từ BE */}
        {data.recommended_actions.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-[#2F3437] mb-2">{t("gapReport.actions")}</h3>
            <ol className="space-y-2">
              {data.recommended_actions.map((a, i) => (
                <li key={`${a.skill_canonical}-${i}`} className="flex items-start gap-2.5 text-[13px] text-[#2F3437]">
                  <span className="font-mono tabular-nums text-[11px] font-bold text-slate-400 mt-0.5 shrink-0">
                    {i + 1}.
                  </span>
                  <div className="min-w-0">
                    <span className="font-semibold">{a.display_name}</span>
                    <span className="text-[#787774]"> — {a.why}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Gaps: thiếu hẳn (đỏ) + thiếu cấp độ (vàng) */}
        {(data.explicit_gaps.length > 0 || data.proficiency_gaps.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.explicit_gaps.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#9F2F2D] mb-1.5">
                  <X className="w-3.5 h-3.5" /> {t("gapReport.gapsExplicit")}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.explicit_gaps.map((g) => (
                    <span key={g.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]">
                      {g.display_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.proficiency_gaps.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#956400] mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {t("gapReport.gapsProficiency")}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.proficiency_gaps.map((g) => (
                    <span key={g.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]">
                      {g.display_name} (+{g.gap_levels})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strengths */}
        {(data.strengths.matched.length > 0 || data.strengths.bonus.length > 0) && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#346538] mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t("gapReport.strengths")}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {data.strengths.matched.map((s) => (
                <span key={s.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]">
                  {s.display_name}
                </span>
              ))}
              {data.strengths.bonus.map((s) => (
                <span key={s.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-medium bg-[#F7F6F3] text-[#787774] border-[#EAEAEA]">
                  + {s.display_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Thị trường kỳ vọng ngầm (pool thật) — chỉ khi snapshot có */}
        {impliedMissing.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#2F3437] mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> {t("gapReport.marketTitle")}
            </h4>
            <ul className="space-y-1.5">
              {impliedMissing.map((s) => (
                <li key={s.skill_canonical} className="text-[12px] text-[#787774] leading-relaxed">
                  <span className="font-semibold text-[#2F3437]">{s.display_name}</span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-400"> · {s.pct_of_postings}%</span>
                  <span> — {s.why}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className={cn("text-[11px] text-slate-400 border-t border-[#F1F1EF] pt-3")}>
          {t("gapReport.footnote")}
        </p>
      </CardContent>
    </Card>
  );
}
