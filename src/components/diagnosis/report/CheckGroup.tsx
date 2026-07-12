import { ReactNode } from "react";
import { Check, AlertTriangle, X, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { CheckGroupData, CheckRowData } from "@/lib/diagnosis-report";

const PASTEL = {
  green: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]",
  yellow: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
  red: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]",
  gray: "bg-slate-50 text-slate-500 border-slate-200",
} as const;

const SEVERITY_PASTEL = { high: PASTEL.red, medium: PASTEL.yellow, low: PASTEL.gray } as const;

export function CheckRow({ item }: { item: CheckRowData }) {
  const { t } = useTranslation("diagnosis");
  const isPass = item.status === "pass";
  const isWarn = item.status === "warn";
  
  const colorClass = isPass
    ? PASTEL.green
    : isWarn
    ? PASTEL.yellow
    : PASTEL.red;

  const Icon = isPass ? Check : isWarn ? AlertTriangle : X;

  return (
    <div
      id={item.anchorId}
      className="flex items-start gap-4 p-4 border border-[#EAEAEA] rounded-xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.02)] transition-all hover:border-slate-300 scroll-mt-24"
    >
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center border shrink-0", colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <span className="font-bold text-sm text-[#2F3437]">{item.label}</span>
          {item.score !== undefined && (
            <span className="font-mono text-xs text-[#787774] font-bold">
              {item.score}/20
            </span>
          )}
        </div>

        <p className="text-xs text-[#5F666B] leading-relaxed">
          {item.evidence}
        </p>

        {item.provenance && (
          <p className="text-[10px] text-slate-400 font-medium">
            {t(`provenance.source.${item.provenance.source}`)} · {t(`provenance.conf.${item.provenance.confidence}`)}
          </p>
        )}

        {!isPass && item.hint && (
          <div className="flex items-start gap-1.5 text-xs font-semibold text-indigo-600 pt-1">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-600" />
            <span className="text-indigo-600">{item.hint}</span>
          </div>
        )}

        {/* BE issues[] attached to this row (restores DimensionCard's issue list) */}
        {item.subItems && item.subItems.length > 0 && (
          <ul className="space-y-1.5 pt-2">
            {item.subItems.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-[#FBFBFA] px-3 py-2 text-[13px] text-[#2F3437]">
                <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0", SEVERITY_PASTEL[issue.severity])}>
                  {t(`review.severity.${issue.severity}`)}
                </span>
                <div className="min-w-0">
                  <p className="font-medium leading-relaxed">{issue.detail}</p>
                  {issue.suggestion && (
                    <p className="mt-0.5 text-xs leading-relaxed text-[#787774]">
                      <span className="font-bold text-[#2F3437]">{t("review.suggestionLabel")} </span>{issue.suggestion}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface CheckGroupProps {
  group: CheckGroupData;
  children?: ReactNode;
}

export function CheckGroup({ group, children }: CheckGroupProps) {
  return (
    <section id={`group-${group.id}`} className="space-y-4 scroll-mt-24">
      <div className="flex items-baseline justify-between border-b border-[#EAEAEA] pb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#787774]">
          {group.label}
        </h2>
        {group.score !== undefined && (
          <span className="font-mono text-xs font-bold text-[#2F3437]">
            {group.score}/100
          </span>
        )}
      </div>
      
      {group.items && group.items.length > 0 && (
        <div className="grid gap-3">
          {group.items.map((item) => (
            <CheckRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {children}
    </section>
  );
}
