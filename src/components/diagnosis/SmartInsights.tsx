import { useTranslation } from "react-i18next";
import { TrendingUp, MapPin, Briefcase } from "lucide-react";

interface SmartInsightsProps {
  facets: {
    city_codes: Array<{ value: string; count: number }>;
    work_modes: Array<{ value: string; count: number }>;
    employment_types: Array<{ value: string; count: number }>;
    experience_levels: Array<{ value: string; count: number }>;
    fit: Array<{ value: string; count: number }>;
  };
  total: number;
}

export function SmartInsights({ facets, total }: SmartInsightsProps) {
  const { t } = useTranslation("diagnosis");

  // Determine top insight
  const topCity = facets.city_codes?.length > 0 ? facets.city_codes[0] : null;
  const matchFit = facets.fit?.find((f) => f.value === "safe_apply");

  return (
    <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-100/50 rounded-2xl p-4 mb-2 shadow-[0_1px_3px_rgba(37,99,235,0.03)]">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              {t("insights.marketOverview", { defaultValue: "Thị trường Việc làm" })}
            </h4>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {t("insights.totalMatching", { total, defaultValue: "Có {{total}} cơ hội phù hợp với kỹ năng của bạn" })}
            </p>
          </div>
        </div>

        {/* Bento-style mini stats */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {topCity && (
            <div className="flex-1 sm:flex-none bg-white rounded-lg border border-slate-200/60 px-3 py-2 flex items-center gap-2 shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("insights.topLocation", { defaultValue: "Địa điểm" })}</div>
                <div className="text-xs font-bold text-slate-700">{topCity.value} <span className="font-mono text-slate-400 font-medium">({topCity.count})</span></div>
              </div>
            </div>
          )}
          {matchFit && matchFit.count > 0 && (
            <div className="flex-1 sm:flex-none bg-white rounded-lg border border-slate-200/60 px-3 py-2 flex items-center gap-2 shadow-sm">
              <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("insights.safeApply", { defaultValue: "Khả thi cao" })}</div>
                <div className="text-xs font-bold text-emerald-700">{matchFit.count} <span className="text-slate-500 font-medium">{t("insights.jobs", { defaultValue: "việc" })}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
