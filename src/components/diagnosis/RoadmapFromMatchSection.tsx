import { ArrowRight, BookOpen, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useGenerateRoadmapFromMatchMutation } from "@/hooks/use-diagnosis";
import type { RoadmapParsedResponse } from "@shared/api";

/**
 * Learning roadmap derived from a CV/JD match's GapReport (POST /api/cv-matches/:matchId/roadmap).
 * Button-triggered (LLM call) — replaces the old dead-end "/roadmap-generator" link when a match
 * exists. Honest empty-state when there are no learnable gaps. Falls back to the legacy generator
 * link in CV-only mode (no matchId).
 */
export function RoadmapFromMatchSection({
  matchId,
  onScanAgain,
}: {
  matchId?: string | null;
  onScanAgain: () => void;
}) {
  const { t, i18n } = useTranslation("diagnosis");
  const lang = i18n.language?.startsWith("vi") ? "vi" : "en";
  const { mutate, data, isPending, isError } = useGenerateRoadmapFromMatchMutation();

  const plan = data?.parsed_response;
  const hasResult = Boolean(plan);
  const noGaps =
    hasResult && (plan?.no_learning_gaps === true || ((plan?.steps.length ?? 0) === 0 && (plan?.phases.length ?? 0) === 0));

  return (
    <>
      <div className="m-4 p-6 bg-[#FBFBFA] border border-[#EAEAEA] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <p className="font-bold text-[#2F3437] text-base">{t("results.roadmapTitle")}</p>
          <p className="text-sm text-[#787774] mt-1">{t("results.roadmapDesc")}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="ghost"
            onClick={onScanAgain}
            className="h-12 rounded-lg gap-2 text-sm font-semibold text-[#787774] hover:bg-[#F1F1EF] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <RotateCcw className="w-4 h-4" /> {t("results.scanAgain")}
          </Button>
          {matchId ? (
            <Button
              onClick={() => mutate({ matchId, lang })}
              disabled={isPending}
              className="h-12 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm text-sm font-bold shrink-0 px-6 gap-2 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {t("roadmap.generating")}
                </>
              ) : (
                <>
                  {t("results.generatePlan")} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              className="h-12 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm text-sm font-bold shrink-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40"
              asChild
            >
              <Link to="/roadmap-generator" className="px-6 flex items-center h-full gap-2">
                {t("results.generatePlan")} <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {matchId && (isPending || isError || hasResult) && (
        <div className="mx-4 mb-4">
          {isPending && <RoadmapSkeleton />}

          {isError && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[#EAEAEA] bg-white py-6 text-center">
              <p className="text-sm font-medium text-[#9F2F2D]">{t("roadmap.error")}</p>
              <Button
                variant="ghost"
                onClick={() => mutate({ matchId, lang })}
                className="h-10 gap-2 rounded-lg text-sm font-semibold text-[#787774] hover:bg-[#F1F1EF]"
              >
                <RotateCcw className="h-4 w-4" /> {t("roadmap.retry")}
              </Button>
            </div>
          )}

          {noGaps && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-[#DCE9D7] bg-[#F6FAF5] py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-[#346538]" />
              <p className="text-sm font-bold text-[#2F3437]">{t("roadmap.noGapsTitle")}</p>
              <p className="max-w-md text-xs text-[#787774]">{t("roadmap.noGapsDesc")}</p>
            </div>
          )}

          {hasResult && !noGaps && plan && <RoadmapResult plan={plan} />}
        </div>
      )}
    </>
  );
}

function RoadmapResult({ plan }: { plan: RoadmapParsedResponse }) {
  const { t } = useTranslation("diagnosis");
  const steps = [...plan.steps].sort((a, b) => a.step_order - b.step_order);

  return (
    <div className="rounded-xl border border-[#EAEAEA] bg-white p-5 space-y-5">
      <div>
        <h3 className="text-base font-bold text-[#2F3437]">{plan.title}</h3>
        {plan.total_weeks > 0 && (
          <p className="mt-1 text-xs font-semibold text-[#787774]">
            {t("roadmap.totalWeeks", { count: plan.total_weeks })}
          </p>
        )}
        {plan.ai_summary && <p className="mt-2 text-[13px] leading-relaxed text-[#2F3437]">{plan.ai_summary}</p>}
      </div>

      {steps.length > 0 && (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={`${step.step_order}-${index}`} className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDF3EC] text-xs font-bold text-[#346538]">
                  {index + 1}
                </span>
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-bold text-[#2F3437]">{step.title}</p>
                  {step.description && <p className="text-xs leading-relaxed text-[#787774]">{step.description}</p>}
                  {step.recommended_courses?.length ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#787774]">
                        {t("roadmap.courses")}
                      </p>
                      <ul className="space-y-1">
                        {step.recommended_courses.slice(0, 3).map((course) => (
                          <li key={course.id} className="flex items-center gap-2 text-xs">
                            <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <a
                              href={course.url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate font-medium text-[#1F6C9F] hover:underline"
                            >
                              {course.title}
                            </a>
                            {course.is_free && (
                              <span className="shrink-0 rounded-full border border-[#DCE9D7] bg-[#EDF3EC] px-1.5 py-0.5 text-[10px] font-bold text-[#346538]">
                                {t("roadmap.free")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {plan.ai_advice && (
        <div className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] px-4 py-3">
          <p className="text-xs leading-relaxed text-[#787774]">
            <span className="font-bold text-[#2F3437]">{t("roadmap.advice")} </span>
            {plan.ai_advice}
          </p>
        </div>
      )}
    </div>
  );
}

function RoadmapSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-[#EAEAEA] bg-white p-5">
      <div className="h-5 w-48 rounded bg-[#F1F1EF]" />
      <div className="h-3 w-full rounded bg-[#F1F1EF]" />
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-4">
          <div className="h-4 w-40 rounded bg-[#F1F1EF]" />
          <div className="mt-2 h-3 w-full rounded bg-[#F1F1EF]" />
        </div>
      ))}
    </div>
  );
}
