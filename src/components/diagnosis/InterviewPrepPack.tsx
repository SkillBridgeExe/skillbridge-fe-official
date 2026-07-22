import { useState } from "react";
import { MessageSquare, Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useInterviewPlanQuery } from "@/hooks/use-diagnosis";
import { InterviewPlanAccordion } from "./InterviewPlanAccordion";
import { Chapter, SectionRule } from "./editorial";

const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

export function InterviewPrepPack({
  cvId,
  role,
  onCompareJd,
}: {
  cvId: string | null;
  role?: string | null;
  onCompareJd?: () => void;
}) {
  const { t, i18n } = useTranslation("diagnosis");
  const lang = i18n.language?.startsWith("vi") ? "vi" : "en";
  // Freeze the language at request time. Generating the plan reserves an
  // INTERVIEW_SESSION slot, so a passive header language toggle must NOT change
  // the query key and silently re-charge it (bug hunt R2 07-22). The AI plan
  // stays in the language it was generated in; UI chrome still follows i18n.
  const [requestedLang, setRequestedLang] = useState<"vi" | "en" | null>(null);
  const isRequested = requestedLang !== null;
  const { data, isLoading, isError } = useInterviewPlanQuery(
    isRequested ? cvId : null,
    role,
    requestedLang ?? lang
  );

  if (!cvId) return null;

  if (!isRequested) {
    return (
      <>
        <SectionRule className="my-6" />
        <Chapter kicker="04" title="">
          <div className={cn(CARD, "p-6 text-center space-y-4 mt-6")}>
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-sm font-bold text-[#2F3437]">
                {t("interviewPrep.ctaTitle", { defaultValue: "Luyện phỏng vấn thử" })}
              </h4>
              <p className="text-xs text-[#787774] leading-relaxed">
                {t("interviewPrep.ctaHint", { defaultValue: "Tạo bộ câu hỏi phỏng vấn thử nhắm mục tiêu vào các điểm thiếu sót trên CV." })}
              </p>
            </div>
            <button
              onClick={() => setRequestedLang(lang)}
              className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-colors shadow-sm active:scale-95 flex items-center gap-1.5 mx-auto"
            >
              <Mic className="w-3.5 h-3.5" />
              {t("interviewPrep.generate", { defaultValue: "Tạo bộ câu hỏi" })}
            </button>
          </div>
        </Chapter>
      </>
    );
  }

  const items = data?.items ?? [];
  const hasNoData = !role || isError || (!isLoading && items.length === 0);

  if (hasNoData) {
    return (
      <>
        <SectionRule className="my-6" />
        <Chapter kicker="04" title="">
          <div className={cn(CARD, "p-6 text-center space-y-4 mt-6")}>
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-sm font-bold text-[#2F3437]">
                {t("interviewPrep.emptyState.title")}
              </h4>
              <p className="text-xs text-[#787774] leading-relaxed">
                {t("interviewPrep.emptyState.desc")}
              </p>
            </div>
            {onCompareJd && (
              <button
                onClick={onCompareJd}
                className="px-4 py-2 bg-[#2F3437] text-white rounded-full font-bold text-xs hover:bg-[#2F3437]/90 transition-colors shadow-sm active:scale-95"
              >
                {t("interviewPrep.emptyState.cta")}
              </button>
            )}
          </div>
        </Chapter>
      </>
    );
  }

  return (
    <>
      <SectionRule className="my-6" />
      <Chapter kicker="04" title="">
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

            <div className="p-5">
              {isLoading ? <InterviewPrepSkeleton /> : <InterviewPlanAccordion items={items} />}
            </div>
          </div>
        </section>
      </Chapter>
    </>
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
