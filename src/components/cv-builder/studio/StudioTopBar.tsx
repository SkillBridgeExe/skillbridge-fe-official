import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Save, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAutosaveStore } from "@/store/useAutosaveStore";
import { useTranslation } from "react-i18next";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useHasApiSession } from "@/hooks/use-api-session";
import { useRenderBuilderPdfMutation } from "@/hooks/use-cv-builder";
import { useAnalyzeCvMutation } from "@/hooks/use-diagnosis";
import { getApiErrorMessage } from "@/lib/api-error";
import { useCompanionStore } from "@/store/useCompanionStore";

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
        a.download = `${title || "cv"}-skillbridge.pdf`;
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

  const handleAnalyze = async () => {
    const diagnosisStore = useDiagnosisStore.getState();

    if (isLocalMode || !draftId) {
      showLocalActionToast();
      return;
    }

    if (!(await flushDraftChanges())) return;

    diagnosisStore.setIsFromBuilder(true);
    diagnosisStore.setBuilderCvId(draftId);
    diagnosisStore.setBuilderCvName(title || "CV Builder draft");

    if (!diagnosisStore.targetRole || !diagnosisStore.consentAccepted) {
      diagnosisStore.setStep("input");
      navigate(`/diagnosis?source=builder&cvId=${encodeURIComponent(draftId)}`, {
        state: {
          source: "builder",
          cvId: draftId,
          cvName: title || "CV Builder draft",
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

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 z-10 pr-4 xl:pr-6 pl-0 sticky top-0 shadow-sm">
      <div className="flex h-full items-center gap-0 flex-1">
        
        {/* Back Button (aligned with 56px sidebar) */}
        <div className="w-[56px] h-full flex items-center justify-center border-r border-slate-200 shrink-0">
          <button
            onClick={handleBackToDiagnosis}
            className="group flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/40"
            title={t("builder.backToDiagnosis")}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Document Title - Editable */}
        <div className="flex items-center gap-2 max-w-[200px] sm:max-w-[300px] pl-4">
          <input 
            type="text" 
            className="font-medium text-sm text-slate-800 bg-transparent border-none outline-none focus:ring-1 focus:ring-slate-200 rounded px-2 py-1 w-full truncate hover:bg-slate-50"
            value={title || "Untitled Resume"}
            onChange={(e) => useCvBuilderStore.getState().setBasicInfo("fullName", e.target.value)}
          />
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
          className="gap-2 h-8 text-xs font-medium text-slate-600 hover:text-slate-900"
          disabled={saveStatus === "saving"}
        >
          {saveStatus === "saving" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{t("builder.saveDraft")}</span>
        </Button>

        <Button
          onClick={() => {
            const id = "cvbuilder:general";
            useCompanionStore.getState().registerContext({
              id,
              getTurn: () => ({
                skill: "cv_builder",
                props: {
                  draftId: draftId || "",
                  fieldPath: id,
                  section: "general",
                  currentValue: "",
                  onApply: () => {},
                },
              }),
            });
            useCompanionStore.getState().activateContext(id);
            useCompanionStore.setState({ bubbleOpen: true });
          }}
          variant="secondary"
          size="sm"
          className="gap-1.5 h-8 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("builder.aiAssistant", { defaultValue: "AI Assistant" })}</span>
        </Button>

        {/* Analyze button (kept but made secondary) */}
        <Button
          onClick={handleAnalyze}
          variant="ghost"
          size="sm"
          className="gap-2 h-8 text-xs font-medium text-slate-600 hover:text-slate-900"
          disabled={analyzeCvMutation.isPending}
        >
          {analyzeCvMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{analyzeCvMutation.isPending ? t("loading.scoring") : t("builder.analyzeCv")}</span>
        </Button>

        {/* Download PDF button */}
        <Button
          variant="default"
          size="sm"
          onClick={handleDownload}
          className="gap-2 h-8 text-xs font-medium"
          disabled={renderPdfMutation.isPending}
        >
          {renderPdfMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{t("builder.downloadCv", { defaultValue: "Download PDF" })}</span>
        </Button>
      </div>
    </header>
  );
}
