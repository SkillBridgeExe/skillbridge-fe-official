import { useEffect, useState, lazy, Suspense } from "react";
import Layout from "@/components/layout/Layout";
import { CheckCircle2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { DiagnosisStep1Upload, DiagnosisStep2Review, DiagnosisStep3Results } from "@/components/diagnosis";
import { MascotSticker } from "@/components/mascot/MascotSticker";
import PageLoader from "@/components/common/PageLoader";
import { useEnsureBuilderDraftMutation, useSaveBuilderDraftMutation } from "@/hooks/use-cv-builder";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useAutosaveStore } from "@/store/useAutosaveStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/use-toast";
import type { BuilderSnapshot } from "@/services/cv-builder.service";

const CvBuilderHeader = lazy(() => import("@/components/cv-builder/CvBuilderHeader").then(m => ({ default: m.CvBuilderHeader })));
const CvFormPanel = lazy(() => import("@/components/cv-builder/CvFormPanel").then(m => ({ default: m.CvFormPanel })));
const CvPreviewPanel = lazy(() => import("@/components/cv-builder/CvPreviewPanel").then(m => ({ default: m.CvPreviewPanel })));
const CvSectionNav = lazy(() => import("@/components/cv-builder/CvSectionNav").then(m => ({ default: m.CvSectionNav })));

/* ── Step Indicator Dot ── */
function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
        active ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
        : done  ? "bg-emerald-500 text-white border-emerald-500"
        :         "bg-white text-slate-400 border-slate-200"
      )}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </div>
      <span className={cn("text-[11px] font-semibold whitespace-nowrap", active ? "text-primary" : done ? "text-emerald-600" : "text-slate-400")}>
        {label}
      </span>
    </div>
  );
}

/* ── Main Diagnosis Page ── */
export default function Diagnosis() {
  const { t } = useTranslation("diagnosis");
  const {
    step, isAnalyzing, hasActivatedJdMode, reviewData,
    targetStep,
    setIsFromBuilder, setBuilderCvId, setBuilderCvName, clearBuilderState,
    setStep
  } = useDiagnosisStore();

  const location = useLocation();
  const canUseApi = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.authSource === "api",
  );

  // Handle initialization from builder and mode parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const navState = location.state as { source?: string; cvId?: string } | null;
    const source = params.get("source") || navState?.source;
    const cvId = params.get("cvId") || navState?.cvId;
    const mode = params.get("mode");
    
    if (mode === "builder") {
      setStep("builder");
    } else if (source === "builder") {
      setIsFromBuilder(true);
      if (cvId) setBuilderCvId(cvId);
      // Mocking the builder CV name since we don't have a real backend to fetch it from yet
      setBuilderCvName("Generated_CV.pdf");
      setStep("input");
    } else {
      // User came here without source=builder, e.g. from homepage "Scan my CV"
      // Clear builder state so we don't persist it inappropriately
      clearBuilderState();
      // Reset to input step when navigating fresh (e.g. clicking nav link)
      if (!reviewData) setStep("input");
    }
  }, [location, setIsFromBuilder, setBuilderCvId, setBuilderCvName, clearBuilderState, setStep, reviewData]);

  /* ── Honest elapsed timer ── */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isAnalyzing) { setElapsed(0); return; }
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isAnalyzing]);

  const loadingPhase =
    elapsed < 3 ? t("loading.uploading")
    : elapsed < 10 ? t("loading.parsing")
    : t("loading.scoring");

  const ensureDraftMutation = useEnsureBuilderDraftMutation();
  const saveDraftMutation = useSaveBuilderDraftMutation();
  const { toast } = useToast();

  const getBuilderSnapshot = (state: ReturnType<typeof useCvBuilderStore.getState>): BuilderSnapshot => ({
    fullName: state.fullName,
    email: state.email,
    phone: state.phone,
    location: state.location,
    linkedin: state.linkedin,
    portfolio: state.portfolio,
    github: state.github,
    targetPosition: state.targetPosition,
    summary: state.summary,
    education: state.education,
    experience: state.experience,
    projects: state.projects,
    technicalSkills: state.technicalSkills,
    softSkills: state.softSkills,
    tools: state.tools,
    languages: state.languages,
    certifications: state.certifications,
    cvLanguage: state.cvLanguage,
  });

  useEffect(() => {
    if (step !== "builder") return;

    if (!canUseApi) {
      useAutosaveStore.getState().setSaveStatus("local");
      return;
    }

    const currentDraftId = useCvBuilderStore.getState().draftId;
    if (currentDraftId === null && !ensureDraftMutation.isPending) {
      ensureDraftMutation.mutate(
        { language: useCvBuilderStore.getState().cvLanguage },
        {
          onSuccess: (data) => {
            const builder = useCvBuilderStore.getState();
            builder.setDraftId(data.id);
            useAutosaveStore.getState().setSaveStatus("saved");
            const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
            useAutosaveStore.getState().setLastSavedTime(timeStr);

            // Seeded từ CV đã chẩn đoán → đẩy ngay nội dung parse vào draft vừa tạo
            // để "Download CV" (render-pdf) có dữ liệu mà không phải chờ user chỉnh.
            if (builder.seededFromDiagnosis) {
              builder.setSeededFromDiagnosis(false);
              saveDraftMutation.mutate({
                draftId: data.id,
                snapshot: getBuilderSnapshot(useCvBuilderStore.getState()),
                title: useCvBuilderStore.getState().fullName || "CV Builder draft",
                targetRole: useDiagnosisStore.getState().targetRole,
              });
            }
          },
          onError: (err: Error) => {
            toast({
              title: t("builder.toastDraftErrorTitle"),
              description: err?.message || t("builder.toastDraftErrorDesc"),
              variant: "destructive",
            });
            useAutosaveStore.getState().setSaveStatus("error");
          },
        }
      );
    }
  }, [step, canUseApi, ensureDraftMutation, saveDraftMutation, toast, t]);

  useEffect(() => {
    if (step !== "builder") return;

    if (!canUseApi) return;

    let lastSnapshotJson = JSON.stringify(getBuilderSnapshot(useCvBuilderStore.getState()));
    let timeoutId: NodeJS.Timeout | null = null;

    const saveDraft = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const state = useCvBuilderStore.getState();
      const draftId = state.draftId;
      if (!draftId) return;

      const snapshot = getBuilderSnapshot(state);
      lastSnapshotJson = JSON.stringify(snapshot);

      useAutosaveStore.getState().setSaveStatus("saving");

      saveDraftMutation.mutate(
        {
          draftId,
          snapshot,
          title: "CV Builder draft",
          targetRole: useDiagnosisStore.getState().targetRole,
        },
        {
          onSuccess: () => {
            useAutosaveStore.getState().setSaveStatus("saved");
            const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
            useAutosaveStore.getState().setLastSavedTime(timeStr);
          },
          onError: () => {
            useAutosaveStore.getState().setSaveStatus("error");
          },
        }
      );
    };

    useAutosaveStore.getState().triggerSaveRef.current = () => {
      saveDraft();
    };

    const unsubscribe = useCvBuilderStore.subscribe((state) => {
      const draftId = state.draftId;
      if (!draftId) return;

      const currentSnapshot = getBuilderSnapshot(state);
      const currentSnapshotJson = JSON.stringify(currentSnapshot);

      if (currentSnapshotJson !== lastSnapshotJson) {
        lastSnapshotJson = currentSnapshotJson;

        useAutosaveStore.getState().setSaveStatus("saving");

        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          saveDraft();
        }, 1500);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
      useAutosaveStore.getState().triggerSaveRef.current = null;
    };
  }, [step, canUseApi, saveDraftMutation, toast]);

  // If in builder step, render full-screen builder interface
  if (step === "builder") {
    return (
      <Layout hideFooter>
        <Suspense fallback={<PageLoader />}>
          <div className="h-[calc(100vh-80px)] w-full flex flex-col bg-slate-50 overflow-hidden">
            <CvBuilderHeader />
            <div className="flex-1 flex overflow-hidden">
              <div className="w-[45%] h-full border-r border-slate-200 bg-white flex overflow-hidden shrink-0">
                <div className="hidden xl:block w-[220px] border-r border-slate-150 h-full overflow-y-auto shrink-0 bg-white p-4">
                  <CvSectionNav variant="vertical" />
                </div>
                <div className="flex-1 h-full overflow-y-auto flex flex-col">
                  <div className="xl:hidden sticky top-0 bg-white z-20 border-b border-slate-150 shrink-0">
                    <CvSectionNav variant="horizontal" />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <CvFormPanel />
                  </div>
                </div>
              </div>
              <div className="w-[55%] h-full bg-slate-100 overflow-y-auto p-4 lg:p-8">
                <CvPreviewPanel />
              </div>
            </div>
          </div>
        </Suspense>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12 relative min-h-[calc(100vh-80px)] flex flex-col">

        {/* LOADING OVERLAY */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl"
            >
              <div className="mb-6">
                <MascotSticker state="loading" size={280} interactive={false} />
              </div>
              <div className="text-center space-y-2 min-h-[60px] mb-8">
                <h3 className="text-xl font-bold text-slate-900">
                  {targetStep === "results" ? t("loading.skillGap") : t("loading.cvQuality")}
                </h3>
                <p className="text-slate-500 transition-all duration-300 animate-in fade-in">
                  {loadingPhase}
                </p>
                {elapsed >= 8 && (
                  <p className="text-xs text-slate-400 animate-in fade-in duration-500">
                    {t("loading.coldStart")}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono tabular-nums">
                {t("loading.elapsed", { seconds: elapsed })}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        {step === "input" ? (
          <header className="mb-6 text-center">
            <h1 className="text-3xl font-poppins font-black text-[#2F3437] mb-1.5 tracking-tight">
              {t("header.title")}
            </h1>
            <p className="text-sm text-[#787774] max-w-xl mx-auto leading-normal flex flex-wrap items-center justify-center gap-2">
              <span>{t("header.subtitle")}</span>
              <span className="inline-block text-[11px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-full shrink-0">
                {t("steps.progress")}
              </span>
            </p>
          </header>
        ) : (
          <header className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
              <Brain className="w-3.5 h-3.5" /> {t("header.badge")}
            </div>
            <h1 className="text-4xl md:text-5xl font-poppins font-black text-slate-900 mb-3">
              {t("header.title")}
            </h1>
            <p className="text-slate-500 max-w-xl mx-auto">
              {t("header.subtitle")}
            </p>
          </header>
        )}

        {/* ── Dynamic Step Indicator ── */}
        {step !== "input" && (
          <div className="mb-10 flex items-center justify-center gap-1 sm:gap-4">
            <StepDot n={1} label={t("steps.upload")} active={false} done={true} />
            <div className="flex-1 max-w-[60px] h-0.5 transition-colors bg-primary" />
            <StepDot n={2} label={t("steps.review")} active={step === "cv-review"} done={step === "results"} />

            {/* Framer Motion for animating Step 3 in/out based on JD mode */}
            <AnimatePresence>
              {hasActivatedJdMode && (
                <motion.div
                  initial={{ opacity: 0, width: 0, x: -20 }}
                  animate={{ opacity: 1, width: "auto", x: 0 }}
                  exit={{ opacity: 0, width: 0, x: -20 }}
                  className="flex items-center gap-1 sm:gap-4 overflow-hidden"
                >
                  <div className={cn("flex-1 w-[60px] h-0.5 transition-colors", step === "results" ? "bg-primary" : "bg-slate-200")} />
                  <StepDot n={3} label={t("steps.results")} active={step === "results"} done={false} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* STEP 1: INPUT                                  */}
        {/* ═══════════════════════════════════════════════ */}
        {step === "input" && <DiagnosisStep1Upload />}

        {/* ═══════════════════════════════════════════════ */}
        {/* STEP 2: CV REVIEW                              */}
        {/* ═══════════════════════════════════════════════ */}
        {step === "cv-review" && <DiagnosisStep2Review />}

        {/* ═══════════════════════════════════════════════ */}
        {/* STEP 3: SKILL GAP RESULTS                      */}
        {/* ═══════════════════════════════════════════════ */}
        {step === "results" && <DiagnosisStep3Results />}

      </div>
    </Layout>
  );
}
