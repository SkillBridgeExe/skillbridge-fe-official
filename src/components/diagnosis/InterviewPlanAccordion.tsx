import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { InterviewFocusType, InterviewPlanItem } from "@shared/api";

const FOCUS_CLASS: Record<InterviewFocusType, string> = {
  gap_probe: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
  depth_probe: "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
  evidence_probe: "bg-[#E1F3FE] text-[#1F6C9F] border-[#BEE3F8]",
  strength_showcase: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]",
};

/**
 * Presentational accordion for interview focus areas. Shared by InterviewPrepPack (CV-scoped query)
 * and MatchInterviewPlanCard (match-scoped mutation) so both stay visually identical. Owns only its
 * own open/closed UI state — no data fetching.
 */
export function InterviewPlanAccordion({ items }: { items: InterviewPlanItem[] }) {
  const { t } = useTranslation("diagnosis");
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-3">
      {items.slice(0, 7).map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={`${item.skill_canonical}-${index}`} className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA]">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              className="flex w-full items-start justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", FOCUS_CLASS[item.focus_type])}>
                    {t(`interviewPrep.focus.${item.focus_type}`)}
                  </span>
                  <span className="rounded-full border border-[#EAEAEA] bg-white px-2 py-0.5 text-[11px] font-bold text-[#787774]">
                    {t(`interviewPrep.difficulty.${item.difficulty}`)}
                  </span>
                </div>
                <p className="text-sm font-bold text-[#2F3437]">{item.display_name}</p>
                <p className="text-[13px] font-semibold leading-relaxed text-[#2F3437]">{item.question}</p>
              </div>
              {isOpen ? <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-[#787774]" /> : <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-[#787774]" />}
            </button>

            {isOpen && (
              <div className="border-t border-[#EAEAEA] px-4 pb-4 pt-3">
                <p className="text-xs leading-relaxed text-[#787774]">
                  <span className="font-bold text-[#2F3437]">{t("interviewPrep.whyAsk")} </span>
                  {item.reason}
                </p>
                {item.good_answer_hints?.length ? (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-[#2F3437]">{t("interviewPrep.goodAnswer")}</p>
                    <ul className="mt-2 space-y-1.5">
                      {item.good_answer_hints.slice(0, 3).map((hint, hintIndex) => (
                        <li key={`${hint}-${hintIndex}`} className="flex gap-2 text-xs leading-relaxed text-[#787774]">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{hint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
