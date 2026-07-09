// ─── ScoreBreakdownPopover ────────────────────────────────────────
// Score-level explain popover (#14): shows which JD skills are
// covered vs not-covered when user clicks the match % number.

import { useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { CvJdMatch } from "@shared/api";
import { bucketCoverage } from "../companion/skills/score-breakdown";

interface Props {
  jdMatch: CvJdMatch | null | undefined;
  children: React.ReactNode;
}

export function ScoreBreakdownPopover({ jdMatch, children }: Props) {
  const { t } = useTranslation("diagnosis");
  const [open, setOpen] = useState(false);
  const bucket = bucketCoverage(jdMatch);

  if (!bucket) return <>{children}</>;

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-4 decoration-[#787774] cursor-pointer hover:decoration-ink-accent transition-colors"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {children}
        <Info className="w-3.5 h-3.5 text-[#787774] shrink-0" />
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
            aria-label={t("companion.scoreBreakdown.title")}
            className={cn(
              "absolute z-[71] top-full left-1/2 -translate-x-1/2 mt-2 md:top-1/2 md:left-full md:-translate-y-1/2 md:-translate-x-0 md:mt-0 md:ml-4",
              "w-[min(340px,85vw)] rounded-xl border border-[#EAEAEA] bg-white p-4 shadow-xl text-left",
              "animate-in fade-in zoom-in-95 duration-200",
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#787774]">
                {t("companion.scoreBreakdown.title")}
              </h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#787774] hover:text-[#2F3437] p-1 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Covered */}
            {bucket.covered.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-bold text-[#346538] mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("companion.scoreBreakdown.covered")} ({bucket.covered.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bucket.covered.map((s) => (
                    <span
                      key={s.name}
                      className="inline-flex items-center gap-1 rounded-full border border-[#DCE9D7] bg-[#EDF3EC] px-2 py-0.5 text-[11px] font-medium text-[#346538]"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Not covered */}
            {bucket.notCovered.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-[#956400] mb-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t("companion.scoreBreakdown.notCovered")} ({bucket.notCovered.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bucket.notCovered.map((s) => (
                    <span
                      key={s.name}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        s.status === "missing"
                          ? "border-[#F6D4D5] bg-[#FDEBEC] text-[#9F2F2D]"
                          : "border-[#F1E5C0] bg-[#FBF3DB] text-[#956400]",
                      )}
                    >
                      {s.name}
                    </span>
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
