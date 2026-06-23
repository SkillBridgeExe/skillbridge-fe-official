import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MascotSticker } from "@/components/mascot/MascotSticker";
import type { RoadmapBudgetInput } from "@/services/learning-roadmap.service";
import type { RoadmapLanguagePref } from "@shared/api";

type WizardStep = "days" | "hours" | "language" | "confirm";

export interface RoadmapWizardAnswers {
  availableDays: number;
  hoursPerWeek: number;
  languagePref: RoadmapLanguagePref;
}

export function createRoadmapBudgetInput(
  answers: RoadmapWizardAnswers,
): Required<RoadmapBudgetInput> {
  return {
    available_days: answers.availableDays,
    hours_per_week: answers.hoursPerWeek,
    language_pref: answers.languagePref,
  };
}

const DAY_OPTIONS = [14, 30, 60];
const HOUR_OPTIONS = [4, 8, 12];
const LANGUAGE_OPTIONS: Array<{ value: RoadmapLanguagePref; labelKey: string }> = [
  { value: "vi", labelKey: "roadmapWizard.languageVi" },
  { value: "en", labelKey: "roadmapWizard.languageEn" },
  { value: "both", labelKey: "roadmapWizard.languageBoth" },
];

interface MascotRoadmapWizardProps {
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (body: Required<RoadmapBudgetInput>) => void;
}

export function MascotRoadmapWizard({
  isPending = false,
  onClose,
  onSubmit,
}: MascotRoadmapWizardProps) {
  const { t } = useTranslation("diagnosis");
  const [step, setStep] = useState<WizardStep>("days");
  const [answers, setAnswers] = useState<RoadmapWizardAnswers>({
    availableDays: 30,
    hoursPerWeek: 8,
    languagePref: "vi",
  });

  // Local state for custom input fields
  const [customDays, setCustomDays] = useState<string>("");
  const [customHours, setCustomHours] = useState<string>("");

  const [daysError, setDaysError] = useState<string | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);

  // Hover state for the submit button to play with mascot stickers
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);

  // Disable background scrolling when drawer/modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const submit = () => {
    onSubmit(createRoadmapBudgetInput(answers));
  };

  const question =
    step === "days"
      ? t("roadmapWizard.daysQuestion")
      : step === "hours"
        ? t("roadmapWizard.hoursQuestion")
        : step === "language"
          ? t("roadmapWizard.languageQuestion")
          : t("roadmapWizard.confirmQuestion", {
              days: answers.availableDays,
              hours: answers.hoursPerWeek,
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

  const stepNumber = step === "days" ? 1 : step === "hours" ? 2 : step === "language" ? 3 : 4;
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
              {[1, 2, 3, 4].map((i) => {
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
                {t("roadmapWizard.step", { current: stepNumber, total: 4 })}
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
                {step === "days" && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {t("roadmapWizard.quickChoice")}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {DAY_OPTIONS.map((days) => (
                          <ChoiceButton
                            key={days}
                            active={answers.availableDays === days && !customDays}
                            onClick={() => {
                              setAnswers((current) => ({ ...current, availableDays: days }));
                              setCustomDays("");
                              setDaysError(null);
                              setStep("hours");
                            }}
                          >
                            {t("roadmapWizard.daysOption", { count: days })}
                          </ChoiceButton>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5 border-t border-dashed border-primary/15 space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        {t("roadmapWizard.orCustomDays")}
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={customDays}
                            onChange={(e) => {
                              setCustomDays(e.target.value);
                              setDaysError(null);
                            }}
                            placeholder={t("roadmapWizard.customDaysPlaceholder")}
                            className="w-full px-4 py-3 border border-primary/20 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary font-bold text-slate-700 shadow-sm no-spinner transition-all duration-200"
                          />
                          <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                            {t("roadmapWizard.daysSuffix")}
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            const val = parseInt(customDays, 10);
                            if (isNaN(val) || val <= 0) {
                              setDaysError(t("roadmapWizard.invalidNumber"));
                              return;
                            }
                            setAnswers((current) => ({ ...current, availableDays: val }));
                            setStep("hours");
                          }}
                          disabled={!customDays}
                          className="rounded-2xl px-6 text-sm font-bold bg-primary hover:bg-primary/95 hover:scale-[1.02] active:scale-[0.98] text-white h-11 transition-all"
                        >
                          {t("roadmapWizard.next")}
                        </Button>
                      </div>
                      {daysError && (
                        <p className="text-xs text-red-500 font-bold mt-1">
                          {daysError}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {step === "hours" && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {t("roadmapWizard.quickChoice")}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {HOUR_OPTIONS.map((hours) => (
                          <ChoiceButton
                            key={hours}
                            active={answers.hoursPerWeek === hours && !customHours}
                            onClick={() => {
                              setAnswers((current) => ({ ...current, hoursPerWeek: hours }));
                              setCustomHours("");
                              setHoursError(null);
                              setStep("language");
                            }}
                          >
                            {t("roadmapWizard.hoursOption", { count: hours })}
                          </ChoiceButton>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5 border-t border-dashed border-primary/15 space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        {t("roadmapWizard.orCustomHours")}
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="1"
                            max="168"
                            value={customHours}
                            onChange={(e) => {
                              setCustomHours(e.target.value);
                              setHoursError(null);
                            }}
                            placeholder={t("roadmapWizard.customHoursPlaceholder")}
                            className="w-full px-4 py-3 border border-primary/20 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary font-bold text-slate-700 shadow-sm no-spinner transition-all duration-200"
                          />
                          <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                            {t("roadmapWizard.hoursSuffix")}
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            const val = parseInt(customHours, 10);
                            if (isNaN(val) || val <= 0 || val > 168) {
                              setHoursError(t("roadmapWizard.invalidHours"));
                              return;
                            }
                            setAnswers((current) => ({ ...current, hoursPerWeek: val }));
                            setStep("language");
                          }}
                          disabled={!customHours}
                          className="rounded-2xl px-6 text-sm font-bold bg-primary hover:bg-primary/95 hover:scale-[1.02] active:scale-[0.98] text-white h-11 transition-all"
                        >
                          {t("roadmapWizard.next")}
                        </Button>
                      </div>
                      {hoursError && (
                        <p className="text-xs text-red-500 font-bold mt-1">
                          {hoursError}
                        </p>
                      )}
                    </div>
                  </div>
                )}

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
                      <span className="rounded-full bg-sky-50/50 px-4 py-2 border border-primary/20">
                        {t("roadmapWizard.daysSummary", { count: answers.availableDays })}
                      </span>
                      <span className="rounded-full bg-sky-50/50 px-4 py-2 border border-primary/20">
                        {t("roadmapWizard.hoursSummary", { count: answers.hoursPerWeek })}
                      </span>
                      <span className="rounded-full bg-indigo-50 text-indigo-600 px-4 py-2 border border-indigo-100">
                        {t(`roadmapWizard.language.${answers.languagePref}`)}
                      </span>
                    </div>
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
                  {step !== "days" && step !== "confirm" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (step === "hours") setStep("days");
                        if (step === "language") setStep("hours");
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-primary transition flex items-center gap-1"
                    >
                      &larr; {t("roadmapWizard.back")}
                    </button>
                  )}
                  {step === "confirm" && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep("days");
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
