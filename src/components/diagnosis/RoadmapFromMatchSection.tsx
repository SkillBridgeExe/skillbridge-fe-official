import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Loader2, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  useGenerateRoleRoadmapFromCvMutation,
  useGenerateRoadmapFromMatchMutation,
  useRoleRoadmapOptionsQuery,
  useRoadmapOptionsFromMatchQuery,
} from "@/hooks/use-diagnosis";
import { DEFAULT_ROADMAP_BUDGET, type ComposedRoadmap, type RoadmapBudgetInput } from "@/services/learning-roadmap.service";
import { useRoadmapStore } from "@/components/learning/roadmap-store";
import { MascotRoadmapWizard } from "./roadmap-budget-wizard";
import { MascotSticker } from "@/components/mascot/MascotSticker";
import { OPEN_ROADMAP_WIZARD_EVENT } from "@/components/companion/skills/chat-action-events";
import { cn } from "@/lib/utils";

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
  const { t } = useTranslation("diagnosis");
  const navigate = useNavigate();
  const mergeComposedRoadmap = useRoadmapStore((state) => state.mergeComposedRoadmap);
  const { mutate, data, isPending, isError } = useGenerateRoadmapFromMatchMutation();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [lastBudget, setLastBudget] = useState<RoadmapBudgetInput>(DEFAULT_ROADMAP_BUDGET);
  const { data: roadmapOptions, isLoading: isOptionsLoading } = useRoadmapOptionsFromMatchQuery(
    matchId,
    Boolean(matchId),
  );
  const noLearnableOptions =
    !isOptionsLoading &&
    Boolean(roadmapOptions) &&
    (roadmapOptions?.no_learning_gaps === true || (roadmapOptions?.options.length ?? 0) === 0);

  useEffect(() => {
    if (!matchId) return;
    const openWizard = () => {
      if (noLearnableOptions) return;
      setIsWizardOpen(true);
    };
    window.addEventListener(OPEN_ROADMAP_WIZARD_EVENT, openWizard);
    return () => window.removeEventListener(OPEN_ROADMAP_WIZARD_EVENT, openWizard);
  }, [matchId, noLearnableOptions]);

  const plan = data;
  const hasResult = Boolean(plan);
  const noGaps = hasResult && (plan?.no_learning_gaps === true || (plan?.steps.length ?? 0) === 0);
  const generate = (body: RoadmapBudgetInput = lastBudget) => {
    if (!matchId) return;
    setLastBudget(body);
    setIsWizardOpen(false);
    mutate(
      { matchId, body },
      {
        onSuccess: (roadmap) => {
          mergeComposedRoadmap(roadmap);
          if (!roadmap.no_learning_gaps && roadmap.steps.length > 0) {
            navigate("/learning");
          }
        },
      },
    );
  };
  if (!matchId) return null;

  const isVi = t("results.generatePlan") === "Tạo lộ trình học";
  const loadingTitle = isVi 
    ? "AI đang xây dựng lộ trình học tập..." 
    : "AI is building your study plan...";
  const loadingSubtitle = isVi 
    ? "Đang phân tích khoảng trống và đề xuất khóa học phù hợp" 
    : "Analyzing skill gaps and recommending the best resources...";
  const loadingDesc = isVi 
    ? "Quá trình này có thể mất 10-20 giây. Vui lòng giữ trang này mở." 
    : "This may take 10-20 seconds. Please keep this page open.";

  return (
    <>
      {/* Fullscreen Mascot Loading Overlay */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="mb-8 drop-shadow-[0_25px_50px_rgba(56,130,246,0.35)]">
              <MascotSticker state="loading" size={380} interactive={false} />
            </div>
            <div className="text-center space-y-3 px-6">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loadingTitle}
              </h3>
              <p className="text-sm font-semibold text-[#4ea8de] animate-pulse">
                {loadingSubtitle}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {loadingDesc}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <Button
            onClick={() => {
              if (noLearnableOptions) return;
              setIsWizardOpen(true);
            }}
            disabled={isPending || isOptionsLoading || noLearnableOptions}
            className="h-12 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm text-sm font-bold shrink-0 px-6 gap-2 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-70"
          >
            {isPending || isOptionsLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isPending
                  ? t("roadmap.generating")
                  : t("roadmap.loadingOptions", { defaultValue: "Checking gaps..." })}
              </>
            ) : (
              <>
                {t("results.generatePlan")} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {matchId && isWizardOpen && !noLearnableOptions && (
        <MascotRoadmapWizard
          isPending={isPending}
          isOptionsLoading={isOptionsLoading}
          options={roadmapOptions?.options ?? []}
          onClose={() => setIsWizardOpen(false)}
          onSubmit={generate}
        />
      )}

      {matchId && (isPending || isError || hasResult || noLearnableOptions) && (
        <div className="mx-4 mb-4">
          {isPending && <RoadmapSkeleton />}

          {isError && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[#EAEAEA] bg-white py-6 text-center">
              <p className="text-sm font-medium text-[#9F2F2D]">{t("roadmap.error")}</p>
              <Button
                variant="ghost"
                onClick={() => generate()}
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

export function RoleRoadmapAction({
  cvId,
  role,
  band = "fresher",
  className,
}: {
  cvId?: string | null;
  role?: string | null;
  band?: string;
  className?: string;
}) {
  const { t } = useTranslation("diagnosis");
  const navigate = useNavigate();
  const mergeComposedRoadmap = useRoadmapStore((state) => state.mergeComposedRoadmap);
  const { mutate, isPending } = useGenerateRoleRoadmapFromCvMutation();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [lastBudget, setLastBudget] = useState<RoadmapBudgetInput>(DEFAULT_ROADMAP_BUDGET);
  const canGenerate = Boolean(cvId && role);
  const { data: roadmapOptions, isLoading: isOptionsLoading } = useRoleRoadmapOptionsQuery(
    cvId,
    role,
    band,
    isWizardOpen && canGenerate,
  );

  const generate = (body: RoadmapBudgetInput = lastBudget) => {
    if (!cvId || !role) return;
    setLastBudget(body);
    setIsWizardOpen(false);
    mutate(
      { cvId, role, band, body },
      {
        onSuccess: (roadmap) => {
          mergeComposedRoadmap(roadmap);
          if (!roadmap.no_learning_gaps && roadmap.steps.length > 0) {
            navigate("/learning");
          }
        },
      },
    );
  };

  const isVi = t("results.generatePlan") === "Tạo lộ trình học";
  const loadingTitle = isVi
    ? "AI đang xây dựng lộ trình học tập..."
    : "AI is building your study plan...";
  const loadingSubtitle = isVi
    ? "Đang phân tích khoảng trống vai trò và đề xuất khóa học phù hợp"
    : "Analyzing role gaps and recommending the best resources...";
  const loadingDesc = isVi
    ? "Quá trình này có thể mất 10-20 giây. Vui lòng giữ trang này mở."
    : "This may take 10-20 seconds. Please keep this page open.";

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsWizardOpen(true)}
        disabled={!canGenerate || isPending}
        className={cn(
          "h-8 rounded-lg bg-primary px-3 text-xs font-bold text-white shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70",
          className,
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("roadmap.generating")}
          </>
        ) : (
          <>
            <BookOpen className="h-3.5 w-3.5" />
            {t("results.generateMissingRoadmap", {
              defaultValue: "Generate roadmap",
            })}
          </>
        )}
      </Button>

      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="mb-8 drop-shadow-[0_25px_50px_rgba(56,130,246,0.35)]">
              <MascotSticker state="loading" size={380} interactive={false} />
            </div>
            <div className="text-center space-y-3 px-6">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loadingTitle}
              </h3>
              <p className="text-sm font-semibold text-[#4ea8de] animate-pulse">
                {loadingSubtitle}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">{loadingDesc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isWizardOpen && canGenerate && (
        <MascotRoadmapWizard
          isPending={isPending}
          isOptionsLoading={isOptionsLoading}
          options={roadmapOptions?.options ?? []}
          onClose={() => setIsWizardOpen(false)}
          onSubmit={generate}
        />
      )}
    </>
  );
}

export function RoleRoadmapSection({
  cvId,
  role,
  band = "fresher",
  onScanAgain,
}: {
  cvId?: string | null;
  role?: string | null;
  band?: string;
  onScanAgain: () => void;
}) {
  const { t } = useTranslation("diagnosis");
  const navigate = useNavigate();
  const mergeComposedRoadmap = useRoadmapStore((state) => state.mergeComposedRoadmap);
  const { mutate, data, isPending, isError } = useGenerateRoleRoadmapFromCvMutation();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [lastBudget, setLastBudget] = useState<RoadmapBudgetInput>(DEFAULT_ROADMAP_BUDGET);
  const canGenerate = Boolean(cvId && role);
  const { data: roadmapOptions, isLoading: isOptionsLoading } = useRoleRoadmapOptionsQuery(
    cvId,
    role,
    band,
    isWizardOpen && canGenerate,
  );

  const plan = data;
  const hasResult = Boolean(plan);
  const noGaps = hasResult && (plan?.no_learning_gaps === true || (plan?.steps.length ?? 0) === 0);
  const generate = (body: RoadmapBudgetInput = lastBudget) => {
    if (!cvId || !role) return;
    setLastBudget(body);
    setIsWizardOpen(false);
    mutate(
      { cvId, role, band, body },
      {
        onSuccess: (roadmap) => {
          mergeComposedRoadmap(roadmap);
          if (!roadmap.no_learning_gaps && roadmap.steps.length > 0) {
            navigate("/learning");
          }
        },
      },
    );
  };

  const isVi = t("results.generatePlan") === "Tạo lộ trình học";
  const loadingTitle = isVi
    ? "AI đang xây dựng lộ trình học tập..."
    : "AI is building your study plan...";
  const loadingSubtitle = isVi
    ? "Đang phân tích khoảng trống vai trò và đề xuất khóa học phù hợp"
    : "Analyzing role gaps and recommending the best resources...";
  const loadingDesc = isVi
    ? "Quá trình này có thể mất 10-20 giây. Vui lòng giữ trang này mở."
    : "This may take 10-20 seconds. Please keep this page open.";

  return (
    <>
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="mb-8 drop-shadow-[0_25px_50px_rgba(56,130,246,0.35)]">
              <MascotSticker state="loading" size={380} interactive={false} />
            </div>
            <div className="text-center space-y-3 px-6">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loadingTitle}
              </h3>
              <p className="text-sm font-semibold text-[#4ea8de] animate-pulse">
                {loadingSubtitle}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">{loadingDesc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 bg-[#FBFBFA] border border-[#EAEAEA] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <p className="font-bold text-[#2F3437] text-base">
            {t("results.roleRoadmapTitle", { defaultValue: "Create a learning roadmap from this CV" })}
          </p>
          <p className="text-sm text-[#787774] mt-1">
            {t("results.roleRoadmapDesc", {
              defaultValue:
                "SkillBridge will compare your CV with the selected role baseline and build a study plan from the missing or partial skills.",
            })}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="ghost"
            onClick={onScanAgain}
            className="h-12 rounded-lg gap-2 text-sm font-semibold text-[#787774] hover:bg-[#F1F1EF] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <RotateCcw className="w-4 h-4" /> {t("results.scanAgain")}
          </Button>
          <Button
            onClick={() => setIsWizardOpen(true)}
            disabled={!canGenerate || isPending}
            className="h-12 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm text-sm font-bold shrink-0 px-6 gap-2 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-70"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {t("roadmap.generating")}
              </>
            ) : (
              <>
                {t("results.generateCvRoadmap", { defaultValue: "Generate CV roadmap" })}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {isWizardOpen && canGenerate && (
        <MascotRoadmapWizard
          isPending={isPending}
          isOptionsLoading={isOptionsLoading}
          options={roadmapOptions?.options ?? []}
          onClose={() => setIsWizardOpen(false)}
          onSubmit={generate}
        />
      )}

      {(isPending || isError || hasResult) && (
        <div className="mt-4">
          {isPending && <RoadmapSkeleton />}

          {isError && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[#EAEAEA] bg-white py-6 text-center">
              <p className="text-sm font-medium text-[#9F2F2D]">{t("roadmap.error")}</p>
              <Button
                variant="ghost"
                onClick={() => generate()}
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

function RoadmapResult({ plan }: { plan: ComposedRoadmap }) {
  const { t } = useTranslation("diagnosis");
  // Higher priority = more urgent gap → sort DESCENDING so the most urgent step leads.
  const steps = [...plan.steps].sort((a, b) => b.priority - a.priority);

  return (
    <div className="rounded-xl border border-[#EAEAEA] bg-white p-5 space-y-5">
      <div>
        <h3 className="text-base font-bold text-[#2F3437]">{t("results.roadmapTitle")}</h3>
        <p className="mt-1 text-xs font-semibold text-[#787774]">
          {t("roadmap.budgetSummary", { count: steps.length })}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#2F3437]">
          {t("roadmap.selectionSummary", { count: steps.length })}
        </p>
      </div>

      {steps.length > 0 && (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={`${step.skill_canonical}-${index}`} className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDF3EC] text-xs font-bold text-[#346538]">
                  {index + 1}
                </span>
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-bold text-[#2F3437]">{step.display_name}</p>
                  <p className="flex items-center gap-2 text-xs leading-relaxed text-[#787774]">
                    <Clock className="h-3.5 w-3.5" />
                    {step.estimated_hours}h · {t(`roadmap.strategy.${step.strategy}`)}
                  </p>
                  {step.resources?.length ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#787774]">
                        {t("roadmap.courses", { defaultValue: "Resources" })}
                      </p>
                      <ul className="space-y-1">
                        {step.resources.slice(0, 3).map((resource) => (
                          <li key={resource.id} className="flex items-center gap-2 text-xs">
                            <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate font-medium text-[#1F6C9F] hover:underline"
                            >
                              {resource.title}
                            </a>
                            {resource.low_confidence && (
                              <span className="shrink-0 rounded-full border border-[#DCE9D7] bg-[#EDF3EC] px-1.5 py-0.5 text-[10px] font-bold text-[#346538]">
                                {t("roadmap.pendingSource")}
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

      {false && (
        <div className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] px-4 py-3">
          <p className="text-xs font-bold leading-relaxed text-[#2F3437]">{t("roadmap.notFeasible")}</p>
          <ul className="mt-1 space-y-0.5">
            {plan.not_feasible_items.map((item) => (
              <li key={item.skill_canonical} className="text-xs leading-relaxed text-[#787774]">
                {item.display_name}
                {item.fallback && (
                  <span className="text-[#956400]"> · {t(`roadmap.fallback.${item.fallback}`)}</span>
                )}
              </li>
            ))}
          </ul>
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
