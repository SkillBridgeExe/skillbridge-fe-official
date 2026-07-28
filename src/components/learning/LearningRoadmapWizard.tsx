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
  const { t } = useTranslation("common");
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
        setSelectedResources(buildResourceSelection(currentPreview));
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
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="font-semibold text-sky-950">Lịch học linh hoạt</p>
                <p className="mt-1 text-sm leading-relaxed text-sky-800">
                  Bạn chỉ cần chọn ngày bắt đầu và số ngày muốn học mỗi tuần.
                  SkillBridge sẽ dự kiến ngày hoàn thành; không đặt deadline và
                  không ép giờ học cố định.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ngày bắt đầu">
                  <input
                    type="date"
                    value={startDate}
                    min={today()}
                    onChange={(event) => setStartDate(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Số ngày học mỗi tuần">
                  <div className="grid grid-cols-7 gap-2">
                    {STUDY_DAY_OPTIONS.map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setStudyDaysPerWeek(days)}
                        className={choiceClass(studyDaysPerWeek === days)}
                        aria-label={`${days} ngày mỗi tuần`}
                      >
                        {days}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <p className="text-sm text-slate-500">
                Mỗi buổi được thiết kế trong khoảng 60 phút. Bạn vẫn có thể học
                sớm hơn hoặc xem lại bất kỳ bài nào đã mở.
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
                  label="Tổng số buổi"
                  value={preview.sessions.length}
                />
                <Metric
                  label="Nhịp học"
                  value={`${preview.cadence.study_days_per_week} ngày/tuần`}
                />
                <Metric
                  label="Dự kiến hoàn thành"
                  value={formatDisplayDate(preview.estimated_completion_date)}
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
                          {scopeLabel(module.scope_status)}
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
                                  ? "Tài liệu chính"
                                  : "Tài liệu bổ trợ"}
                                {" · "}
                                {formatResourceDuration(resource)}
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
          {fastTrack ? "Lộ trình cấp tốc" : "Lộ trình nền tảng"}
        </p>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
          {preview.sessions.length} buổi · 60 phút/buổi
        </span>
      </div>
      <p className="mt-1 text-sm opacity-80">
        {fastTrack
          ? "Ưu tiên phần cốt lõi có tác động cao để upskill nhanh, không kéo dài lan man."
          : "Giữ đầy đủ kiến thức nền tảng và prerequisite theo nhịp học bạn đã chọn."}
      </p>
    </div>
  );
}

function LessonOutline({
  lessons,
}: {
  lessons: LearningRoadmapPreview["modules"][number]["lessons"];
}) {
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
                  Để học sau · Không đủ quỹ thời gian
                </p>
              ) : null}
            </div>
            <span className="shrink-0 text-xs text-slate-500">
              {lesson.estimated_minutes} phút
            </span>
          </div>
        );
      })}
    </div>
  );
}

function scopeLabel(
  status: LearningRoadmapPreview["modules"][number]["scope_status"],
): string {
  switch (status) {
    case "FULL":
      return "Đầy đủ";
    case "CORE_ONLY":
      return "Phần cốt lõi";
    case "INTRO_ONLY":
      return "Nhập môn";
    case "DEFERRED":
      return "Để học sau";
  }
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Could not continue. Please try again.";
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

function formatDisplayDate(value: string | null): string {
  if (!value) return "Đang tính";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatResourceDuration(resource: LearningPresentedResource): string {
  if (resource.duration_kind === "UNKNOWN") return "Chưa rõ thời lượng";
  const minutes = resource.recommended_minutes ?? resource.duration_minutes;
  if (!minutes || minutes <= 0) return "Chưa rõ thời lượng";
  const prefix = resource.duration_kind === "EXACT" ? "" : "Khoảng ";
  if (minutes < 60) return `${prefix}${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder
    ? `${prefix}${hours} giờ ${remainder} phút`
    : `${prefix}${hours} giờ`;
}
