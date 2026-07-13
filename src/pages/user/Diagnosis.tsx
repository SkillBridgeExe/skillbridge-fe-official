import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import Layout from "@/components/layout/Layout";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@posthog/react";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { DiagnosisStep1Upload, DiagnosisStep2Review, DiagnosisStep3Results } from "@/components/diagnosis";
import { ReportTopBar } from "@/components/diagnosis/report/ReportTopBar";
import { MascotSticker } from "@/components/mascot/MascotSticker";
import PageLoader from "@/components/common/PageLoader";
import { useEnsureBuilderDraftMutation, useSaveBuilderDraftMutation } from "@/hooks/use-cv-builder";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useAutosaveStore } from "@/store/useAutosaveStore";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useHasApiSession } from "@/hooks/use-api-session";
import { useToast } from "@/hooks/use-toast";
import {
  resolveCvBuilderSavedSource,
  shouldHydrateServerDraft,
  shouldSaveClientSnapshotAfterDraftCreate,
  type CvBuilderSavedSource,
} from "@/services/cv-builder.service";
import { getBuilderSnapshot } from "@/components/cv-builder/builder-snapshot";
import { getCvDetailApi } from "@/api/cv/list";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { captureStudioEvent, studioErrorCode } from "@/lib/studio-telemetry";
import { getApiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";

const StudioTopBar = lazy(() => import("@/components/cv-builder/studio/StudioTopBar").then(m => ({ default: m.StudioTopBar })));
const CvFormPanel = lazy(() => import("@/components/cv-builder/CvFormPanel").then(m => ({ default: m.CvFormPanel })));
const CvPreviewPanel = lazy(() => import("@/components/cv-builder/CvPreviewPanel").then(m => ({ default: m.CvPreviewPanel })));
const CvSectionNav = lazy(() => import("@/components/cv-builder/CvSectionNav").then(m => ({ default: m.CvSectionNav })));
const StudioInspector = lazy(() => import("@/components/cv-builder/studio/StudioInspector").then(m => ({ default: m.StudioInspector })));

/* ── Main Diagnosis Page ── */
export default function Diagnosis() {
  const { t } = useTranslation("diagnosis");
  const {
    step, isAnalyzing,
    targetStep,
    setIsFromBuilder, setBuilderCvId, setBuilderCvName, clearBuilderState,
    setStep
  } = useDiagnosisStore();

  const location = useLocation();
  const canUseApi = useHasApiSession();
  const setCompanionSuspended = useCompanionStore((s) => s.setSuspended);
  const posthog = usePostHog();
  useUnsavedGuard();

  useEffect(() => {
    setCompanionSuspended(isAnalyzing);
    return () => setCompanionSuspended(false);
  }, [isAnalyzing, setCompanionSuspended]);

  // Handle initialization from builder and mode parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const navState = location.state as { source?: string; cvId?: string; cvName?: string } | null;
    const source = params.get("source") || navState?.source;
    const cvId = params.get("cvId") || navState?.cvId;
    const cvName = params.get("cvName") || navState?.cvName;
    const mode = params.get("mode");
    
    if (mode === "builder") {
      setStep("builder");
    } else if (source === "builder") {
      setIsFromBuilder(true);
      if (cvId) setBuilderCvId(cvId);
      // Mocking the builder CV name since we don't have a real backend to fetch it from yet
      setBuilderCvName(cvName || "CV Builder draft");
      setStep("input");
    } else {
      // User came here without source=builder, e.g. from homepage "Scan my CV"
      // Clear builder state so we don't persist it inappropriately
      clearBuilderState();
      // Reset to input step when navigating fresh (e.g. clicking nav link)
      if (!useDiagnosisStore.getState().reviewData) setStep("input");
    }
  }, [location, setIsFromBuilder, setBuilderCvId, setBuilderCvName, clearBuilderState, setStep]);

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
  const builderSaveCapturedRef = useRef(false);
  const builderSaveSourceRef = useRef<CvBuilderSavedSource | null>(null);

  const captureCvBuilderSaved = useCallback((state: ReturnType<typeof useCvBuilderStore.getState>) => {
    if (builderSaveCapturedRef.current || !state.draftId) return;

    builderSaveCapturedRef.current = true;
    posthog?.capture("cv_builder_saved", {
      draft_id: state.draftId,
      source: builderSaveSourceRef.current ?? resolveCvBuilderSavedSource(state),
      section_count: state.getSectionStatuses().length,
      completion_percent: state.getCompletionPercent(),
    });
  }, [posthog]);

  // W22-A fix: gate draft creation with a ref so it only attempts ONCE per builder entry.
  // A permanent 402 (quota exhausted) must NOT retry — fall back to local mode instead of looping.
  const draftAttemptRef = useRef(false);
  // Blocks builder editing while an existing CV is being recovered (reload / deep-link) so the
  // async hydrate can't clobber keystrokes typed during the fetch.
  const [isRecoveringCv, setIsRecoveringCv] = useState(false);
  const [recoverError, setRecoverError] = useState<Error | null>(null);

  const recoverCvDraft = useCallback((id: string) => {
    setIsRecoveringCv(true);
    setRecoverError(null);
    const recoverStartedAt = performance.now();
    getCvDetailApi(id)
      .then((detail) => {
        const builder = useCvBuilderStore.getState();
        if (detail.parsedJson) {
          builder.hydrateFromCanonical(detail.parsedJson, { cvId: detail.id });
        }
        builder.setDraftId(detail.id);
        builder.setResumeTitle(detail.title || t("builder.studio.untitledResume"));
        builder.setSeedSourceCvId(null);
        useAutosaveStore.getState().setSaveStatus("saved");
        captureStudioEvent("builder_recover", {
          outcome: "success",
          latencyMs: performance.now() - recoverStartedAt,
          templateId: useCvBuilderStore.getState().template,
        });
        setIsRecoveringCv(false);
      })
      .catch((err) => {
        console.error("Failed to recover draft", err);
        setRecoverError(err instanceof Error ? err : new Error(String(err)));
        useAutosaveStore.getState().setSaveStatus("local");
        captureStudioEvent("builder_recover", {
          outcome: "failure",
          latencyMs: performance.now() - recoverStartedAt,
          errorCode: studioErrorCode(err),
        });
      });
  }, [t]);

  const handleSwitchToOffline = useCallback(() => {
    setIsRecoveringCv(false);
    setRecoverError(null);
  }, []);

  useEffect(() => {
    if (step !== "builder") {
      draftAttemptRef.current = false; // allow a fresh attempt next time the builder opens
      builderSaveCapturedRef.current = false;
      builderSaveSourceRef.current = null;
      return;
    }

    if (!canUseApi) {
      useAutosaveStore.getState().setSaveStatus("local");
      return;
    }

    const builderEntryState = useCvBuilderStore.getState();
    builderSaveSourceRef.current ??= resolveCvBuilderSavedSource(builderEntryState);
    const currentDraftId = builderEntryState.draftId;
    // Attempt server-draft creation AT MOST ONCE per builder entry. A permanent 402
    // (quota exhausted) must NOT retry — fall back to local mode instead of looping.
    if (currentDraftId === null && !draftAttemptRef.current) {
      draftAttemptRef.current = true;
      const urlParams = new URLSearchParams(window.location.search);
      // Recover an existing CV by whichever id the URL carries — the draft working
      // copy (draftId) or the library id (cvId). ResumeLibrary opens resumes with
      // ?cvId=X and relies on the store already holding the draftId from the soft
      // navigation; on a full reload / deep-link that store state is gone, so without
      // also honouring cvId here the builder spawns a brand-new draft instead of
      // re-opening CV X — orphaning its versions, resetting the title to "Untitled",
      // and duplicating the CV row.
      const recoverId = urlParams.get("draftId") || urlParams.get("cvId");

      if (recoverId) {
        recoverCvDraft(recoverId);
        return;
      }

      const builderSeed = useCvBuilderStore.getState();
      builderSaveSourceRef.current = resolveCvBuilderSavedSource(builderSeed);
      const snapshotAtDraftRequest = getBuilderSnapshot(builderSeed);
      ensureDraftMutation.mutate(
        {
          sourceCvId: builderSeed.seedSourceCvId,
          language: builderSeed.cvLanguage,
          title: builderSeed.resumeTitle || builderSeed.fullName || t("builder.studio.untitledResume"),
          targetRole: useDiagnosisStore.getState().targetRole,
        },
        {
          onSuccess: (data) => {
            const builderBeforeHydrate = useCvBuilderStore.getState();
            const currentSnapshot = getBuilderSnapshot(builderBeforeHydrate);
            const hasServerDocument = Boolean(data.parsedJson);
            const snapshotUnchanged = shouldHydrateServerDraft(
              snapshotAtDraftRequest,
              currentSnapshot,
            );
            const canHydrateServerDocument =
              Boolean(data.parsedJson) && snapshotUnchanged;
            const snapshotChangedWhileCreating = !snapshotUnchanged;
            const wasSeededFromDiagnosis = builderBeforeHydrate.seededFromDiagnosis;

            if (data.parsedJson && canHydrateServerDocument) {
              builderBeforeHydrate.hydrateFromCanonical(data.parsedJson, { cvId: data.id });
            }

            const builder = useCvBuilderStore.getState();
            builder.setDraftId(data.id);
            builder.setSeedSourceCvId(null);
            
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("draftId", data.id);
            window.history.replaceState({}, "", newUrl.toString());

            const markSaved = () => {
              useAutosaveStore.getState().setSaveStatus("saved");
              useAutosaveStore.getState().setIsDirty(false);
              const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
              useAutosaveStore.getState().setLastSavedTime(timeStr);
              captureCvBuilderSaved(useCvBuilderStore.getState());
            };

            // The backend normally returns a cloned or blank canonical document.
            // Push the client snapshot only if the backend has no document or
            // the user edited while the create-draft request was still pending.
            if (
              shouldSaveClientSnapshotAfterDraftCreate({
                hasServerDocument,
                seededFromDiagnosis: wasSeededFromDiagnosis,
                snapshotChangedWhileCreating,
              })
            ) {
              useAutosaveStore.getState().setSaveStatus("saving");
              const latestBuilder = useCvBuilderStore.getState();
              saveDraftMutation.mutate({
                draftId: data.id,
                snapshot: getBuilderSnapshot(latestBuilder),
                targetRole: useDiagnosisStore.getState().targetRole,
              }, {
                onSuccess: markSaved,
                onError: () => {
                  useAutosaveStore.getState().setSaveStatus("error");
                },
              });
            } else {
              markSaved();
            }
            useCvBuilderStore.getState().setSeededFromDiagnosis(false);
          },
          onError: (err: Error) => {
            // Graceful degradation: keep editing locally, surface the reason ONCE.
            useAutosaveStore.getState().setSaveStatus("local");
            captureStudioEvent("builder_create", { outcome: "failure", errorCode: studioErrorCode(err) });
            toast({
              title: t("builder.toastDraftErrorTitle"),
              description: err?.message || t("builder.toastDraftErrorDesc"),
              variant: "destructive",
            });
          },
        }
      );
    }
    // mutate() fns are stable in React Query; we intentionally exclude the mutation
    // objects so their state transitions don't re-run this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, canUseApi]);

  useEffect(() => {
    if (step !== "builder") return;

    if (!canUseApi) return;

    let lastSnapshotJson = JSON.stringify(getBuilderSnapshot(useCvBuilderStore.getState()));
    let timeoutId: NodeJS.Timeout | null = null;

    const saveDraft = async () => {
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

      const saveStartedAt = performance.now();
      try {
        await saveDraftMutation.mutateAsync({
          draftId,
          snapshot,
          targetRole: useDiagnosisStore.getState().targetRole,
        });
        useAutosaveStore.getState().setSaveStatus("saved");
        useAutosaveStore.getState().setIsDirty(false);
        const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        useAutosaveStore.getState().setLastSavedTime(timeStr);
        captureCvBuilderSaved(useCvBuilderStore.getState());
      } catch (error) {
        useAutosaveStore.getState().setSaveStatus("error");
        // Failures only — a success event per 1.5s autosave would be noise.
        captureStudioEvent("builder_save", {
          outcome: "failure",
          latencyMs: performance.now() - saveStartedAt,
          errorCode: studioErrorCode(error),
        });
        throw error;
      }
    };

    useAutosaveStore.getState().triggerSaveRef.current = saveDraft;

    const unsubscribe = useCvBuilderStore.subscribe((state) => {
      const currentSnapshot = getBuilderSnapshot(state);
      const currentSnapshotJson = JSON.stringify(currentSnapshot);
      const draftId = state.draftId;
      if (!draftId) {
        lastSnapshotJson = currentSnapshotJson;
        return;
      }

      if (currentSnapshotJson !== lastSnapshotJson) {
        lastSnapshotJson = currentSnapshotJson;

        useAutosaveStore.getState().setIsDirty(true);
        useAutosaveStore.getState().setSaveStatus("saving");

        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          void saveDraft().catch(() => {
            // Background autosave already marks the save state as error.
          });
        }, 1500);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
      // A pending debounced save must not die with this effect: SPA navigation away (browser
      // back, sidebar links) isn't blocked by any router guard, so flush instead of losing the
      // last <=1.5s of typing. The PUT keeps running after unmount.
      if (useAutosaveStore.getState().isDirty && useCvBuilderStore.getState().draftId) {
        void saveDraft().catch(() => {
          // Nothing to surface — the page is unmounting; autosave state already marks the error.
        });
      }
      useAutosaveStore.getState().triggerSaveRef.current = null;
    };
    // mutateAsync is stable for this usage; excluding the mutation object avoids
    // resubscribing on React Query state transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, canUseApi]);

  // If in builder step, render full-screen builder interface
  if (step === "builder") {
    return (
      <Layout hideFooter hideNavbar hideSidebar>
        <Suspense fallback={<PageLoader />}>
          <div id="cv-builder-anchor" className="relative h-[100dvh] w-full flex flex-col bg-slate-50 overflow-hidden text-slate-900">
            {isRecoveringCv && (
              <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6 text-center">
                {recoverError ? (
                  <div className="max-w-md p-6 bg-white border border-red-100 rounded-2xl shadow-sm flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                      {t("builder.recoverErrorTitle", "Could not load CV from cloud")}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {t("builder.recoverErrorDesc", "We encountered an issue loading your resume from the server. Check your connection and try again.")}
                    </p>
                    <p className="text-xs font-mono text-red-600 bg-red-50 p-3 rounded-lg w-full max-h-32 overflow-auto text-left border border-red-100/50">
                      {getApiErrorMessage(recoverError)}
                    </p>
                    <div className="flex gap-2 w-full mt-2">
                      <Button
                        variant="outline"
                        type="button"
                        className="flex-1 text-xs"
                        onClick={handleSwitchToOffline}
                      >
                        {t("builder.recoverOffline", "Use offline mode")}
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 text-xs gap-2"
                        onClick={() => {
                          const urlParams = new URLSearchParams(window.location.search);
                          const recoverId = urlParams.get("draftId") || urlParams.get("cvId");
                          if (recoverId) recoverCvDraft(recoverId);
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {t("builder.recoverRetry", "Retry")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Loader2 className={`h-8 w-8 text-slate-400 ${window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "" : "animate-spin"}`} />
                    <p className="text-sm font-medium text-slate-500">{t("builder.recoveringDraft")}</p>
                  </>
                )}
              </div>
            )}
            <StudioTopBar />
            <div className="flex-1 flex overflow-hidden">
              
              {/* Zone 1: Navigation Rail (Desktop Only) */}
              <div className="hidden lg:flex w-[56px] border-r border-slate-200 h-full overflow-y-auto shrink-0 bg-white shadow-sm z-10">
                <CvSectionNav variant="icon" />
              </div>
              
              {/* Zone 2: Editor (Scrollable Column) */}
              <div className="w-full lg:w-[460px] h-full flex flex-col bg-slate-50 border-r border-slate-200 relative shrink-0 lg:flex-none">
                {/* Mobile Nav */}
                <div className="lg:hidden sticky top-0 bg-white z-20 border-b border-slate-200 shrink-0 shadow-sm">
                  <CvSectionNav variant="horizontal" />
                </div>
                {/* Editor Content */}
                <div className="flex-1 overflow-y-auto p-3 lg:p-4 custom-scrollbar motion-safe:scroll-smooth">
                  <CvFormPanel />
                </div>
              </div>

              {/* Zone 3: Canvas (Preview) */}
              <div className="hidden lg:block min-w-0 flex-1 h-full bg-[#f3f4f6]">
                <CvPreviewPanel />
              </div>

              {/* Zone 4: Inspector (Right Rail) */}
              <div className="hidden xl:block w-[340px] h-full shrink-0 bg-white border-l border-slate-200 shadow-sm z-10">
                <StudioInspector />
              </div>

            </div>
          </div>
        </Suspense>
      </Layout>
    );
  }

  // Report mode (Jobscan-style app shell): slim utility top bar instead of the
  // floating marketing navbar, no stepper, wider container.
  const isResultsMode = step === "results";
  const reportMode = step === "cv-review" || step === "results";

  return (
    <Layout hideNavbar={reportMode} hideFooter={reportMode}>
      {reportMode && <ReportTopBar />}
      <div
        id="diagnosis-root"
        className={cn(
          "mx-auto relative flex flex-col w-full",
          isResultsMode
            ? "max-w-7xl px-4 md:px-6 pt-6 pb-6 lg:h-[calc(100dvh-24px)] lg:min-h-0 lg:overflow-hidden"
            : reportMode
              ? "max-w-7xl px-4 md:px-6 pt-6 pb-6 min-h-[calc(100dvh-24px)]"
              : "max-w-5xl px-6 py-6 min-h-dvh md:h-dvh md:min-h-0 md:overflow-y-auto justify-center",
        )}
      >

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
        {step === "input" && (
          <header className="mb-6 text-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <span className="inline-block px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-ink-accent bg-ink-accent/10 rounded-full ring-1 ring-ink-accent/20">
              {t("steps.progress")}
            </span>
            <h1 className="text-4xl md:text-5xl font-poppins font-black text-slate-900 tracking-tighter leading-tight">
              {t("header.title")}
            </h1>
          </header>
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
