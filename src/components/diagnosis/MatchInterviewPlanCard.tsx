import { CheckCircle2, MessageSquare, Mic, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useGenerateInterviewPlanFromMatchMutation } from "@/hooks/use-diagnosis";
import { InterviewPlanAccordion } from "./InterviewPlanAccordion";
import { isThrottledError } from "@/lib/api-error";

const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

/**
 * Gap-targeted interview practice plan derived from a CV/JD match (POST /api/cv-matches/:matchId/
 * interview-plan). Button-triggered (LLM call) — deliberate, no auto-fetch on mount. Honest empty-state
 * when the match has no skill-type gaps to probe.
 */
export function MatchInterviewPlanCard({ matchId }: { matchId: string }) {
  const { t, i18n } = useTranslation("diagnosis");
  const lang = i18n.language?.startsWith("vi") ? "vi" : "en";
  const { mutate, data, isPending, isError, error } = useGenerateInterviewPlanFromMatchMutation();
  const isThrottled = isError && isThrottledError(error);

  const items = data?.items ?? [];
  const hasResult = Boolean(data);
  const noFocus = hasResult && (data?.no_focus_areas === true || items.length === 0);

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
          {hasResult && !noFocus && data?.llm_enhanced === false && (
            <p className="mt-3 rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] px-3 py-2 text-xs font-medium text-[#787774]">
              {t("interviewPrep.templateNote")}
            </p>
          )}
        </div>

        <div className="p-5">
          {!hasResult && !isPending && !isError && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="max-w-md text-sm text-[#787774]">{t("interviewPrep.ctaHint")}</p>
              <Button
                onClick={() => mutate({ matchId, lang })}
                className="h-11 rounded-lg bg-primary px-6 text-sm font-bold text-white hover:bg-primary/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {t("interviewPrep.generate")}
              </Button>
            </div>
          )}

          {isPending && <InterviewPlanSkeleton />}

          {isError && (
            <div className={cn(
              "flex flex-col items-center gap-3 py-4 text-center px-4 rounded-xl border",
              isThrottled ? "border-[#EAEAEA] bg-[#FBFBFA]" : "border-transparent"
            )}>
              <p className={cn("text-sm font-medium", isThrottled ? "text-[#787774]" : "text-[#9F2F2D]")}>
                {isThrottled 
                  ? t("degraded.throttled", { defaultValue: "Bạn thao tác hơi nhanh, thử lại sau giây lát" })
                  : t("interviewPrep.error")}
              </p>
              <Button
                variant="ghost"
                onClick={() => mutate({ matchId, lang })}
                className="h-10 gap-2 rounded-lg text-sm font-semibold text-[#787774] hover:bg-[#F1F1EF]"
              >
                <RotateCcw className="h-4 w-4" />
                {t("interviewPrep.retry")}
              </Button>
            </div>
          )}

          {noFocus && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-[#346538]" />
              <p className="text-sm font-bold text-[#2F3437]">{t("interviewPrep.noFocusTitle")}</p>
              <p className="max-w-md text-xs text-[#787774]">{t("interviewPrep.noFocusDesc")}</p>
            </div>
          )}

          {hasResult && !noFocus && <InterviewPlanAccordion items={items} />}
        </div>
      </div>
    </section>
  );
}

function InterviewPlanSkeleton() {
  return (
    <div className="space-y-3">
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
    </div>
  );
}
