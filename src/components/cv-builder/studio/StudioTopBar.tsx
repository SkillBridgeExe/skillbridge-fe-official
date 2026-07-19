import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Save, Loader2, Sparkles, Wand2, PenLine, MoreHorizontal, FileJson, Copy, Upload, Share2, RefreshCw, AlertCircle, History } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAutosaveStore } from "@/store/useAutosaveStore";
import { useTranslation } from "react-i18next";
import { useCvBuilderStore, type CvBuilderState } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import {
  useCvVersionsQuery,
  useCreateVersionMutation,
  useRestoreVersionMutation,
} from "@/hooks/use-cv-versions";
import { useRenameResumeMutation } from "@/hooks/use-resume-library";
import { useHasApiSession } from "@/hooks/use-api-session";
import { useAnalyzeCvMutation } from "@/hooks/use-diagnosis";
import { getApiErrorMessage } from "@/lib/api-error";
import { useCompanionStore, type CompanionContextReg } from "@/store/useCompanionStore";
import { useRef, useState } from "react";
import { createBuilderDraftApi } from "@/api/cv/builder";
import { createVersionApi } from "@/api/cv/versions";
import { createStudioResumePdfBlob } from "./download-resume-pdf";
import { captureStudioEvent, studioErrorCode } from "@/lib/studio-telemetry";
import { useCvBuilderChatCompanion } from "@/components/companion/skills/useCvBuilderChatCompanion";

/** Low-cardinality context every studio event carries. */
const studioEventContext = () => {
  const state = useCvBuilderStore.getState();
  return { templateId: state.template, atsMode: Boolean(state.resumeAtsSafeMode) };
};

type ImportedResumeBackup = Record<string, unknown> & {
  $schema: "skillbridge-cv-v1";
  exportedAt?: string;
  education: unknown[];
  experience: unknown[];
  projects: unknown[];
};

const isImportedResumeBackup = (value: unknown): value is ImportedResumeBackup => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.$schema === "skillbridge-cv-v1" &&
    Array.isArray(candidate.education) &&
    Array.isArray(candidate.experience) &&
    Array.isArray(candidate.projects)
  );
};

export function StudioTopBar() {
  const { t } = useTranslation("diagnosis");
  const hasApiSession = useHasApiSession();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { saveStatus, lastSavedTime, triggerSaveRef } = useAutosaveStore();
  const draftId = useCvBuilderStore((s) => s.draftId);

  // Slice 5: mount the CV builder chat companion (chat-driven corner advisor).
  // The hook registers/activates once, clears on unmount (anti-Clippy).
  useCvBuilderChatCompanion(draftId);
  const title = useCvBuilderStore((s) => s.resumeTitle);
  const fullName = useCvBuilderStore((s) => s.fullName);
  const analyzeCvMutation = useAnalyzeCvMutation();
  const isLocalMode = saveStatus === "local";
  const [importCandidate, setImportCandidate] = useState<ImportedResumeBackup | null>(null);
  const [importSectionsCount, setImportSectionsCount] = useState<number>(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const { isDirty } = useUnsavedGuard();

  const [showVersionPlaceholder, setShowVersionPlaceholder] = useState(false);
  const [showSharePlaceholder, setShowSharePlaceholder] = useState(false);
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  // Proper dialogs instead of window.confirm: the native modal freezes the
  // compositor next to the PDF preview and blocks automation.
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // P2 version history — fetch only while the dialog is open.
  const versionsQuery = useCvVersionsQuery(draftId, showVersionPlaceholder);
  const createVersionMutation = useCreateVersionMutation(draftId);
  const restoreVersionMutation = useRestoreVersionMutation(draftId);
  // Inline title edits persist via rename (autosave no longer owns the title — W97).
  const renameMutation = useRenameResumeMutation();
  const titleAtFocusRef = useRef<string>("");

  const showLocalActionToast = () => {
    toast({
      title: t("builder.toastLocalActionTitle"),
      description: t("builder.localOnly"),
      variant: "destructive",
    });
  };

  const originLabel = (origin: string) =>
    origin === "AUTO_PRE_RESTORE"
      ? t("builder.actions.versionAutoRestore", "Auto — before restore")
      : origin === "AUTO_PRE_IMPORT"
        ? t("builder.actions.versionAutoImport", "Auto — before import")
        : t("builder.actions.versionManual", "Manual save");

  // Persist an inline title edit via the rename endpoint on blur (only when it actually changed).
  const handleTitleBlur = () => {
    const current = (useCvBuilderStore.getState().resumeTitle || "").trim();
    if (!draftId || isLocalMode || !current) return;
    if (current === titleAtFocusRef.current.trim()) return;
    const previousTitle = titleAtFocusRef.current;
    renameMutation.mutate(
      { id: draftId, title: current },
      {
        onError: (e) => {
          // Revert the store so the UI never shows a title the server rejected.
          useCvBuilderStore.getState().setResumeTitle(previousTitle);
          toast({ title: getApiErrorMessage(e), variant: "destructive" });
        },
      },
    );
  };

  const handleSaveVersion = async () => {
    if (isLocalMode || !draftId) {
      showLocalActionToast();
      return;
    }
    // The server snapshots ITS current doc — flush the 1.5s debounced autosave first so the
    // version includes the user's last keystrokes.
    if (!(await flushDraftChanges())) return;
    createVersionMutation.mutate(undefined, {
      onSuccess: () => {
        captureStudioEvent("version_save", { outcome: "success", ...studioEventContext() });
        toast({ title: t("builder.actions.versionSaved", "Version saved") });
      },
      onError: (e) => {
        captureStudioEvent("version_save", { outcome: "failure", errorCode: studioErrorCode(e) });
        toast({ title: getApiErrorMessage(e), variant: "destructive" });
      },
    });
  };

  const handleRestoreVersion = (versionId: string) => {
    if (isLocalMode || !draftId) {
      showLocalActionToast();
      return;
    }
    setPendingRestoreId(versionId);
  };

  const confirmRestoreVersion = async () => {
    const versionId = pendingRestoreId;
    setPendingRestoreId(null);
    if (!versionId) return;
    // Flush pending edits so the AUTO_PRE_RESTORE undo snapshot captures them — otherwise
    // restoring silently loses whatever was typed in the last debounce window.
    if (!(await flushDraftChanges())) return;
    restoreVersionMutation.mutate(versionId, {
      onSuccess: (cv) => {
        const builder = useCvBuilderStore.getState();
        if (cv.parsedJson) builder.hydrateFromCanonical(cv.parsedJson, { preserveDraft: true, cvId: cv.id });
        builder.setDraftId(cv.id);
        captureStudioEvent("version_restore", { outcome: "success", ...studioEventContext() });
        toast({ title: t("builder.actions.versionRestored", "Version restored") });
        setShowVersionPlaceholder(false);
      },
      onError: (e) => {
        captureStudioEvent("version_restore", { outcome: "failure", errorCode: studioErrorCode(e) });
        toast({ title: getApiErrorMessage(e), variant: "destructive" });
      },
    });
  };

  const flushDraftChanges = async (): Promise<boolean> => {
    if (!triggerSaveRef.current) {
      toast({
        title: t("builder.toastSaveFailedTitle"),
        description: t("builder.toastSaveUnavailableDesc"),
        variant: "destructive",
      });
      return false;
    }

    try {
      await triggerSaveRef.current();
      return true;
    } catch (error) {
      toast({
        title: t("builder.toastSaveFailedTitle"),
        description: getApiErrorMessage(error, t("builder.toastSaveFailedDesc")),
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSaveDraft = async () => {
    if (isLocalMode || !draftId) {
      showLocalActionToast();
      return;
    }

    if (await flushDraftChanges()) {
      toast({
        title: t("builder.toastSavedTitle"),
        description: t("builder.toastSavedDesc"),
      });
    }
  };

  const handleDownload = async () => {
    if (isLocalMode || !draftId) {
      showLocalActionToast();
      return;
    }

    if (!(await flushDraftChanges())) return;

    toast({
      title: t("builder.rendering"),
      description: t("builder.toastRenderingDesc"),
    });

    setIsRenderingPdf(true);
    const renderStartedAt = performance.now();
    try {
      const blob = await createStudioResumePdfBlob(useCvBuilderStore.getState());
      captureStudioEvent("pdf_download", {
        outcome: "success",
        latencyMs: performance.now() - renderStartedAt,
        ...studioEventContext(),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = (title || fullName || "skillbridge-cv")
        .trim()
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, "")
        .toLowerCase() || "skillbridge-cv";
      a.download = `${safeTitle}-skillbridge.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      captureStudioEvent("pdf_download", {
        outcome: "failure",
        latencyMs: performance.now() - renderStartedAt,
        errorCode: studioErrorCode(err),
        ...studioEventContext(),
      });
      toast({
        title: t("builder.toastDownloadFailedTitle"),
        description: err instanceof Error ? err.message : t("builder.toastDownloadFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsRenderingPdf(false);
    }
  };

  const handleBackToDiagnosis = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    navigateBackToDiagnosis();
  };

  const navigateBackToDiagnosis = () => {
    const diagnosisStore = useDiagnosisStore.getState();
    diagnosisStore.setIsFromBuilder(false);

    // If they already have a diagnosis result, return them to the review step
    // instead of forcing them back to the upload screen.
    if (diagnosisStore.reviewData) {
      diagnosisStore.setStep("cv-review");
    } else {
      diagnosisStore.setStep("input");
    }

    navigate("/diagnosis");
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJson = () => {
    const state = useCvBuilderStore.getState();
    const excludedKeys = new Set([
      "draftId",
      "sectionEvaluations",
      "sectionFixFeedback",
      "mascotState",
      "companionField",
      "companionSection",
      "companionTurn",
      "companionAnswers",
      "companionPatch",
      "companionMessage",
      "companionReaskCount",
      "pendingProveIt",
    ]);
    const exportData = Object.fromEntries(
      Object.entries(state).filter(([key, value]) => !excludedKeys.has(key) && typeof value !== "function"),
    );

    // Add version schema indicator for W64 requirements
    const payload = {
      $schema: "skillbridge-cv-v1",
      exportedAt: new Date().toISOString(),
      ...exportData
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const safeTitle = (title || fullName || "skillbridge-cv")
      .trim()
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, "")
      .toLowerCase() || "skillbridge-cv";

    const date = new Date().toISOString().split("T")[0];
    a.download = `${safeTitle}-${date}.skillbridge-resume.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (!isImportedResumeBackup(data)) {
          throw new Error("Invalid format");
        }

        const sectionsCount =
          data.experience.length +
          data.education.length +
          data.projects.length;

        setImportCandidate(data);
        setImportSectionsCount(sectionsCount);
        setImportError(null);
        setIsImporting(false);
      } catch {
        toast({
          title: t("builder.import.invalidFormat"),
          variant: "destructive",
        });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast({
        title: t("builder.import.readError"),
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  };

  const applyImportedBackup = async (skipBackup = false) => {
    if (!importCandidate) return;
    setIsImporting(true);
    setImportError(null);
    // Contract: a destructive import-overwrite backs up the current server doc first
    // (AUTO_PRE_IMPORT). If the backup can't be taken, don't destroy — cancel the import.
    if (!isLocalMode && draftId && !skipBackup) {
      // Flush the debounced autosave first so the backup captures the exact pre-import state.
      // The confirm modal blocks further edits, so nothing can change between flush and backup.
      if (!(await flushDraftChanges())) {
        setIsImporting(false);
        setImportError(t("builder.import.flushFailed", "Failed to save current draft changes before backup."));
        return;
      }
      try {
        await createVersionApi(draftId, undefined, "AUTO_PRE_IMPORT");
      } catch (error) {
        captureStudioEvent("version_import", { outcome: "failure", errorCode: studioErrorCode(error) });
        const errMsg = getApiErrorMessage(error, t("builder.import.backupFailed"));
        setImportError(errMsg);
        setIsImporting(false);
        toast({
          title: errMsg,
          variant: "destructive",
        });
        return;
      }
    }
    try {
      const { $schema: _schema, exportedAt: _exportedAt, ...stateToImport } = importCandidate;
      useCvBuilderStore.getState().importState(stateToImport as Partial<CvBuilderState>);
      // Persist BEFORE announcing success: closing the dialog on a failed PUT
      // would show "imported" while the server still holds the old document,
      // so a reload could silently drop the imported content.
      if (triggerSaveRef.current) {
        await triggerSaveRef.current();
      }
      setImportCandidate(null);
      setImportSectionsCount(0);
      setImportError(null);
      captureStudioEvent("version_import", { outcome: "success", ...studioEventContext() });
      toast({
        title: t("builder.import.success"),
      });
    } catch (error) {
      captureStudioEvent("version_import", { outcome: "failure", errorCode: studioErrorCode(error) });
      setImportError(getApiErrorMessage(error, t("builder.import.importError", "Failed to import CV.")));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDuplicate = async () => {
    if (isLocalMode || !draftId) {
      showLocalActionToast();
      return;
    }

    // Check if there are unsaved changes
    if (!(await flushDraftChanges())) return;

    toast({
      title: t("builder.actions.duplicateResume"),
      description: t("builder.actions.duplicateInProgress"),
    });

    try {
      const state = useCvBuilderStore.getState();
      const newTitle = t("builder.actions.copyOf", { title: title || fullName || t("builder.actions.untitledResume") });

      // Call create builder draft to get a new ID
      const newDraft = await createBuilderDraftApi({
        title: newTitle,
        language: state.cvLanguage,
        targetRole: useDiagnosisStore.getState().targetRole || undefined,
      });

      // Update store with new draftId and title
      state.setDraftId(newDraft.id);

      // Save full canonical document to the new draft
      if (triggerSaveRef.current) {
         await triggerSaveRef.current();
      }

      toast({
        title: t("builder.actions.duplicateSuccess"),
        description: t("builder.actions.duplicateSuccessDesc", { title: newTitle }),
      });

      navigate("/diagnosis?mode=builder", { replace: true });
    } catch (error) {
      toast({
        title: t("builder.actions.duplicateFailed"),
        description: getApiErrorMessage(error, t("builder.actions.duplicateFailedDesc")),
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = async () => {
    const diagnosisStore = useDiagnosisStore.getState();

    if (isLocalMode || !draftId) {
      showLocalActionToast();
      return;
    }

    if (!(await flushDraftChanges())) return;

    diagnosisStore.setIsFromBuilder(true);
    diagnosisStore.setBuilderCvId(draftId);
    diagnosisStore.setBuilderCvName(title || fullName || t("builder.studio.defaultCvName"));

    if (!diagnosisStore.targetRole || !diagnosisStore.consentAccepted) {
      diagnosisStore.setStep("input");
      navigate(`/diagnosis?source=builder&cvId=${encodeURIComponent(draftId)}`, {
        state: {
          source: "builder",
          cvId: draftId,
          cvName: title || fullName || t("builder.studio.defaultCvName"),
        },
      });
      return;
    }

    diagnosisStore.setHasActivatedJdMode(false);
    diagnosisStore.setAnalysisMode("cv-only");
    diagnosisStore.setApiError(null);
    diagnosisStore.setReviewData(null);
    diagnosisStore.setTargetStep("cv-review");
    diagnosisStore.setLoadingProgress(0);
    diagnosisStore.setLoadingMsgIdx(0);
    diagnosisStore.setIsAnalyzing(true);

    try {
      const { cvId, review } = await analyzeCvMutation.mutateAsync({
        builderCvId: draftId,
        targetRole: diagnosisStore.targetRole,
        consentAccepted: diagnosisStore.consentAccepted,
      });
      diagnosisStore.setLastCvId(cvId);
      diagnosisStore.setReviewData(review);
      diagnosisStore.setStep("cv-review");
    } catch (error) {
      const message = getApiErrorMessage(error, t("upload.errorAnalyze"));
      diagnosisStore.setApiError(message);
      toast({
        title: t("upload.toastAnalysisFailedTitle"),
        description: message,
        variant: "destructive",
      });
    } finally {
      diagnosisStore.setIsAnalyzing(false);
      diagnosisStore.setLoadingProgress(0);
    }
  };

  const openAssistantContext = (
    id: string,
    getTurn: CompanionContextReg["getTurn"],
  ) => {
    const companion = useCompanionStore.getState();
    companion.registerContext({ id, getTurn });
    companion.activateContext(id);
    useCompanionStore.setState({ bubbleOpen: true });
  };

  const handleOpenAiAssistant = () => {
    if (isLocalMode || !draftId) {
      showLocalActionToast();
      return;
    }

    const state = useCvBuilderStore.getState();

    if (state.summary.trim()) {
      const id = "cvbuilder:summary";
      openAssistantContext(id, () => ({
        skill: "cv_builder",
        props: {
          draftId,
          fieldPath: id,
          section: "summary",
          currentValue: useCvBuilderStore.getState().summary,
          onApply: (after: string) => {
            useCvBuilderStore.getState().setSummary(after);
            useCvBuilderStore.getState().clearSectionEvaluation("summary");
          },
        },
      }));
      return;
    }

    const projectIndex = state.projects.findIndex((project) => project.description.trim());
    if (projectIndex >= 0) {
      const project = state.projects[projectIndex];
      const id = `cvbuilder:projects[${projectIndex}].description`;
      openAssistantContext(id, () => ({
        skill: "cv_builder",
        props: {
          draftId,
          fieldPath: id,
          section: "projects",
          currentValue:
            useCvBuilderStore.getState().projects.find((item) => item.id === project.id)?.description ??
            "",
          onApply: (after: string) => {
            useCvBuilderStore.getState().updateProject(project.id, "description", after);
            useCvBuilderStore.getState().clearSectionEvaluation("projects");
          },
        },
      }));
      return;
    }

    const experienceIndex = state.experience.findIndex((experience) =>
      experience.description.trim() || experience.achievements.trim(),
    );
    if (experienceIndex >= 0) {
      const experience = state.experience[experienceIndex];
      const field = experience.achievements.trim() ? "achievements" : "description";
      const id = `cvbuilder:experience[${experienceIndex}].${field}`;
      openAssistantContext(id, () => ({
        skill: "cv_builder",
        props: {
          draftId,
          fieldPath: id,
          section: "experience",
          currentValue:
            useCvBuilderStore.getState().experience.find((item) => item.id === experience.id)?.[field] ??
            "",
          onApply: (after: string) => {
            useCvBuilderStore.getState().updateExperience(experience.id, field, after);
            useCvBuilderStore.getState().clearSectionEvaluation("experience");
          },
        },
      }));
      return;
    }

    toast({
      title: t("builder.aiNeedsContentTitle"),
      description: t("builder.aiNeedsContentDesc"),
    });
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 z-10 pr-2 sm:pr-4 xl:pr-6 pl-0 sticky top-0 shadow-sm">
      <div className="flex h-full min-w-0 items-center gap-0 flex-1">

        {/* Back Button (aligned with 56px sidebar) */}
        <div className="w-[56px] h-full flex items-center justify-center shrink-0">
          <button
            onClick={handleBackToDiagnosis}
            className="group flex items-center justify-center w-9 h-9 text-slate-500 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/40"
            title={t("builder.backToDiagnosis")}
            aria-label={t("builder.backToDiagnosis")}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 mx-2" />

        {/* Document Title - Editable */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[200px] sm:max-w-[300px] group relative shrink">
          <input
            type="text"
            className="font-semibold text-[15px] text-slate-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded-md px-2.5 py-1 w-full truncate hover:bg-slate-100 transition-colors placeholder:text-slate-400 focus:bg-white"
            value={title || ""}
            placeholder={t("builder.studio.untitledResume")}
            aria-label={t("builder.studio.resumeNameLabel")}
            onChange={(e) => useCvBuilderStore.getState().setResumeTitle(e.target.value)}
            onFocus={() => {
              titleAtFocusRef.current = title || "";
            }}
            onBlur={handleTitleBlur}
          />
          <PenLine className="w-3.5 h-3.5 text-slate-400 absolute right-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
        </div>

      </div>

      {/* Center - Save Status */}
      <div className="hidden md:flex items-center justify-center flex-1 shrink-0">
        <div className="flex items-center justify-center gap-2 text-xs font-medium px-3 py-1.5 text-slate-400 w-[180px]">
          {isLocalMode ? (
            <span className="text-slate-500">
              {hasApiSession ? t("builder.localOnlyAuthed") : t("builder.localOnly")}
            </span>
          ) : saveStatus === "saving" ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{t("builder.saving")}</span>
            </>
          ) : saveStatus === "saved" && lastSavedTime ? (
            <>
              <Save className="w-3 h-3 text-slate-400" />
              <span>{t("builder.savedAt", { time: lastSavedTime })}</span>
            </>
          ) : saveStatus === "error" ? (
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors focus:outline-none cursor-pointer"
              title={t("builder.retrySave", "Retry saving")}
              type="button"
            >
              <AlertCircle className="w-3 h-3" />
              <span className="font-semibold underline decoration-dotted">{t("builder.saveError")}</span>
            </button>
          ) : (
            <>
              <Save className="w-3 h-3 text-slate-300" />
              <span>{t("builder.saveDraft")}</span>
            </>
          )}
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex h-full items-center gap-1.5 flex-1 justify-end sm:gap-2">

        {/* AI Assistant Button */}
        <Button
          onClick={handleSaveDraft}
          variant="ghost"
          size="sm"
          className="hidden gap-2 h-8 rounded-full text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 sm:inline-flex"
          disabled={saveStatus === "saving"}
          aria-label={t("builder.saveDraft")}
          title={t("builder.saveDraft")}
        >
          {saveStatus === "saving" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden sm:inline">{t("builder.saveDraft")}</span>
        </Button>

        <Button
          onClick={handleOpenAiAssistant}
          variant="secondary"
          size="sm"
          className="hidden gap-1.5 h-8 rounded-full text-[13px] font-medium bg-primary/10 text-primary hover:bg-primary/20 border-transparent transition-colors sm:inline-flex"
          aria-label={t("builder.aiAssistant")}
          title={t("builder.aiAssistant")}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("builder.aiAssistant")}</span>
        </Button>

        {/* Analyze button (kept but made secondary) */}
        <Button
          onClick={handleAnalyze}
          variant="ghost"
          size="sm"
          className="hidden gap-2 h-8 rounded-full text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 sm:inline-flex"
          disabled={analyzeCvMutation.isPending}
          aria-label={t("builder.analyzeCv")}
          title={t("builder.analyzeCv")}
        >
          {analyzeCvMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden sm:inline">{analyzeCvMutation.isPending ? t("loading.scoring") : t("builder.analyzeCv")}</span>
        </Button>

        {/* Download PDF button */}
        <Button
          variant="default"
          size="sm"
          onClick={handleDownload}
          className="hidden gap-2 h-8 rounded-full text-[13px] font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm sm:inline-flex"
          disabled={isRenderingPdf}
          aria-label={t("builder.downloadCv")}
          title={t("builder.downloadCv")}
        >
          {isRenderingPdf ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{t("builder.downloadCv")}</span>
        </Button>

        {/* More Options Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              aria-label={t("builder.actions.more")}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleSaveDraft} disabled={saveStatus === "saving"} className="gap-2 sm:hidden">
              {saveStatus === "saving" ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <Save className="w-4 h-4 text-slate-500" />
              )}
              <span>{t("builder.saveDraft")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenAiAssistant} className="gap-2 sm:hidden">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>{t("builder.aiAssistant")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAnalyze} disabled={analyzeCvMutation.isPending} className="gap-2 sm:hidden">
              {analyzeCvMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <Wand2 className="w-4 h-4 text-slate-500" />
              )}
              <span>{analyzeCvMutation.isPending ? t("loading.scoring") : t("builder.analyzeCv")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload} disabled={isRenderingPdf} className="gap-2 sm:hidden">
              {isRenderingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <Download className="w-4 h-4 text-slate-500" />
              )}
              <span>{t("builder.downloadCv")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onClick={handleDuplicate} className="gap-2">
              <Copy className="w-4 h-4 text-slate-500" />
              <span>{t("builder.actions.duplicateResume")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowVersionPlaceholder(true)} className="gap-2">
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>{t("builder.actions.versionHistory", "Version History")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportJson} className="gap-2">
              <FileJson className="w-4 h-4 text-slate-500" />
              <span>{t("builder.actions.exportJson")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>{t("builder.actions.importJson")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowSharePlaceholder(true)} className="gap-2">
              <Share2 className="w-4 h-4 text-slate-500" />
              <span>{t("builder.actions.shareResume")}</span>
              <span className="ml-auto text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{t("builder.actions.comingSoon")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json,application/json"
          onChange={handleImportJson}
        />
      </div>
      <AlertDialog open={!!importCandidate} onOpenChange={(open) => {
        if (!isImporting) {
          if (!open) {
            setImportCandidate(null);
            setImportError(null);
          }
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("builder.import.confirmTitle")}</AlertDialogTitle>
            {/* Keep AlertDialogDescription so Radix wires aria-describedby; extra
                blocks live outside it because it renders a <p>. */}
            <AlertDialogDescription>{t("builder.import.confirmDesc")}</AlertDialogDescription>
            <div className="text-sm text-slate-500 space-y-3">
              <p className="font-semibold text-slate-700">
                {t("builder.import.stats", { sections: importSectionsCount })}
              </p>

              {importError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {t("builder.import.errorHeading", "Import Failed")}
                  </p>
                  <p className="font-mono text-left max-h-24 overflow-auto">{importError}</p>
                </div>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isImporting} onClick={() => {
              setImportCandidate(null);
              setImportError(null);
            }}>
              {t("builder.import.cancel")}
            </AlertDialogCancel>

            {importError && !isLocalMode && draftId ? (
              <>
                <Button
                  variant="ghost"
                  type="button"
                  size="sm"
                  disabled={isImporting}
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 text-xs shrink-0"
                  onClick={() => void applyImportedBackup(true)}
                >
                  {t("builder.import.skipBackup", "Skip backup")}
                </Button>
                <AlertDialogAction
                  disabled={isImporting}
                  onClick={(e) => {
                    e.preventDefault();
                    void applyImportedBackup(false);
                  }}
                  className="gap-1.5"
                >
                  {isImporting ? (
                    <Loader2 className={`w-3.5 h-3.5 ${window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "" : "animate-spin"}`} />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {t("builder.import.retry", "Retry")}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                disabled={isImporting}
                onClick={(e) => {
                  e.preventDefault();
                  void applyImportedBackup(false);
                }}
                className="gap-1.5"
              >
                {isImporting && (
                  <Loader2 className={`w-3.5 h-3.5 ${window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "" : "animate-spin"}`} />
                )}
                {isImporting ? t("builder.import.importing", "Importing...") : t("builder.import.apply")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showVersionPlaceholder} onOpenChange={setShowVersionPlaceholder}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("builder.actions.versionHistoryTitle", "Version History")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("builder.actions.versionHistoryPlaceholderDesc", "View and restore previous snapshots of this resume.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-2 max-h-[52vh] overflow-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveVersion}
              disabled={createVersionMutation.isPending || !draftId}
              className="justify-center gap-2"
            >
              {createVersionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {t("builder.actions.versionSaveCurrent", "Save current version")}
            </Button>

            {versionsQuery.isLoading ? (
              <div className="flex flex-col gap-2 py-1">
                {[1, 2, 3].map((i) => {
                  const isReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                    >
                      <div className="flex-1 space-y-2">
                        <div className={`h-4 bg-slate-200 rounded w-2/3 ${isReduced ? "" : "animate-pulse"}`} />
                        <div className={`h-3 bg-slate-200 rounded w-1/3 ${isReduced ? "" : "animate-pulse"}`} />
                      </div>
                      <div className={`h-7 w-16 bg-slate-200 rounded shrink-0 ${isReduced ? "" : "animate-pulse"}`} />
                    </div>
                  );
                })}
              </div>
            ) : versionsQuery.isError ? (
              <div className="flex flex-col items-center gap-3 py-6 px-4 border border-dashed border-red-100 bg-red-50/50 rounded-lg">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <div className="space-y-1 text-center">
                  <p className="text-sm font-semibold text-red-700">
                    {t("builder.actions.versionsError", "Couldn't load version history.")}
                  </p>
                  <p className="text-xs font-mono text-red-600 max-h-24 overflow-auto max-w-[320px]">
                    {getApiErrorMessage(versionsQuery.error)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void versionsQuery.refetch()} className="gap-1.5 mt-1 border-red-200 text-red-700 hover:bg-red-100">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t("builder.actions.versionsRetry", "Retry")}
                </Button>
              </div>
            ) : (versionsQuery.data?.items.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                <History className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-center text-sm font-semibold text-slate-600">
                  {t("builder.actions.noVersions", "No saved versions yet.")}
                </p>
                <p className="text-center text-xs text-slate-400 max-w-[280px] mt-1">
                  {t("builder.actions.noVersionsDesc", "Create a version manually or wait for auto-saves before restoring.")}
                </p>
              </div>
            ) : (
              versionsQuery.data?.items.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {v.label || originLabel(v.origin)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 text-xs"
                    onClick={() => handleRestoreVersion(v.id)}
                    disabled={restoreVersionMutation.isPending}
                  >
                    {t("builder.actions.restore", "Restore")}
                  </Button>
                </div>
              ))
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowVersionPlaceholder(false)}>{t("builder.review.close", "Close")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingRestoreId} onOpenChange={(open) => !open && setPendingRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("builder.actions.restoreConfirmTitle", "Restore this version?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "builder.actions.restoreConfirm",
                "Restore this version? Your current draft is snapshotted first, so you can undo.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("builder.actions.restoreConfirmCancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRestoreVersion()}>
              {t("builder.actions.restoreConfirmAction", "Restore version")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("builder.leaveConfirmTitle", "Leave the editor?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("builder.unsavedChangesPrompt", "You have unsaved changes. Are you sure you want to leave?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("builder.leaveConfirmStay", "Keep editing")}</AlertDialogCancel>
            <AlertDialogAction onClick={navigateBackToDiagnosis}>
              {t("builder.leaveConfirmLeave", "Leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSharePlaceholder} onOpenChange={setShowSharePlaceholder}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("builder.actions.shareResumeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {isLocalMode || !draftId
                ? t("builder.actions.shareResumePlaceholderDescDraft")
                : t("builder.actions.shareResumePlaceholderDesc")
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSharePlaceholder(false)}>{t("builder.review.close")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
