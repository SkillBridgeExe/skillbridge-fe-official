// ─── NextStepsCard ──────────────────────────────────────────────────
// "Bước tiếp theo" ưu tiên từ gap thật — deterministic, KHÔNG LLM.
// Hiển thị ở Chương 4 Diagnosis (sau match).

import { useNextStepsQuery } from "@/hooks/use-diagnosis";
import { useTranslation } from "react-i18next";
import { Target, TrendingUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

function severityColor(severity: number): string {
  if (severity >= 0.7) return "bg-[#9F2F2D]";
  if (severity >= 0.4) return "bg-[#956400]";
  return "bg-[#346538]";
}

function severityBadge(severity: number): string {
  if (severity >= 0.7) return "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]";
  if (severity >= 0.4) return "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]";
  return "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]";
}

export function NextStepsCard({ matchId }: { matchId?: string | null }) {
  const { t, i18n } = useTranslation("diagnosis");
  const lang = (i18n.language.startsWith("vi") ? "vi" : "en") as "vi" | "en";
  const { data, isLoading, isError } = useNextStepsQuery(matchId, lang);

  if (!matchId) return null;

  if (isLoading) {
    return (
      <div className={cn(CARD, "p-6")}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-40 bg-slate-100 animate-pulse rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) return null;

  const steps = data?.steps ?? [];

  return (
    <div className={cn(CARD, "p-6")}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#00AEEF]/5 text-[#00AEEF] flex items-center justify-center shrink-0 border border-[#00AEEF]/10 shadow-sm">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#2F3437] tracking-tight">
            {t("nextSteps.title", { defaultValue: "Bước tiếp theo" })}
          </h4>
          <p className="text-[11px] text-[#787774]">
            {t("nextSteps.subtitle", { defaultValue: "Ưu tiên theo gap thật của bạn" })}
          </p>
        </div>
      </div>

      {/* Steps list */}
      {steps.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-[#346538] bg-[#EDF3EC] rounded-lg px-4 py-3 border border-[#DCE9D7]">
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            {t("nextSteps.empty", { defaultValue: "CV đã đủ mạnh cho vị trí này!" })}
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={`${step.canonical}-${step.rank}`}
              className="flex items-start gap-3 p-3 rounded-lg bg-[#FBFBFA] border border-[#EAEAEA]/60 hover:border-[#EAEAEA] transition-colors animate-in fade-in duration-300"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
            >
              {/* Rank badge */}
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#787774]">{step.rank}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-[#2F3437]">{step.skill}</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                      severityBadge(step.severity),
                    )}
                  >
                    {step.status === "missing" ? t("results.missing") : step.status}
                  </span>
                </div>
                <p className="text-xs text-[#787774] leading-relaxed">{step.action}</p>
              </div>

              {/* Severity bar */}
              <div className="w-1 h-10 rounded-full bg-[#F1F1EF] overflow-hidden shrink-0 mt-0.5">
                <div
                  className={cn("w-full rounded-full transition-all duration-500", severityColor(step.severity))}
                  style={{ height: `${Math.round(step.severity * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA hint */}
      {steps.length > 0 && (
        <p className="mt-4 text-[11px] text-[#787774] flex items-center gap-1">
          <ArrowRight className="w-3 h-3" />
          {t("nextSteps.hint", { defaultValue: "Bổ sung kỹ năng này vào CV kèm ví dụ cụ thể." })}
        </p>
      )}
    </div>
  );
}
