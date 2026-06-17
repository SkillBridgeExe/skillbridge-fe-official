import { Button } from "@/components/ui/button";
import { Download, FilePenLine, Save, Loader2, Sparkles } from "lucide-react";
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

export function CvBuilderHeader() {
  const { t } = useTranslation("diagnosis");
  const hasApiSession = useHasApiSession();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { saveStatus, lastSavedTime, triggerSaveRef } = useAutosaveStore();
  const draftId = useCvBuilderStore((s) => s.draftId);
  const seededFromDiagnosis = useCvBuilderStore((s) => s.seededFromDiagnosis);
  const title = useCvBuilderStore((s) => s.fullName); // sử dụng fullName làm title CV hoặc mặc định
  const renderPdfMutation = useRenderBuilderPdfMutation();
  const analyzeCvMutation = useAnalyzeCvMutation();

  const handleSaveDraft = () => {
    if (triggerSaveRef.current) {
      triggerSaveRef.current();
    } else {
      toast({
        title: t("builder.toastSavedTitle"),
        description: t("builder.toastSavedDesc"),
      });
    }
  };

  const handleDownload = async () => {
    if (!draftId) return;

    // 1. Flush draft changes trước khi download
    if (triggerSaveRef.current) {
      triggerSaveRef.current();
    }

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

  const handleAnalyze = async () => {
    if (!draftId) return;

    // 1. Flush changes trước
    if (triggerSaveRef.current) {
      triggerSaveRef.current();
    }

    {
      const diagnosisStore = useDiagnosisStore.getState();

      if (seededFromDiagnosis && diagnosisStore.reviewData) {
        diagnosisStore.setStep("cv-review");
        return;
      }

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
      return;
    }

    // 2. Set diagnosis store values
    const diagnosisStore = useDiagnosisStore.getState();
    diagnosisStore.setIsFromBuilder(true);
    diagnosisStore.setBuilderCvId(draftId);
    diagnosisStore.setBuilderCvName(title || "CV Builder draft");

    // 3. Navigate to /diagnosis
    navigate("/diagnosis");
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <FilePenLine className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-tight">SkillBridge CV Builder</h1>
          <p className="text-[11px] text-slate-500 font-medium">{t("builder.headerSubtitle")}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {saveStatus === "local" ? (
          <span className="text-xs text-[#787774] max-w-[280px] text-right font-medium">
            {hasApiSession ? t("builder.localOnlyAuthed") : t("builder.localOnly")}
          </span>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="gap-2 min-w-[125px]"
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                  <span>{t("builder.saving")}</span>
                </>
              ) : saveStatus === "saved" && lastSavedTime ? (
                <>
                  <Save className="w-4 h-4 text-emerald-500" />
                  <span>{t("builder.savedAt", { time: lastSavedTime })}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t("builder.saveDraft")}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
              disabled={renderPdfMutation.isPending}
            >
              {renderPdfMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("builder.rendering")}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{t("builder.downloadCv")}</span>
                </>
              )}
            </Button>

            <Button
              onClick={handleAnalyze}
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-md"
              disabled={analyzeCvMutation.isPending}
            >
              {analyzeCvMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{analyzeCvMutation.isPending ? t("loading.scoring") : t("builder.analyzeCv")}</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
