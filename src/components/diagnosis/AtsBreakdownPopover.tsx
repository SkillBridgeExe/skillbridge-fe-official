import { useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { AtsCheckResult } from "@shared/api";

interface Props {
  atsCheck?: AtsCheckResult;
  children: React.ReactNode;
}

export function AtsBreakdownPopover({ atsCheck, children }: Props) {
  const { t } = useTranslation("diagnosis");
  const [open, setOpen] = useState(false);

  if (!atsCheck || !atsCheck.rules) return <>{children}</>;

  const passed = atsCheck.rules.filter(r => r.status === 'pass');
  const failed = atsCheck.rules.filter(r => r.status === 'fail');

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ink-accent rounded-full transition-opacity hover:opacity-80"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {children}
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
            role="presentation"
          />

          {/* Popover card */}
          <div
            role="dialog"
            aria-label={t("atsBreakdown.title")}
            className={cn(
              "absolute z-[71] top-full left-1/2 -translate-x-1/2 mt-2",
              "w-[min(340px,85vw)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl",
              "animate-in fade-in zoom-in-95 duration-200",
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("atsBreakdown.title")}
              </h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded transition-colors"
                aria-label={t("common.close")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Passed */}
            {passed.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold text-emerald-700 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("atsBreakdown.passed", { count: passed.length })}
                </p>
                <div className="flex flex-col gap-1.5">
                  {passed.map((r) => (
                    <div
                      key={r.rule_id}
                      className="flex items-start gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 p-1.5 rounded-md border border-emerald-200"
                    >
                      <span className="font-medium flex-1">{r.label}</span>
                      {r.evidence && (
                        <span className="block flex-1 text-emerald-700/80 italic leading-relaxed">
                          “{r.evidence}”
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed */}
            {failed.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-amber-700 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t("atsBreakdown.failed", { count: failed.length })}
                </p>
                <div className="flex flex-col gap-2">
                  {failed.map((r) => (
                    <div
                      key={r.rule_id}
                      className="flex flex-col gap-1 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200"
                    >
                      <span className="font-bold">{r.label}</span>
                      {r.evidence && (
                        <span className="text-amber-700/80 italic leading-relaxed">
                          “{r.evidence}”
                        </span>
                      )}
                      {r.hint && (
                        <span className="text-amber-700/80 leading-relaxed">
                          {r.hint}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
