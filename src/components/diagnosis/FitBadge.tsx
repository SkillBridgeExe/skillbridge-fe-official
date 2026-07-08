import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { HelpCircle, X } from "lucide-react";
import type { FitReasonCode, FitVerdict } from "@shared/api";

interface FitBadgeProps {
  fit: { verdict: FitVerdict; reasons: FitReasonCode[] };
  className?: string;
}

/**
 * W44: Replaced hover tooltip with click-toggle popover for mobile-first UX.
 * Pattern from ScoreBreakdownPopover.tsx — click to open, backdrop to close.
 */
export function FitBadge({ fit, className }: FitBadgeProps) {
  const { t } = useTranslation("diagnosis");
  const [open, setOpen] = useState(false);

  const colorClass =
    fit.verdict === "safe_apply"
      ? "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]"
      : fit.verdict === "stretch"
        ? "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]"
        : "bg-[#FDEBEC] text-[#9F2F2D] border-[#F5C9C7]"; // not_recommended

  return (
    <div className={cn("relative inline-flex items-center gap-1", className)}>
      <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold", colorClass)}>
        {t(`fit.verdict.${fit.verdict}`)}
      </span>
      {fit.reasons && fit.reasons.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex items-center p-0.5 rounded transition-colors hover:bg-slate-100"
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={t("fit.reasonsLabel", { defaultValue: "Show fit reasons" })}
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#787774]" />
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
                aria-label={t("fit.reasonsLabel", { defaultValue: "Fit reasons" })}
                className={cn(
                  "absolute z-[71] top-full left-0 mt-1.5",
                  "w-[min(220px,80vw)] rounded-xl border border-[#EAEAEA] bg-white p-3 shadow-xl",
                  "animate-in fade-in zoom-in-95 duration-200",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">
                    {t("fit.reasonsTitle", { defaultValue: "Why this verdict" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-[#787774] hover:text-[#2F3437] p-0.5 rounded transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <ul className="list-disc pl-3 space-y-0.5">
                  {fit.reasons.map((reason, idx) => (
                    <li key={idx} className="text-xs text-[#2F3437] leading-relaxed">
                      {t(`fit.reason.${reason}`, { defaultValue: reason })}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
