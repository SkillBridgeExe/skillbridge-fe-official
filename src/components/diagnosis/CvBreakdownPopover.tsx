import { useState } from "react";
import { Info, X, Shield, Code, Brain, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface CvBreakdown {
  ats: number;
  structure: number;
  skills: number;
  experience: number;
}

interface Props {
  breakdown?: CvBreakdown;
  overallScore: number;
  /** W44: rubric band from JD match — used for honest framing in CV score popover. */
  rubricBand?: string | null;
  children: React.ReactNode;
}

export function CvBreakdownPopover({ breakdown, overallScore, rubricBand, children }: Props) {
  const { t } = useTranslation("diagnosis");
  const [open, setOpen] = useState(false);

  if (!breakdown) return <>{children}</>;

  const items = [
    { label: "ATS", score: breakdown.ats, icon: Shield, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: t("results.structure", "Cấu trúc"), score: breakdown.structure, icon: Code, color: "text-sky-700", bg: "bg-sky-100" },
    { label: t("cvBreakdown.skills"), score: breakdown.skills, icon: Brain, color: "text-violet-600", bg: "bg-violet-100" },
    { label: t("cvBreakdown.experience"), score: breakdown.experience, icon: Briefcase, color: "text-orange-700", bg: "bg-orange-100" },
  ];

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex flex-col items-center cursor-pointer outline-none transition-opacity hover:opacity-80"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <div className="relative">
          {children}
          <div className="absolute top-2 right-[-1.5rem] bg-slate-100 rounded-full p-1 text-slate-500 hover:text-slate-700 transition-colors shadow-sm border border-slate-200">
            <Info className="w-3.5 h-3.5" />
          </div>
        </div>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
            role="presentation"
          />
          <div
            role="dialog"
            aria-label="CV Score Breakdown"
            className={cn(
              "absolute z-[71] top-[80%] left-1/2 -translate-x-1/2 mt-2 md:top-1/2 md:left-full md:-translate-x-0 md:-translate-y-1/2 md:mt-0 md:ml-12",
              "w-[min(300px,85vw)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl",
              "animate-in fade-in zoom-in-95 duration-200",
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("cvBreakdown.title", { score: overallScore })}
              </h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-md", item.bg, item.color)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                    </div>
                    <span className={cn("text-xs font-bold font-mono", item.color)}>
                      {item.score}/100
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-600 mt-4 text-center">
              {t("cvBreakdown.note")}
            </p>
            {/* W44: band framing — honest context */}
            {rubricBand && (
              <p className="text-[10px] text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1.5 mt-2 text-center leading-relaxed">
                {t("cvBreakdown.bandFraming", {
                  band: rubricBand,
                  defaultValue: `Skills scored against the ${rubricBand} standard — changing the bar will change the score.`,
                })}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
