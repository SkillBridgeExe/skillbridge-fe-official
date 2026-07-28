import { ReactNode, useEffect, useState } from "react";
import { Check, AlertTriangle, X, ArrowRight, ChevronDown, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { CheckGroupData, CheckRowData } from "@/lib/diagnosis-report";
import { diagnosisScoreStatus } from "@/lib/diagnosis-score-status";

const PASTEL = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/5",
  yellow: "bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm shadow-amber-500/5",
  red: "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm shadow-rose-500/5",
  gray: "bg-slate-50 text-slate-600 border-slate-200/60 shadow-sm",
} as const;

const SEVERITY_PASTEL = { high: PASTEL.red, medium: PASTEL.yellow, low: PASTEL.gray } as const;

export function CheckRow({ item, onAsk }: { item: CheckRowData; onAsk?: () => void }) {
  const { t } = useTranslation("diagnosis");
  const isPass = item.status === "pass";
  const isWarn = item.status === "warn";

  const colorClass = isPass ? PASTEL.green : isWarn ? PASTEL.yellow : PASTEL.red;
  const Icon = isPass ? Check : isWarn ? AlertTriangle : X;

  return (
    <div id={item.anchorId} className="flex items-start gap-5 py-5 px-8 scroll-mt-24 hover:bg-slate-50/20 transition-all duration-200">
      <div className={cn("w-7.5 h-7.5 w-[30px] h-[30px] rounded-full flex items-center justify-center border shrink-0 mt-0.5 shadow-sm transition-all duration-200 hover:scale-105", colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between flex-wrap gap-x-3">
          <span className="font-bold text-[16px] text-slate-800 tracking-tight leading-relaxed">{item.label}</span>
          {item.score !== undefined && (
            <span className="font-mono text-xs text-[#787774] font-bold shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">
              {item.score}/20
            </span>
          )}
        </div>

        <p className="text-[14.5px] text-slate-600 leading-relaxed mt-1.5 font-medium">
          {item.evidence}
        </p>

        {item.provenance && (
          <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-relaxed">
            {t(`provenance.source.${item.provenance.source}`)} · {t(`provenance.conf.${item.provenance.confidence}`)}
          </p>
        )}

        {/* Wave 2 entry point — only on rows the companion can actually cite (dim-*). */}
        {onAsk && (
          <button
            type="button"
            onClick={onAsk}
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t("report.askDimension")}
          </button>
        )}

        {!isPass && item.hint && (
          <div className="flex items-start gap-2.5 text-sm font-semibold text-[#00AEEF] bg-[#00AEEF]/5 border border-[#00AEEF]/10 rounded-lg p-3 mt-3 animate-in fade-in slide-in-from-top-1">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{item.hint}</span>
          </div>
        )}

        {/* BE issues[] attached to this row (restores DimensionCard's issue list) */}
        {item.subItems && item.subItems.length > 0 && (
          <ul className="space-y-2 mt-3">
            {item.subItems.map((issue, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl bg-slate-50/60 border border-slate-100/60 px-4 py-3.5 text-sm text-slate-800 hover:bg-slate-50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border shrink-0 mt-0.5 tracking-wider", SEVERITY_PASTEL[issue.severity])}>
                  {t(`review.severity.${issue.severity}`)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-relaxed text-sm text-slate-800">{issue.detail}</p>
                  {issue.suggestion && (
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-500 font-medium">
                      <span className="font-bold text-slate-700">{t("review.suggestionLabel")} </span>{issue.suggestion}
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
  /** Wave 2: "ask the dolphin about this dimension" — wired only onto dim-* rows. */
  onAskDimension?: (item: CheckRowData) => void;
}

export function CheckGroup({ group, children, onAskDimension }: CheckGroupProps) {
  const { t } = useTranslation("diagnosis");
  const scoreStatus = diagnosisScoreStatus(group.score);
  const clean = group.issueCount === 0 && (scoreStatus === "pass" || scoreStatus === "unknown");
  const [open, setOpen] = useState(group.issueCount > 0 || scoreStatus === "fail");

  useEffect(() => {
    const onReveal = (e: Event) => {
      const anchorId = (e as CustomEvent<string>).detail;
      if (group.items?.some((item) => item.anchorId === anchorId)) setOpen(true);
    };
    window.addEventListener("sb-reveal-anchor", onReveal);
    return () => window.removeEventListener("sb-reveal-anchor", onReveal);
  }, [group.items]);

  return (
    <section
      id={`group-${group.id}`}
      className="scroll-mt-24 rounded-xl border border-[#EAEAEA] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-200"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 px-8 py-5 text-left hover:bg-slate-50/40 transition-colors focus-visible:ring-2 focus-visible:ring-ink-accent/40 font-semibold"
      >
        <ChevronDown className={cn("w-4 h-4 text-[#787774] shrink-0 transition-transform duration-300", !open && "-rotate-90")} />
        <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-[#2F3437] flex-1 min-w-0 truncate group-hover:text-primary transition-colors">
          {group.label}
        </h2>
        {clean ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold", PASTEL.green)}>
            <Check className="w-3 h-3 stroke-[3.5]" />
            {t("report.rail.resolved")}
          </span>
        ) : group.issueCount === 0 ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
              scoreStatus === "warn" ? PASTEL.yellow : PASTEL.red,
            )}
          >
            {scoreStatus === "warn" ? (
              <AlertTriangle className="w-3 h-3 stroke-[3]" />
            ) : (
              <X className="w-3 h-3 stroke-[3]" />
            )}
            {t(scoreStatus === "warn" ? "report.rail.needsImprovement" : "report.rail.notMet")}
          </span>
        ) : (
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", PASTEL.red)}>
            {t("report.rail.issuesBadge", { count: group.issueCount })}
          </span>
        )}
        {group.score !== undefined && (
          <span className="font-mono text-xs font-extrabold text-[#787774] shrink-0 bg-slate-100 px-2 py-0.5 rounded-full ml-2">
            {group.score}/100
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-[#F1F1EF] bg-white">
          {group.items && group.items.length > 0 && (
            <div className="divide-y divide-[#F1F1EF]">
              {group.items.map((item) => (
                <CheckRow
                  key={item.id}
                  item={item}
                  // Only AI-dimension rows have a dim-* anchor the companion can cite;
                  // ATS/content rows share this component and must not grow the button.
                  onAsk={
                    onAskDimension && item.anchorId?.startsWith("dim-")
                      ? () => onAskDimension(item)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
          {children && <div className="px-6 py-4 border-t border-[#F1F1EF] bg-slate-50/10">{children}</div>}
        </div>
      )}
    </section>
  );
}
