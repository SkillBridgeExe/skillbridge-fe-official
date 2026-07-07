import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Save, Loader2, Sparkles, Wand2, PenLine, MoreHorizontal, FileJson, Copy, Upload } from "lucide-react";
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
import { useHasApiSession } from "@/hooks/use-api-session";
import { useRenderBuilderPdfMutation } from "@/hooks/use-cv-builder";
import { useAnalyzeCvMutation } from "@/hooks/use-diagnosis";
import { getApiErrorMessage } from "@/lib/api-error";
import { useCompanionStore, type CompanionContextReg } from "@/store/useCompanionStore";
import { useRef, useState } from "react";
import { createBuilderDraftApi } from "@/api/cv/builder";

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
  const title = useCvBuilderStore((s) => s.fullName);
  const renderPdfMutation = useRenderBuilderPdfMutation();
  const analyzeCvMutation = useAnalyzeCvMutation();
  const isLocalMode = saveStatus === "local";
  const [importCandidate, setImportCandidate] = useState<ImportedResumeBackup | null>(null);
  const [importSectionsCount, setImportSectionsCount] = useState(0);

  const showLocalActionToast = () => {
    toast({
      title: t("builder.toastLocalActionTitle"),
      description: t("builder.localOnly"),
      variant: "destructive",
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

    renderPdfMutation.mutate(draftId, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const safeTitle = (title || "skillbridge-cv")
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
      },
      onError: (err: Error) => {
        toast({
          title: t("builder.toastDownloadFailedTitle"),
          description: err?.message || t("builder.toastDownloadFailedDesc"),
          variant: "destructive",
        });
      },
    });
  };

  const handleBackToDiagnosis = () => {
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

    const safeTitle = (title || "skillbridge-cv")
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

  const applyImportedBackup = async () => {
    if (!importCandidate) return;
    const { $schema: _schema, exportedAt: _exportedAt, ...stateToImport } = importCandidate;
    useCvBuilderStore.getState().importState(stateToImport as Partial<CvBuilderState>);
    setImportCandidate(null);
    setImportSectionsCount(0);
    toast({
      title: t("builder.import.success"),
    });

    if (triggerSaveRef.current) {
      await triggerSaveRef.current();
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
      const newTitle = t("builder.actions.copyOf", { title: title || t("builder.actions.untitledResume") });

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
    diagnosisStore.setBuilderCvName(title || t("builder.studio.defaultCvName"));

    if (!diagnosisStore.targetRole || !diagnosisStore.consentAccepted) {
      diagnosisStore.setStep("input");
      navigate(`/diagnosis?source=builder&cvId=${encodeURIComponent(draftId)}`, {
        state: {
          source: "builder",
          cvId: draftId,
          cvName: title || t("builder.studio.defaultCvName"),
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
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 z-10 pr-4 xl:pr-6 pl-0 sticky top-0 shadow-sm">
      <div className="flex h-full items-center gap-0 flex-1">

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
        <div className="flex items-center gap-1.5 max-w-[200px] sm:max-w-[300px] group relative">
          <input
            type="text"
            className="font-semibold text-[15px] text-slate-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded-md px-2.5 py-1 w-full truncate hover:bg-slate-100 transition-colors placeholder:text-slate-400 focus:bg-white"
            value={title || ""}
            placeholder={t("builder.studio.untitledResume")}
            aria-label={t("builder.studio.resumeNameLabel")}
            onChange={(e) => useCvBuilderStore.getState().setBasicInfo("fullName", e.target.value)}
          />
          <PenLine className="w-3.5 h-3.5 text-slate-400 absolute right-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
        </div>

      </div>

      {/* Center - Save Status */}
      <div className="hidden md:flex items-center justify-center flex-1">
        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 text-slate-400">
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
          ) : (
            <>
              <Save className="w-3 h-3 text-slate-300" />
              <span>{t("builder.saveDraft")}</span>
            </>
          )}
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex h-full items-center gap-2 flex-1 justify-end">

        {/* AI Assistant Button */}
        <Button
          onClick={handleSaveDraft}
          variant="ghost"
          size="sm"
          className="gap-2 h-8 rounded-full text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
          className="gap-1.5 h-8 rounded-full text-[13px] font-medium bg-primary/10 text-primary hover:bg-primary/20 border-transparent transition-colors"
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
          className="gap-2 h-8 rounded-full text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
          className="gap-2 h-8 rounded-full text-[13px] font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          disabled={renderPdfMutation.isPending}
          aria-label={t("builder.downloadCv")}
          title={t("builder.downloadCv")}
        >
          {renderPdfMutation.isPending ? (
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
            <DropdownMenuItem onClick={handleDuplicate} className="gap-2">
              <Copy className="w-4 h-4 text-slate-500" />
              <span>{t("builder.actions.duplicateResume")}</span>
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
      <AlertDialog open={!!importCandidate} onOpenChange={(open) => !open && setImportCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("builder.import.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("builder.import.confirmDesc")}
              <br />
              {t("builder.import.stats", { sections: importSectionsCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("builder.import.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={applyImportedBackup}>{t("builder.import.apply")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
