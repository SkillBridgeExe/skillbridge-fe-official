import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  type LearningLanguagePreference,
  type LearningRoadmapDraft,
  type LearningRoadmapIntent,
  type LearningRoadmapPreview,
} from "@/services/learning-roadmaps-v2.service";
import type { CvListItemDto } from "@shared/api";
import {
  buildPrioritySelection,
  buildScheduleDraft,
} from "./learning-roadmap-wizard-state";

type Step = "goal" | "context" | "priorities" | "schedule" | "preview";

interface LearningRoadmapWizardProps {
  initialMatchId?: string | null;
  onClose: () => void;
  onGenerated: (roadmap: ActiveLearningRoadmap) => void;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function LearningRoadmapWizard({
  initialMatchId,
  onClose,
  onGenerated,
}: LearningRoadmapWizardProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(initialMatchId ? "context" : "goal");
  const [intent, setIntent] = useState<LearningRoadmapIntent | null>(
    initialMatchId ? "JD_APPLICATION" : null,
  );
  const [language, setLanguage] = useState<LearningLanguagePreference>("both");
  const [role, setRole] = useState("frontend_developer");
  const [level, setLevel] = useState<"intern" | "fresher" | "mid">("fresher");
  const [cvs, setCvs] = useState<CvListItemDto[]>([]);
  const [cvId, setCvId] = useState("");
  const [draft, setDraft] = useState<LearningRoadmapDraft | null>(null);
  const [orderedSkills, setOrderedSkills] = useState<string[]>([]);
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [startTime, setStartTime] = useState("19:00");
  const [sessionMinutes, setSessionMinutes] = useState<30 | 45 | 60 | 90>(60);
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [deadline, setDeadline] = useState(defaultDeadline);
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
        if (!cancelled) setError(messageOf(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [intent]);

  const stepIndex = [
    "goal",
    "context",
    "priorities",
    "schedule",
    "preview",
  ].indexOf(step);
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
          ? { intent, cv_match_id: initialMatchId!, language_pref: language }
          : {
              intent,
              cv_id: cvId,
              target_role: role,
              target_level: level,
              language_pref: language,
            },
      );
      setDraft(created);
      setOrderedSkills(
        created.candidate_skills.map((candidate) => candidate.skill_canonical),
      );
      setStep("priorities");
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setIsBusy(false);
    }
  };

  const saveScheduleAndPreview = async () => {
    if (!draft) return;
    setIsBusy(true);
    setError(null);
    try {
      const schedule = buildScheduleDraft({
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "Asia/Ho_Chi_Minh",
        deadline,
        sessionMinutes,
        weekdays,
        startTime,
        slotMinutes,
      });
      const updated = await updateLearningRoadmapDraft(draft.id, {
        expected_revision: draft.revision,
        selected_priorities: buildPrioritySelection(
          draft.candidate_skills,
          orderedSkills,
        ),
        schedule,
      });
      const nextPreview = await previewLearningRoadmap(
        updated.id,
        updated.revision,
      );
      setDraft(updated);
      setPreview(nextPreview);
      setSelectedResources(resourceSelectionFromPreview(nextPreview));
      setResourceSelectionDirty(false);
      setStep("preview");
    } catch (cause) {
      setError(messageOf(cause));
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
        setSelectedResources(resourceSelectionFromPreview(currentPreview));
        setResourceSelectionDirty(false);
      }

      await generateLearningRoadmap(currentDraft.id, currentPreview.revision);
      onGenerated(await getActiveLearningRoadmap(currentDraft.id));
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setIsBusy(false);
    }
  };

  const moveSkill = (index: number, offset: -1 | 1) => {
    setOrderedSkills((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
              {[0, 1, 2, 3, 4].map((index) => (
                <span
                  key={index}
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
              <Field label={t("learning.wizard.context.language")}>
                <div className="grid grid-cols-3 gap-2">
                  {(["vi", "en", "both"] as const).map((value) => (
                    <button
                      key={value}
                      onClick={() => setLanguage(value)}
                      className={choiceClass(language === value)}
                    >
                      {t(`learning.wizard.languages.${value}`)}
                    </button>
                  ))}
                </div>
              </Field>
              <WizardFooter
                onBack={() => setStep("goal")}
                onNext={createDraft}
                busy={isBusy}
                nextLabel={
                  intent === "JD_APPLICATION" && !initialMatchId
                    ? t("learning.wizard.goDiagnosis")
                    : undefined
                }
              />
            </div>
          ) : null}

          {step === "priorities" && draft ? (
            <div className="space-y-4">
              {selectedCandidates.length === 0 ? (
                <p className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800">
                  {t("learning.wizard.noGaps")}
                </p>
              ) : (
                selectedCandidates.map((candidate, index) => (
                  <div
                    key={candidate.skill_canonical}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {candidate.display_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {candidate.rationale}
                      </p>
                    </div>
                    <button
                      onClick={() => moveSkill(index, -1)}
                      disabled={index === 0}
                      className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveSkill(index, 1)}
                      disabled={index === selectedCandidates.length - 1}
                      className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
              <WizardFooter
                onBack={() => setStep("context")}
                onNext={() => setStep("schedule")}
                disabled={selectedCandidates.length === 0}
              />
            </div>
          ) : null}

          {step === "schedule" ? (
            <div className="space-y-5">
              <Field label={t("learning.wizard.schedule.days")}>
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() =>
                        setWeekdays((current) =>
                          current.includes(day)
                            ? current.filter((item) => item !== day)
                            : [...current, day],
                        )
                      }
                      className={choiceClass(weekdays.includes(day))}
                    >
                      {t(`learning.wizard.weekdays.${day}`)}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-4 md:grid-cols-4">
                <Field label={t("learning.wizard.schedule.time")}>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("learning.wizard.schedule.session")}>
                  <select
                    value={sessionMinutes}
                    onChange={(event) =>
                      setSessionMinutes(
                        Number(event.target.value) as typeof sessionMinutes,
                      )
                    }
                    className={inputClass}
                  >
                    {[30, 45, 60, 90].map((value) => (
                      <option key={value} value={value}>
                        {value} min
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("learning.wizard.schedule.slot")}>
                  <select
                    value={slotMinutes}
                    onChange={(event) =>
                      setSlotMinutes(Number(event.target.value))
                    }
                    className={inputClass}
                  >
                    {[30, 60, 90, 120].map((value) => (
                      <option key={value} value={value}>
                        {value} min
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("learning.wizard.schedule.deadline")}>
                  <input
                    type="date"
                    value={deadline}
                    min={today()}
                    onChange={(event) => setDeadline(event.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
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
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label={t("learning.wizard.preview.modules")}
                  value={preview.modules.length}
                />
                <Metric
                  label={t("learning.wizard.preview.capacity")}
                  value={`${Math.round(preview.capacity_minutes / 60)}h`}
                />
                <Metric
                  label={t("learning.wizard.preview.scheduled")}
                  value={`${Math.round(preview.scheduled_minutes / 60)}h`}
                />
              </div>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {preview.modules.map((module) => (
                  <div
                    key={module.skill_canonical}
                    className="rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-800">
                        {module.rank}. {module.display_name}
                      </span>
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
                                {t("learning.wizard.preview.resourceMinutes", {
                                  count: resource.duration_minutes,
                                })}
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

function resourceSelectionFromPreview(
  preview: LearningRoadmapPreview,
): Record<string, string[]> {
  return Object.fromEntries(
    preview.modules.map((module) => [
      module.skill_canonical,
      module.resources.map((resource) => resource.id),
    ]),
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary";
const choiceClass = (active: boolean) =>
  `rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${active ? "border-primary bg-primary text-white" : "border-slate-200 text-slate-600 hover:border-primary/40"}`;

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

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Could not continue. Please try again.";
}

function today(): string {
  return formatLocalDate(new Date());
}

function defaultDeadline(): string {
  const date = new Date();
  date.setDate(date.getDate() + 56);
  return formatLocalDate(date);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
