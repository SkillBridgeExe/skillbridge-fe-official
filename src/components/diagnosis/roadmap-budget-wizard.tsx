import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, GripVertical, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MascotSticker } from "@/components/mascot/MascotSticker";
import type { RoadmapBudgetInput } from "@/services/learning-roadmap.service";
import type { RoadmapLanguagePref, RoadmapSkillOptionDto } from "@shared/api";
import { cn } from "@/lib/utils";

type WizardStep = "language" | "confirm";

export interface RoadmapWizardAnswers {
  availableDays: number;
  hoursPerWeek: number;
  studyHoursPerDay: number;
  studyDaysPerWeek: number;
  languagePref: RoadmapLanguagePref;
  selectedSkillOrder: string[];
  excludedSkills: string[];
  selectedResources: Record<string, string[]>;
}

const MODULE_SESSION_MINUTES = 120;

function subjectsPerDayFromHours(hours: number): number {
  return Math.max(1, Math.floor(hours / 2));
}

export function createRoadmapBudgetInput(
  answers: RoadmapWizardAnswers,
): Required<RoadmapBudgetInput> {
  const subjectsPerDay = subjectsPerDayFromHours(answers.studyHoursPerDay);
  const studyDaysPerWeek = Math.max(1, Math.min(7, Math.floor(answers.studyDaysPerWeek)));
  return {
    available_days: answers.availableDays,
    hours_per_week: subjectsPerDay * 2 * studyDaysPerWeek,
    minutes_per_session: MODULE_SESSION_MINUTES,
    sessions_per_week: subjectsPerDay * studyDaysPerWeek,
    study_days_per_week: studyDaysPerWeek,
    language_pref: answers.languagePref,
    selected_skill_order: answers.selectedSkillOrder,
    excluded_skills: answers.excludedSkills,
    selected_resources: answers.selectedResources,
    translate_display: answers.languagePref === "vi",
  };
}

const LANGUAGE_OPTIONS: Array<{ value: RoadmapLanguagePref; labelKey: string }> = [
  { value: "vi", labelKey: "roadmapWizard.languageVi" },
  { value: "en", labelKey: "roadmapWizard.languageEn" },
  { value: "both", labelKey: "roadmapWizard.languageBoth" },
];

interface MascotRoadmapWizardProps {
  isPending?: boolean;
  isOptionsLoading?: boolean;
  options?: RoadmapSkillOptionDto[];
  onClose: () => void;
  onSubmit: (body: Required<RoadmapBudgetInput>) => void;
}

export function MascotRoadmapWizard({
  isPending = false,
  isOptionsLoading = false,
  options = [],
  onClose,
  onSubmit,
}: MascotRoadmapWizardProps) {
  const { t } = useTranslation("diagnosis");
  const [step, setStep] = useState<WizardStep>("language");
  const [answers, setAnswers] = useState<RoadmapWizardAnswers>({
    availableDays: 30,
    hoursPerWeek: 28,
    studyHoursPerDay: 4,
    studyDaysPerWeek: 5,
    languagePref: "vi",
    selectedSkillOrder: [],
    excludedSkills: [],
    selectedResources: {},
  });

  // Hover state for the submit button to play with mascot stickers
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);

  // Disable background scrolling when drawer/modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (options.length === 0 || answers.selectedSkillOrder.length > 0) return;
    setAnswers((current) => ({
      ...current,
      selectedSkillOrder: options
        .filter((option) => option.selected_by_default)
        .map((option) => option.skill_canonical),
      excludedSkills: options
        .filter((option) => !option.selected_by_default)
        .map((option) => option.skill_canonical),
      selectedResources: Object.fromEntries(
        options
          .filter((option) => option.selected_by_default)
          .map((option) => [
            option.skill_canonical,
            option.resources?.map((resource) => resource.id) ?? [],
          ]),
      ),
    }));
  }, [answers.selectedSkillOrder.length, options]);

  const submit = () => {
    onSubmit(createRoadmapBudgetInput(answers));
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const selectedSkills = new Set(answers.selectedSkillOrder);
  const orderedOptions = [
    ...answers.selectedSkillOrder
      .map((skill) => options.find((option) => option.skill_canonical === skill))
      .filter((option): option is RoadmapSkillOptionDto => Boolean(option)),
    ...options.filter((option) => !selectedSkills.has(option.skill_canonical)),
  ];

  const toggleSkill = (skill: string) => {
    setAnswers((current) => {
      const isSelected = current.selectedSkillOrder.includes(skill);
      return {
        ...current,
        selectedSkillOrder: isSelected
          ? current.selectedSkillOrder.filter((item) => item !== skill)
          : [...current.selectedSkillOrder, skill],
        excludedSkills: isSelected
          ? [...new Set([...current.excludedSkills, skill])]
          : current.excludedSkills.filter((item) => item !== skill),
        selectedResources: isSelected
          ? Object.fromEntries(
              Object.entries(current.selectedResources).filter(([key]) => key !== skill),
            )
          : {
              ...current.selectedResources,
              [skill]:
                options
                  .find((option) => option.skill_canonical === skill)
                  ?.resources?.map((resource) => resource.id) ?? [],
            },
      };
    });
  };

  const reorderSelectedSkills = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setAnswers((current) => {
      const oldIndex = current.selectedSkillOrder.indexOf(String(active.id));
      const newIndex = current.selectedSkillOrder.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return current;
      return {
        ...current,
        selectedSkillOrder: arrayMove(current.selectedSkillOrder, oldIndex, newIndex),
      };
    });
  };

  const question =
    step === "language"
      ? t("roadmapWizard.languageQuestion")
      : t("roadmapWizard.confirmQuestion", {
          language: t(`roadmapWizard.language.${answers.languagePref}`),
        });

  // Determine MascotSticker animation state
  const mascotState = isPending
    ? "loading"
    : step === "confirm"
      ? (isSubmitHovered ? "love" : "success")
      : "tip";

  // Balance visual sizing to make them all equal at a larger size (around 450px rendered size)
  const mascotSize = mascotState === "love" ? 350 : 450;

  const stepNumber = step === "language" ? 1 : 2;
  const isShifted = mascotState === "success" || mascotState === "love";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      <style>{`
        /* Hide spin-button for Chrome, Safari, Edge, Opera */
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        /* Hide spin-button for Firefox */
        .no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>
      {/* Dark Blurred Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md"
      />

      {/* Decorative glowing blobs in background */}
      <div 
        className="absolute top-[20%] left-[15%] w-72 h-72 rounded-full bg-primary/15 blur-[90px] pointer-events-none animate-pulse" 
        style={{ animationDuration: "8s" }} 
      />
      <div 
        className="absolute bottom-[20%] right-[15%] w-96 h-96 rounded-full bg-indigo-500/15 blur-[110px] pointer-events-none animate-pulse" 
        style={{ animationDuration: "12s" }} 
      />

      {/* Floating Close Button */}
      <button
        type="button"
        onClick={onClose}
        disabled={isPending}
        className="fixed top-6 right-6 z-50 rounded-full bg-white/10 p-3 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white hover:scale-105 active:scale-95 border border-white/10 shadow-lg"
        aria-label={t("roadmapWizard.close")}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Main Layout Container */}
      <div className="relative z-50 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 w-full max-w-5xl mx-auto py-10">
        {/* Floating Mascot (Dolphin) - Right side on Desktop */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 180 }}
          className={`order-1 md:order-2 shrink-0 select-none drop-shadow-[0_25px_50px_rgba(56,130,246,0.4)] w-[300px] h-[300px] md:w-[480px] md:h-[480px] flex items-center justify-center transition-all duration-300 ${isShifted ? "md:-translate-x-14" : ""}`}
        >
          <MascotSticker state={mascotState} size={mascotSize} interactive={false} />
        </motion.div>

        {/* Large Floating Speech Bubble - Left/Center side on Desktop */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.05 }}
          className="order-2 md:order-1 flex-1 w-full max-w-2xl"
        >
          {/* Looping floating animation wrapper */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="bg-white border border-primary/20 rounded-[32px] p-6 md:p-10 shadow-[0_32px_60px_-15px_rgba(56,130,246,0.14),0_16px_32px_-10px_rgba(0,0,0,0.06)] relative"
          >
            {/* Right pointer arrow for desktop (rotated square matching card styling) */}
            <div className="hidden md:block absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-t border-r border-primary/20 rotate-45" />
            
            {/* Top pointer arrow for mobile */}
            <div className="block md:hidden absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-primary/20 rotate-45" />

            {/* Stepper Progress Dots */}
            <div className="flex items-center gap-1.5 mb-6">
              {[1, 2].map((i) => {
                const active = i <= stepNumber;
                return (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      active ? "bg-primary w-6" : "bg-slate-100 w-2"
                    }`}
                  />
                );
              })}
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 ml-2">
                {t("roadmapWizard.step", { current: stepNumber, total: 2 })}
              </span>
            </div>

          {/* Question text & interactions with sliding animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Question Text */}
              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
                  {t("roadmapWizard.title")}
                </p>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight leading-snug">
                  {question}
                </h3>
              </div>

              {/* Options & Inputs */}
              <div className="space-y-6">
                {step === "language" && (
                  <div className="space-y-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {t("roadmapWizard.selectLanguage")}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {LANGUAGE_OPTIONS.map((option) => (
                        <ChoiceButton
                          key={option.value}
                          active={answers.languagePref === option.value}
                          onClick={() => {
                            setAnswers((current) => ({ ...current, languagePref: option.value }));
                            setStep("confirm");
                          }}
                        >
                          {t(option.labelKey)}
                        </ChoiceButton>
                      ))}
                    </div>
                  </div>
                )}

                {step === "confirm" && (
                  <div className="flex flex-col gap-5 pt-2">
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                      <span className="rounded-full bg-indigo-50 text-indigo-600 px-4 py-2 border border-indigo-100">
                        {t(`roadmapWizard.language.${answers.languagePref}`)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
                      <label className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-500">
                          {t("roadmapWizard.studyHoursPerDay", { defaultValue: "Study hours/day" })}
                        </span>
                        <input
                          type="number"
                          min={2}
                          max={10}
                          step={1}
                          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 outline-none focus:border-primary"
                          value={answers.studyHoursPerDay}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              studyHoursPerDay: Number(event.target.value) || 4,
                            }))
                          }
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-500">
                          {t("roadmapWizard.studyDaysPerWeek", { defaultValue: "Study days/week" })}
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={7}
                          step={1}
                          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 outline-none focus:border-primary"
                          value={answers.studyDaysPerWeek}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              studyDaysPerWeek: Number(event.target.value) || 5,
                            }))
                          }
                        />
                      </label>
                      <p className="col-span-2 mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
                        {t("roadmapWizard.studyHoursHint", {
                          defaultValue:
                            "Each subject is planned as a 2-hour module per study day. 4h/day opens 2 subjects; 6h/day opens 3 subjects.",
                        })}
                      </p>
                    </div>
                    {isOptionsLoading ? (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-400">
                        {t("roadmapWizard.loadingOptions", { defaultValue: "Loading skills..." })}
                      </div>
                    ) : orderedOptions.length > 0 ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={reorderSelectedSkills}
                      >
                        <SortableContext
                          items={answers.selectedSkillOrder}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                            {orderedOptions.map((option) => {
                              const selected = selectedSkills.has(option.skill_canonical);
                              return selected ? (
                                <SortableSkillOption
                                  key={option.skill_canonical}
                                  option={option}
                                  selected={selected}
                                  onToggle={() => toggleSkill(option.skill_canonical)}
                                />
                              ) : (
                                <SkillOptionCard
                                  key={option.skill_canonical}
                                  option={option}
                                  selected={selected}
                                  onToggle={() => toggleSkill(option.skill_canonical)}
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : null}
                    <Button
                      onClick={submit}
                      disabled={isPending}
                      onMouseEnter={() => setIsSubmitHovered(true)}
                      onMouseLeave={() => setIsSubmitHovered(false)}
                      className="w-full h-13 rounded-2xl bg-primary text-base font-extrabold text-white hover:bg-primary/95 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/25 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        t("roadmap.generating")
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 animate-bounce" />
                          {t("roadmapWizard.submit")}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Back button or reset/edit button */}
                <div className="flex justify-between items-center pt-2">
                  {step === "confirm" && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep("language");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-primary transition"
                    >
                      {t("roadmapWizard.edit")} <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
      </div>
    </div>
  );
}

function SortableSkillOption({
  option,
  selected,
  onToggle,
}: {
  option: RoadmapSkillOptionDto;
  selected: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation("diagnosis");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.skill_canonical });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "z-10 opacity-90")}
    >
      <SkillOptionCard
        option={option}
        selected={selected}
        onToggle={onToggle}
        dragHandle={
          <button
            type="button"
            aria-label={t("roadmapWizard.dragSkill", {
              skill: option.display_name,
              defaultValue: `Drag ${option.display_name}`,
            })}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary/70 hover:bg-white hover:text-primary active:scale-95"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}

function SkillOptionCard({
  option,
  selected,
  onToggle,
  dragHandle,
}: {
  option: RoadmapSkillOptionDto;
  selected: boolean;
  onToggle: () => void;
  dragHandle?: ReactNode;
}) {
  return (
    <div
      data-testid={`roadmap-skill-${option.skill_canonical}`}
      data-selected={selected ? "true" : "false"}
      className={cn(
        "flex min-h-14 items-center gap-2 rounded-2xl border p-2 transition-colors",
        selected
          ? "border-primary/45 bg-primary/10 shadow-sm"
          : "border-slate-100 bg-slate-50/70 hover:border-primary/20 hover:bg-primary/5",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 py-1 text-left"
        aria-pressed={selected}
      >
        <span
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-white transition-colors",
            selected ? "border-primary bg-primary" : "border-slate-300 bg-white",
          )}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-xs font-extrabold",
              selected ? "text-slate-800" : "text-slate-600",
            )}
          >
            {option.display_name}
          </span>
          <span className="block text-[10px] font-bold text-slate-400">
            {option.estimated_hours}h
          </span>
        </span>
      </button>
      {selected && dragHandle}
    </div>
  );
}

function ChoiceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border-2 px-4 py-3 text-xs md:text-sm font-extrabold transition-all duration-200 active:scale-[0.98] select-none text-center leading-normal hover:scale-[1.03] hover:shadow-sm",
        active
          ? "border-transparent bg-primary text-white shadow-lg shadow-primary/10"
          : "border-transparent bg-primary/15 text-primary hover:bg-primary/25",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
