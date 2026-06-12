import { useTranslation } from "react-i18next";
import { BarChart3, TrendingUp, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSkillGapQuery } from "@/hooks/use-diagnosis";

/* Moat L2 — kỹ năng thị trường đang cần mà CV thiếu (GET /api/trends/skills/gap/:cvId).
   Dùng data.gap (BE đã sort theo demand). §0b: thanh demand primary, số mono, no gradient. */
const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

export function SkillGapTrends({ cvId }: { cvId: string | null }) {
  const { t } = useTranslation("diagnosis");
  const { data, isLoading, isError, refetch, isRefetching } = useSkillGapQuery(cvId, { limit: 8 });

  if (!cvId) return null;
  const gap = data?.gap ?? [];

  return (
    <section className="mt-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-[#2F3437]">{t("trends.title")}</h3>
      </div>
      <p className="text-xs text-[#787774] mb-3">{t("trends.subtitle")}</p>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-8 bg-[#F1F1EF] rounded-lg" />)}
        </div>
      ) : isError ? (
        <div className={cn(CARD, "flex flex-wrap items-center gap-x-3 gap-y-2 p-4")}>
          <AlertCircle className="w-4 h-4 shrink-0 text-[#9F2F2D]" />
          <p className="min-w-0 flex-1 text-[13px] text-[#787774]">{t("trends.error")}</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
            {t("trends.retry")}
          </button>
        </div>
      ) : gap.length === 0 ? (
        <div className={cn(CARD, "p-5 flex items-center gap-3")}>
          <CheckCircle2 className="w-5 h-5 text-[#346538] shrink-0" />
          <p className="text-[13px] text-[#787774]">{t("trends.empty")}</p>
        </div>
      ) : (
        <div className={cn(CARD, "p-4 divide-y divide-[#F1F1EF]")}>
          {gap.map((row) => (
            <div key={row.canonical_name} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <span className="text-[13px] text-[#2F3437] font-medium w-32 sm:w-40 shrink-0 truncate">
                {row.display_name}
              </span>
              <div className="flex-1 h-1.5 bg-[#F1F1EF] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round(row.pct_of_postings))}%` }}
                />
              </div>
              <span className="font-mono tabular-nums text-[11px] text-[#787774] w-9 text-right shrink-0">
                {Math.round(row.pct_of_postings)}%
              </span>
              {typeof row.trend_delta === "number" && row.trend_delta > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#346538] shrink-0 w-12">
                  <TrendingUp className="w-3 h-3" />{t("trends.hot")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
