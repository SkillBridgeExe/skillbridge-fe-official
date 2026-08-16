import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  GripVertical,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as Dialog from "@radix-ui/react-dialog";
import { getCvListApi } from "@/api/cv/list";
import { Button } from "@/components/ui/button";
import { IT_ROLES } from "@/constants/it-roles";
import {
  createLearningRoadmapDraft,
  generateLearningRoadmap,
  getActiveLearningRoadmap,
  previewLearningRoadmap,
  updateLearningRoadmapDraft,
  type ActiveLearningRoadmap,
  type LearningPresentedResource,
  type LearningRoadmapDraft,
  type LearningRoadmapIntent,
  type LearningRoadmapPreview,
} from "@/services/learning-roadmaps-v2.service";
import type { CvListItemDto } from "@shared/api";
import {
  buildCadenceDraft,
  buildPrioritySelection,
  buildResourceSelection,
  removeSkillId,
  reorderSkillIds,
  restoreSkillId,
} from "./learning-roadmap-wizard-state";

type Step = "goal" | "context" | "priorities" | "schedule" | "preview";

interface LearningRoadmapWizardProps {
  initialMatchId?: string | null;
  onClose: () => void;
  onGenerated: (roadmap: ActiveLearningRoadmap) => void;
}

const STUDY_DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

export function LearningRoadmapWizard({
  initialMatchId,
  onClose,
  onGenerated,
}: LearningRoadmapWizardProps) {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(initialMatchId ? "context" : "goal");
  const [intent, setIntent] = useState<LearningRoadmapIntent | null>(
    initialMatchId ? "JD_APPLICATION" : null,
  );
  const [role, setRole] = useState("frontend_developer");
  const [level, setLevel] = useState<"intern" | "fresher" | "mid">("fresher");
  const [cvs, setCvs] = useState<CvListItemDto[]>([]);
  const [cvId, setCvId] = useState("");
  const [draft, setDraft] = useState<LearningRoadmapDraft | null>(null);
  const [orderedSkills, setOrderedSkills] = useState<string[]>([]);
  const [ignoredSkills, setIgnoredSkills] = useState<string[]>([]);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(today);
  const [studyDaysPerWeek, setStudyDaysPerWeek] =
    useState<(typeof STUDY_DAY_OPTIONS)[number]>(3);
  const [preview, setPreview] = useState<LearningRoadmapPreview | null>(null);
  const [selectedResources, setSelectedResources] = useState<
    Record<string, string[]>
  >({});
  const [resourceSelectionDirty, setResourceSelectionDirty] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (intent !== "CAREER_ROLE") return;
    let cancelled = false;
    getCvListApi({ limit: 50 })
      .then((result) => {
        if (cancelled) return;
        setCvs(result.items);
        setCvId((current) => current || result.items[0]?.id || "");
      })
      .catch((cause) => {
        if (!cancelled) setError(messageOf(cause, t));
      });
    return () => {
      cancelled = true;
    };
  }, [intent, t]);

  const progressSteps: Step[] = initialMatchId
    ? ["context", "priorities", "schedule", "preview"]
    : ["goal", "context", "priorities", "schedule", "preview"];
  const stepIndex = progressSteps.indexOf(step);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedCandidates = useMemo(() => {
    if (!draft) return [];
    const byCanonical = new Map(
      draft.candidate_skills.map((candidate) => [
        candidate.skill_canonical,
        candidate,
      ]),
    );
    return orderedSkills.flatMap((canonical) => {
      const candidate = byCanonical.get(canonical);
      return candidate ? [candidate] : [];
    });
  }, [draft, orderedSkills]);

  const ignoredCandidates = useMemo(() => {
    if (!draft) return [];
    const ignored = new Set(ignoredSkills);
    return draft.candidate_skills.filter((candidate) => ignored.has(candidate.skill_canonical));
  }, [draft, ignoredSkills]);

  const chooseIntent = (value: LearningRoadmapIntent) => {
    setIntent(value);
    setError(null);
    setStep("context");
  };

  const createDraft = async () => {
    if (!intent) return;
    if (intent === "JD_APPLICATION" && !initialMatchId) {
      navigate("/diagnosis");
      onClose();
      return;
    }
    if (intent === "CAREER_ROLE" && !cvId) {
      setError(t("learning.wizard.errors.chooseCv"));
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const created = await createLearningRoadmapDraft(
        intent === "JD_APPLICATION"
          ? { intent, cv_match_id: initialMatchId! }
          : {
              intent,
              cv_id: cvId,
              target_role: role,
              target_level: level,
            },
      );
      setDraft(created);
      setOrderedSkills(
        created.candidate_skills.map((candidate) => candidate.skill_canonical),
      );
      setIgnoredSkills([]);
      setStep("priorities");
    } catch (cause) {
      setError(messageOf(cause, t));
    } finally {
      setIsBusy(false);
    }
  };

  const saveScheduleAndPreview = async () => {
    if (!draft) return;
    setIsBusy(true);
    setError(null);
    try {
      const cadence = buildCadenceDraft({
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "Asia/Ho_Chi_Minh",
        startDate,
        studyDaysPerWeek,
      });
      const updated = await updateLearningRoadmapDraft(draft.id, {
        expected_revision: draft.revision,
        selected_priorities: buildPrioritySelection(
          draft.candidate_skills,
          orderedSkills,
        ),
        cadence,
      });
      const nextPreview = await previewLearningRoadmap(
        updated.id,
        updated.revision,
      );
      setDraft(updated);
      setPreview(nextPreview);
      setSelectedResources(buildResourceSelection(nextPreview));
      // Preview resources are server-verified, but the primary-only default is a
      // learner choice that still needs to be persisted before generation.
      setResourceSelectionDirty(true);
      setStep("preview");
    } catch (cause) {
      setError(messageOf(cause, t));
    } finally {
      setIsBusy(false);
    }
  };

  const generate = async () => {
    if (!draft || !preview) return;
    setIsBusy(true);
    setError(null);
    try {
      let currentDraft = draft;
      let currentPreview = preview;

      if (resourceSelectionDirty) {
        currentDraft = await updateLearningRoadmapDraft(draft.id, {
          expected_revision: draft.revision,
          selected_resources: selectedResources,
        });
        currentPreview = await previewLearningRoadmap(
          currentDraft.id,
          currentDraft.revision,
        );
        setDraft(currentDraft);
        setPreview(currentPreview);
        setSelectedResources(buildResourceSelection(currentPreview));
        setResourceSelectionDirty(false);
      }

      await generateLearningRoadmap(currentDraft.id, currentPreview.revision);
      onGenerated(await getActiveLearningRoadmap(currentDraft.id));
    } catch (cause) {
      setError(messageOf(cause, t));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveSkill(String(active.id));
  };

  const handleDragCancel = () => {
    setActiveSkill(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveSkill(null);
    if (!over) return;
    setOrderedSkills((current) =>
      reorderSkillIds(current, String(active.id), String(over.id)),
    );
  };

  const removeSkill = (canonical: string) => {
    const next = removeSkillId(orderedSkills, ignoredSkills, canonical);
    setOrderedSkills(next.ordered);
    setIgnoredSkills(next.ignored);
  };

  const restoreSkill = (canonical: string) => {
    const next = restoreSkillId(orderedSkills, ignoredSkills, canonical);
    setOrderedSkills(next.ordered);
    setIgnoredSkills(next.ignored);
  };

  const toggleResource = (skillCanonical: string, resourceId: string) => {
    setSelectedResources((current) => {
      const selected = current[skillCanonical] ?? [];
      const next = selected.includes(resourceId)
        ? selected.filter((id) => id !== resourceId)
        : [...selected, resourceId];
      return { ...current, [skillCanonical]: next };
    });
    setResourceSelectionDirty(true);
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !isBusy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-modal="true"
          className="fixed inset-0 z-[101] overflow-y-auto p-4 outline-none"
          onEscapeKeyDown={(event) => {
            if (isBusy) event.preventDefault();
          }}
        >
          <div className="mx-auto my-4 w-full max-w-3xl rounded-3xl bg-white shadow-2xl md:my-10">
        <header className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <div
              className="mb-3 flex gap-1.5"
              aria-label={t("learning.wizard.progress")}
            >
              {progressSteps.map((_, index) => (
                <span
                  key={index}
                  data-testid="learning-wizard-progress-segment"
                  data-active={index <= stepIndex ? "true" : "false"}
                  className={`h-1.5 rounded-full ${index <= stepIndex ? "w-8 bg-primary" : "w-4 bg-slate-200"}`}
                />
              ))}
            </div>
            <Dialog.Title className="text-xl font-bold text-slate-900">
              {t(`learning.wizard.steps.${step}`)}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-500">
              {t("learning.wizard.subtitle")}
            </Dialog.Description>
          </div>
          <Dialog.Close asChild>
            <button
              type="button"
              disabled={isBusy}
              aria-label={t("learning.wizard.close")}
              className="rounded-full p-2 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </header>

        <main className="min-h-[390px] space-y-5 p-6">
          {step === "goal" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <GoalCard
                title={t("learning.wizard.goal.jdTitle")}
                body={t("learning.wizard.goal.jdBody")}
                onClick={() => chooseIntent("JD_APPLICATION")}
              />
              <GoalCard
                title={t("learning.wizard.goal.careerTitle")}
                body={t("learning.wizard.goal.careerBody")}
                onClick={() => chooseIntent("CAREER_ROLE")}
              />
            </div>
          ) : null}

          {step === "context" ? (
            <div className="space-y-5">
              {intent === "JD_APPLICATION" && !initialMatchId ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  {t("learning.wizard.goal.jdNeedsDiagnosis")}
                </div>
              ) : null}
              {intent === "JD_APPLICATION" && initialMatchId ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                      <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sky-950">
                        {t("learning.wizard.context.matchTitle")}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-sky-800">
                        {t("learning.wizard.context.matchBody")}
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        {t("learning.wizard.context.matchReady")}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {intent === "CAREER_ROLE" ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label={t("learning.wizard.context.cv")}>
                    <select
                      value={cvId}
                      onChange={(event) => setCvId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">
                        {t("learning.wizard.context.chooseCv")}
                      </option>
                      {cvs.map((cv) => (
                        <option key={cv.id} value={cv.id}>
                          {cv.title || cv.originalFileName || cv.id}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("learning.wizard.context.role")}>
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      className={inputClass}
                    >
                      {IT_ROLES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("learning.wizard.context.level")}>
                    <select
                      value={level}
                      onChange={(event) =>
                        setLevel(event.target.value as typeof level)
                      }
                      className={inputClass}
                    >
                      <option value="intern">Intern</option>
                      <option value="fresher">Fresher</option>
                      <option value="mid">Mid</option>
                    </select>
                  </Field>
                </div>
              ) : null}
              {!intent ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  {t("learning.wizard.context.missingGoal")}
                </div>
              ) : null}
              <WizardFooter
                onBack={() => setStep("goal")}
                onNext={createDraft}
                busy={isBusy}
                disabled={!intent}
                nextLabel={
                  intent === "JD_APPLICATION" && !initialMatchId
                    ? t("learning.wizard.goDiagnosis")
                    : undefined
                }
              />
            </div>
          ) : null}

          {step === "priorities" && draft ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t("learning.wizard.priorities.selectedTitle")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("learning.wizard.priorities.dragHint")}
                  </p>
                </div>
                {selectedCandidates.length === 0 ? (
                  <p className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-800">
                    {t("learning.wizard.priorities.empty")}
                  </p>
                ) : (
                  <SortableContext
                    items={orderedSkills}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {selectedCandidates.map((candidate, index) => (
                        <SortableSkillRow
                          key={candidate.skill_canonical}
                          candidate={candidate}
                          index={index}
                          onRemove={removeSkill}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
                <DragOverlay dropAnimation={null}>
                  {activeSkill ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                      <SkillRowPreview
                        candidate={draft.candidate_skills.find(
                          (candidate) => candidate.skill_canonical === activeSkill,
                        )}
                        index={Math.max(0, orderedSkills.indexOf(activeSkill))}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </div>
              {ignoredCandidates.length > 0 ? (
                <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {t("learning.wizard.priorities.ignoredTitle")}
                  </h3>
                  <div className="mt-3 space-y-2">
                    {ignoredCandidates.map((candidate) => (
                      <div
                        key={candidate.skill_canonical}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-700">
                            {candidate.display_name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {candidate.rationale}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => restoreSkill(candidate.skill_canonical)}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
                        >
                          {t("learning.wizard.priorities.restore")}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              <WizardFooter
                onBack={() => setStep("context")}
                onNext={() => setStep("schedule")}
                disabled={selectedCandidates.length === 0}
              />
            </DndContext>
          ) : null}
          {step === "schedule" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="font-semibold text-sky-950">
                  {t("learning.wizard.schedule.flexibleTitle")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-sky-800">
                  {t("learning.wizard.schedule.flexibleBody")}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("learning.wizard.schedule.startDate")}>
                  <input
                    type="date"
                    value={startDate}
                    min={today()}
                    onChange={(event) => setStartDate(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("learning.wizard.schedule.daysPerWeek")}>
                  <div className="grid grid-cols-7 gap-2">
                    {STUDY_DAY_OPTIONS.map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setStudyDaysPerWeek(days)}
                        className={choiceClass(studyDaysPerWeek === days)}
                        aria-label={t(
                          "learning.wizard.schedule.daysPerWeekOption",
                          { count: days },
                        )}
                      >
                        {days}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <p className="text-sm text-slate-500">
                {t("learning.wizard.schedule.sessionHint")}
              </p>
              <WizardFooter
                onBack={() => setStep("priorities")}
                onNext={saveScheduleAndPreview}
                busy={isBusy}
                nextLabel={t("learning.wizard.previewAction")}
              />
            </div>
          ) : null}

          {step === "preview" && preview ? (
            <div className="space-y-5">
              <TrackSummary preview={preview} />
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric
                  label={t("learning.wizard.preview.modules")}
                  value={preview.modules.length}
                />
                <Metric
                  label={t("learning.wizard.preview.totalSessions")}
                  value={preview.sessions.length}
                />
                <Metric
                  label={t("learning.wizard.preview.cadence")}
                  value={t("learning.wizard.preview.daysPerWeek", {
                    count: preview.cadence.study_days_per_week,
                  })}
                />
                <Metric
                  label={t("learning.wizard.preview.estimatedCompletion")}
                  value={formatDisplayDate(
                    preview.estimated_completion_date,
                    i18n.language,
                    t,
                  )}
                />
              </div>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {preview.modules.map((module) => (
                  <div
                    key={module.skill_canonical}
                    className="rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="font-medium text-slate-800">
                          {module.rank}. {module.display_name}
                        </span>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Quick-win {module.quick_win_score}/100 ·{" "}
                          {t(
                            `learning.wizard.scope.${module.scope_status.toLowerCase()}`,
                          )}
                        </p>
                      </div>
                      <span
                        className={
                          module.feasibility === "FEASIBLE"
                            ? "text-xs font-semibold text-emerald-600"
                            : "text-xs font-semibold text-amber-600"
                        }
                      >
                        {t(
                          `learning.wizard.preview.${module.feasibility.toLowerCase()}`,
                        )}
                      </span>
                    </div>
                    <LessonOutline lessons={module.lessons} />
                    {module.resources.length > 0 ? (
                      <fieldset className="mt-3 space-y-2">
                        <legend className="text-xs font-semibold text-slate-500">
                          {t("learning.wizard.preview.resources")}
                        </legend>
                        {module.resources.map((resource) => (
                          <label
                            key={resource.id}
                            className="flex cursor-pointer items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={(
                                selectedResources[module.skill_canonical] ?? []
                              ).includes(resource.id)}
                              onChange={() =>
                                toggleResource(
                                  module.skill_canonical,
                                  resource.id,
                                )
                              }
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">
                                {resource.title}
                              </span>
                              <span className="text-xs text-slate-500">
                                {resource.resource_role === "PRIMARY"
                                  ? t("learning.wizard.preview.primaryResource")
                                  : t(
                                      "learning.wizard.preview.supplementaryResource",
                                    )}
                                {" · "}
                                {formatResourceDuration(resource, t)}
                                {resource.provider
                                  ? ` · ${resource.provider}`
                                  : ""}
                              </span>
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500">{preview.summary}</p>
              <WizardFooter
                onBack={() => setStep("schedule")}
                onNext={generate}
                busy={isBusy}
                nextLabel={t("learning.wizard.generateAction")}
              />
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}
        </main>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary";
const choiceClass = (active: boolean) =>
  `rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${active ? "border-primary bg-primary text-white" : "border-slate-200 text-slate-600 hover:border-primary/40"}`;

type CandidateSkill = LearningRoadmapDraft["candidate_skills"][number];

function SortableSkillRow({
  candidate,
  index,
  onRemove,
}: {
  candidate: CandidateSkill;
  index: number;
  onRemove: (canonical: string) => void;
}) {
  const { t } = useTranslation("common");
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.skill_canonical });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 ${
        isDragging ? "z-10 shadow-xl ring-2 ring-primary/20" : ""
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t("learning.wizard.priorities.drag", {
          skill: candidate.display_name,
        })}
        className="cursor-grab rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      <SkillRowPreview candidate={candidate} index={index} />
      <button
        type="button"
        onClick={() => onRemove(candidate.skill_canonical)}
        aria-label={t("learning.wizard.priorities.remove", {
          skill: candidate.display_name,
        })}
        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function SkillRowPreview({
  candidate,
  index,
}: {
  candidate?: CandidateSkill;
  index: number;
}) {
  if (!candidate) return null;
  return (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{candidate.display_name}</p>
        <p className="truncate text-xs text-slate-500">{candidate.rationale}</p>
      </div>
    </>
  );
}
function GoalCard({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 p-6 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
    >
      <Sparkles className="mb-4 h-6 w-6 text-primary" />
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function WizardFooter({
  onBack,
  onNext,
  busy = false,
  disabled = false,
  nextLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  busy?: boolean;
  disabled?: boolean;
  nextLabel?: string;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-5">
      <Button variant="ghost" onClick={onBack} disabled={busy}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("learning.wizard.back")}
      </Button>
      <Button onClick={onNext} disabled={busy || disabled}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {nextLabel ?? t("learning.wizard.next")}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TrackSummary({ preview }: { preview: LearningRoadmapPreview }) {
  const { t } = useTranslation("common");
  const fastTrack = preview.learning_track === "FAST_TRACK";
  return (
    <div
      className={`rounded-2xl border p-4 ${
        fastTrack
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : "border-violet-200 bg-violet-50 text-violet-900"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">
          {fastTrack
            ? t("learning.wizard.track.fastTitle")
            : t("learning.wizard.track.foundationTitle")}
        </p>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
          {t("learning.wizard.track.sessionSummary", {
            count: preview.sessions.length,
            minutes: 60,
          })}
        </span>
      </div>
      <p className="mt-1 text-sm opacity-80">
        {fastTrack
          ? t("learning.wizard.track.fastBody")
          : t("learning.wizard.track.foundationBody")}
      </p>
    </div>
  );
}

function LessonOutline({
  lessons,
}: {
  lessons: LearningRoadmapPreview["modules"][number]["lessons"];
}) {
  const { t } = useTranslation("common");
  if (lessons.length === 0) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      {lessons.map((lesson) => {
        const included = lesson.scope_status === "INCLUDED";
        return (
          <div
            key={lesson.id}
            className={`flex items-start gap-3 rounded-lg px-3 py-2 ${
              included ? "bg-slate-50" : "bg-amber-50/70 opacity-75"
            }`}
          >
            <span
              className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                lesson.importance === "CORE"
                  ? "bg-sky-100 text-sky-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {lesson.importance}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{lesson.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                {lesson.summary}
              </p>
              {!included ? (
                <p className="mt-1 text-[11px] font-medium text-amber-700">
                  {t("learning.wizard.preview.deferredLesson")}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 text-xs text-slate-500">
              {t("learning.wizard.preview.lessonMinutes", {
                count: lesson.estimated_minutes,
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function messageOf(
  error: unknown,
  translate: (key: string) => string,
): string {
  if (error instanceof Error) {
    return error.message.startsWith("learning.")
      ? translate(error.message)
      : error.message;
  }
  return translate("learning.wizard.errors.generic");
}

function today(): string {
  return formatLocalDate(new Date());
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(
  value: string | null,
  locale: string,
  translate: (key: string) => string,
): string {
  if (!value) return translate("learning.wizard.preview.calculating");
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatResourceDuration(
  resource: LearningPresentedResource,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (resource.duration_kind === "UNKNOWN") {
    return translate("learning.wizard.preview.durationUnknown");
  }
  const minutes = resource.recommended_minutes ?? resource.duration_minutes;
  if (!minutes || minutes <= 0) {
    return translate("learning.wizard.preview.durationUnknown");
  }
  const keyPrefix =
    resource.duration_kind === "EXACT" ? "exact" : "estimated";
  if (minutes < 60) {
    return translate(`learning.wizard.preview.duration.${keyPrefix}Minutes`, {
      minutes,
    });
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder
    ? translate(`learning.wizard.preview.duration.${keyPrefix}HoursMinutes`, {
        hours,
        minutes: remainder,
      })
    : translate(`learning.wizard.preview.duration.${keyPrefix}Hours`, {
        hours,
      });
}
