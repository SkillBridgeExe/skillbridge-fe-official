import { Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTrendsInsightQuery } from "@/hooks/use-diagnosis";
import type { TrendsInsightItem } from "@shared/api";

const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

function InsightSkeleton() {
  return (
    <div className={cn(CARD, "p-4 space-y-3")}>
      <div className="h-4 w-40 rounded bg-[#F1F1EF]" />
      <div className="h-3 w-full rounded bg-[#F1F1EF]" />
      <div className="h-3 w-5/6 rounded bg-[#F1F1EF]" />
      <div className="flex gap-2">
        <div className="h-7 w-24 rounded-lg bg-[#F1F1EF]" />
        <div className="h-7 w-28 rounded-lg bg-[#F1F1EF]" />
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
  const { data, isLoading, isError } = useTrendsInsightQuery(cvId, role);

  if (!cvId || isError) return null;

  const insights = ((data?.insights ?? []) as Array<TrendsInsightItem | string>)
    .map((item) => (typeof item === "string" ? { title: item, detail: "" } : item))
    .filter((item) => item.title?.trim() || item.detail?.trim());
  const recommendedSkills = data?.recommended_skills ?? [];

  return (
    <section className="mt-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-[#2F3437]">{t("aiInsight.title")}</h3>
      </div>
      <p className="text-xs text-[#787774] mb-3">{t("aiInsight.disclaimer")}</p>

      {isLoading ? (
        <InsightSkeleton />
      ) : !data ? (
        <div className={cn(CARD, "p-5 text-[13px] text-[#787774]")}>{t("aiInsight.missing")}</div>
      ) : (
        <div className={cn(CARD, "p-5 space-y-4")}>
          {data.summary && (
            <p className="text-[13px] leading-relaxed font-medium text-[#2F3437]">{data.summary}</p>
          )}

          {insights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.slice(0, 4).map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                      {item.title?.trim() && (
                        <h4 className="text-[13px] font-bold text-[#2F3437]">{item.title}</h4>
                      )}
                      {item.detail?.trim() && (
                        <p className="text-xs text-[#787774] leading-relaxed mt-1">{item.detail}</p>
                      )}
                      {typeof item.trend_delta === "number" && item.trend_delta > 0 && (
                        <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-[#346538]">
                          <TrendingUp className="w-3 h-3" />
                          {t("aiInsight.trendUp")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recommendedSkills.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#787774] mb-2">
                {t("aiInsight.recommendedTitle")}
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendedSkills.slice(0, 8).map((skill) => (
                  <span
                    key={skill.canonical_name}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#DCE9D7] bg-[#EDF3EC] px-2.5 py-1 text-xs font-semibold text-[#346538]"
                  >
                    {skill.display_name}
                    {typeof skill.trend_delta === "number" && skill.trend_delta > 0 && (
                      <TrendingUp className="w-3 h-3" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
