import { useState } from "react";
import { ChevronDown, ChevronUp, MessageSquare, Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useInterviewPlanQuery } from "@/hooks/use-diagnosis";
import type { InterviewFocusType } from "@shared/api";

const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

const FOCUS_CLASS: Record<InterviewFocusType, string> = {
  gap_probe: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
  depth_probe: "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
  evidence_probe: "bg-[#E1F3FE] text-[#1F6C9F] border-[#BEE3F8]",
  strength_showcase: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]",
};

export function InterviewPrepPack({
  cvId,
  role,
}: {
  cvId: string | null;
  role?: string | null;
}) {
  const { t, i18n } = useTranslation("diagnosis");
  const lang = i18n.language?.startsWith("vi") ? "vi" : "en";
  const { data, isLoading, isError } = useInterviewPlanQuery(cvId, role, lang);
  const [openIndex, setOpenIndex] = useState(0);

  if (!cvId || !role || isError) return null;

  const items = data?.items ?? [];
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="mt-6">
      <div className={cn(CARD, "overflow-hidden")}>
        <div className="border-b border-[#EAEAEA] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-[#2F3437]">
                <MessageSquare className="h-5 w-5 text-primary" />
                {t("interviewPrep.title")}
              </h3>
              <p className="mt-1 text-xs text-[#787774]">{t("interviewPrep.subtitle")}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#DCE9D7] bg-[#EDF3EC] px-3 py-1 text-xs font-bold text-[#346538]">
              <Mic className="h-3.5 w-3.5" />
              {t("interviewPrep.practiceOnly")}
            </span>
          </div>
          {data?.llm_enhanced === false && (
            <p className="mt-3 rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] px-3 py-2 text-xs font-medium text-[#787774]">
              {t("interviewPrep.templateNote")}
            </p>
          )}
        </div>

        <div className="space-y-3 p-5">
          {isLoading ? (
            <InterviewPrepSkeleton />
          ) : (
            items.slice(0, 7).map((item, index) => {
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
            })
          )}
        </div>
      </div>
    </section>
  );
}

function InterviewPrepSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-4">
          <div className="mb-3 flex gap-2">
            <div className="h-5 w-28 rounded-full bg-[#F1F1EF]" />
            <div className="h-5 w-20 rounded-full bg-[#F1F1EF]" />
          </div>
          <div className="h-4 w-40 rounded bg-[#F1F1EF]" />
          <div className="mt-3 h-3 w-full rounded bg-[#F1F1EF]" />
        </div>
      ))}
    </>
  );
}
