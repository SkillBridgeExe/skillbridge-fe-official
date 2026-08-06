import { Lightbulb, Sparkles, TrendingUp, AlertCircle, AlertTriangle, RefreshCw, Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTrendsInsightQuery } from "@/hooks/use-diagnosis";
import { Chapter, SectionRule } from "./editorial";

const CARD = "bg-white border border-slate-200 rounded-xl shadow-sm";

const CONFIDENCE_CLASS: Record<"high" | "medium" | "low", string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-500 border-slate-200",
};

function InsightSkeleton() {
  return (
    <div className={cn(CARD, "p-4 space-y-3")}>
      <div className="h-4 w-40 rounded bg-slate-100" />
      <div className="h-3 w-full rounded bg-slate-100" />
      <div className="h-3 w-5/6 rounded bg-slate-100" />
      <div className="flex gap-2">
        <div className="h-7 w-24 rounded-lg bg-slate-100" />
        <div className="h-7 w-28 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

export function AiTrendsInsight({
  cvId,
  role,
}: {
  cvId: string | null;
  role?: string | null;
}) {
  const { t } = useTranslation("diagnosis");
  const { data, isLoading, isError, refetch, isRefetching } = useTrendsInsightQuery(cvId, role);

  if (!cvId) return null;

  // BE contract: insights carry display_name + comment (prose) with numbers
  // re-attached from FACTS server-side. Guard against empty prose only.
  const insights = (data?.insights ?? []).filter(
    (item) => item.display_name?.trim() || item.comment?.trim(),
  );
  const recommendedSkills = (data?.recommended_skills ?? []).filter(
    (skill) => (skill.display_name || skill.skill)?.trim(),
  );
  const skillPairs = (data?.skill_pairs ?? []).filter(
    (pair) => pair.a_display?.trim() && pair.b_display?.trim(),
  );

  if (isLoading) {
    return (
      <>
        <SectionRule className="my-6" />
        <Chapter kicker="02" title="">
          <section className="mt-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-slate-900">{t("aiInsight.title")}</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">{t("aiInsight.disclaimer")}</p>
            <InsightSkeleton />
          </section>
        </Chapter>
      </>
    );
  }

  // Honesty (PR#49): an ERROR must stay visible with a retry — silently hiding the section would
  // swallow the failure. Only a clean "no data" (success, nothing to show) hides the chapter.
  if (isError) {
    return (
      <>
        <SectionRule className="my-6" />
        <Chapter kicker="02" title="">
          <section className="mt-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-slate-900">{t("aiInsight.title")}</h3>
            </div>
            <div className={cn(CARD, "flex flex-wrap items-center gap-x-3 gap-y-2 p-5")}>
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
              <p className="min-w-0 flex-1 text-[13px] text-slate-500">{t("aiInsight.error")}</p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-primary hover:underline disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
                {t("aiInsight.retry")}
              </button>
            </div>
          </section>
        </Chapter>
      </>
    );
  }

  const hasNoContent =
    !data || (insights.length === 0 && recommendedSkills.length === 0 && skillPairs.length === 0);
  if (hasNoContent) {
    return null;
  }

  return (
    <>
      <SectionRule className="my-6" />
      <Chapter kicker="02" title="">
        <section className="mt-6 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-slate-900">{t("aiInsight.title")}</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">{t("aiInsight.disclaimer")}</p>

          <div className={cn(CARD, "p-5 space-y-4")}>
            {/* Honest signals: real sample size + reliability band of the pool behind the numbers */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {typeof data.sample_size === "number" && data.sample_size > 0 && (
                <span className="font-mono tabular-nums text-slate-500">
                  {t("aiInsight.sampleSize", { count: data.sample_size })}
                </span>
              )}
              {data.data_confidence && (
                <span className={cn("rounded border px-1.5 py-0.5 font-bold", CONFIDENCE_CLASS[data.data_confidence])}>
                  {t(`aiInsight.confidence.${data.data_confidence}`)}
                </span>
              )}
            </div>
            {data.stale && (
              <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("aiInsight.stale")}
              </p>
            )}

            {data.summary && (
              <p className="text-[13px] leading-relaxed font-medium text-slate-900">{data.summary}</p>
            )}

            {insights.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.slice(0, 4).map((item, index) => (
                  <div key={`${item.skill}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        {item.display_name?.trim() && (
                          <h4 className="text-[13px] font-bold text-slate-900">{item.display_name}</h4>
                        )}
                        {item.comment?.trim() && (
                          <p className="text-xs text-slate-500 leading-relaxed mt-1">{item.comment}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {typeof item.pct_of_postings === "number" && item.pct_of_postings > 0 && (
                            <span className="font-mono tabular-nums text-[10px] font-bold text-slate-500">
                              {t("aiInsight.pctOfPostings", { pct: item.pct_of_postings })}
                            </span>
                          )}
                          {typeof item.trend_delta === "number" && item.trend_delta > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                              <TrendingUp className="w-3 h-3" />
                              {t("aiInsight.trendUp")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {skillPairs.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {t("aiInsight.pairsTitle")}
                </p>
                <div className="space-y-2">
                  {skillPairs.slice(0, 3).map((pair, index) => (
                    <div key={`${pair.a}-${pair.b}-${index}`} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">
                          {pair.a_display} + {pair.b_display}
                          {typeof pair.pct_of_postings === "number" && pair.pct_of_postings > 0 && (
                            <span className="ml-2 font-mono tabular-nums text-[10px] font-medium text-slate-500">
                              {t("aiInsight.pctOfPostings", { pct: pair.pct_of_postings })}
                            </span>
                          )}
                        </p>
                        {pair.comment?.trim() && (
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{pair.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recommendedSkills.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {t("aiInsight.recommendedTitle")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendedSkills.slice(0, 8).map((skill, index) => (
                    <span
                      key={`${skill.skill || skill.display_name}-${index}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                    >
                      {skill.display_name || skill.skill}
                      {typeof skill.pct_of_postings === "number" && skill.pct_of_postings > 0 && (
                        <span className="font-mono tabular-nums text-[10px] opacity-80">
                          {skill.pct_of_postings}%
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </Chapter>
    </>
  );
}
