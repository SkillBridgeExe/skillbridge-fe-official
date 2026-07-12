import { ReactNode, useEffect, useState } from "react";
import { Check, AlertTriangle, X, ArrowRight, ChevronDown } from "lucide-react";
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

  const colorClass = isPass ? PASTEL.green : isWarn ? PASTEL.yellow : PASTEL.red;
  const Icon = isPass ? Check : isWarn ? AlertTriangle : X;

  return (
    <div id={item.anchorId} className="flex items-start gap-3 py-3.5 px-4 sm:px-5 scroll-mt-24">
      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border shrink-0 mt-0.5", colorClass)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between flex-wrap gap-x-3">
          <span className="font-bold text-sm text-[#2F3437]">{item.label}</span>
          {item.score !== undefined && (
            <span className="font-mono text-xs text-[#787774] font-bold shrink-0">
              {item.score}/20
            </span>
          )}
        </div>

        <p className="text-[13px] text-[#5F666B] leading-relaxed mt-0.5">
          {item.evidence}
        </p>

        {item.provenance && (
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {t(`provenance.source.${item.provenance.source}`)} · {t(`provenance.conf.${item.provenance.confidence}`)}
          </p>
        )}

        {!isPass && item.hint && (
          <div className="flex items-start gap-1.5 text-[13px] font-semibold text-indigo-600 mt-1.5">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{item.hint}</span>
          </div>
        )}

        {/* BE issues[] attached to this row (restores DimensionCard's issue list) */}
        {item.subItems && item.subItems.length > 0 && (
          <ul className="space-y-1.5 mt-2">
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

/**
 * Jobscan-style collapsible section panel: one bordered card per group,
 * rows divided by hairlines inside. Opens by default only when the group
 * has something to fix — clean groups stay collapsed to keep the page short.
 */
export function CheckGroup({ group, children }: CheckGroupProps) {
  const { t } = useTranslation("diagnosis");
  const [open, setOpen] = useState(group.issueCount > 0);
  const clean = group.issueCount === 0;

  // Companion citations scroll to dim-* anchors that may live inside a collapsed
  // group — revealCard dispatches this event so the owning group opens first.
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
      className="scroll-mt-24 rounded-xl border border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left hover:bg-slate-50/60 transition-colors focus-visible:ring-2 focus-visible:ring-ink-accent/40"
      >
        <ChevronDown className={cn("w-4 h-4 text-[#787774] shrink-0 transition-transform motion-reduce:transition-none", !open && "-rotate-90")} />
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#2F3437] flex-1 min-w-0 truncate">
          {group.label}
        </h2>
        {clean ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold", PASTEL.green)}>
            <Check className="w-3 h-3" />
            {t("report.rail.resolved")}
          </span>
        ) : (
          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", PASTEL.red)}>
            {t("report.rail.issuesBadge", { count: group.issueCount })}
          </span>
        )}
        {group.score !== undefined && (
          <span className="font-mono text-xs font-bold text-[#787774] shrink-0 tabular-nums">
            {group.score}/100
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-[#EAEAEA]">
          {group.items && group.items.length > 0 && (
            <div className="divide-y divide-[#F1F1EF]">
              {group.items.map((item) => (
                <CheckRow key={item.id} item={item} />
              ))}
            </div>
          )}
          {children && <div className="px-4 sm:px-5 py-4">{children}</div>}
        </div>
      )}
    </section>
  );
}
