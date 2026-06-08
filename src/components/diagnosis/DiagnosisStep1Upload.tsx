import React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, CheckCircle2, Upload, History, Sparkles, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useAuthStore } from "@/store/useAuthStore";
import { JobDescriptionInput } from "./JobDescriptionInput";
import { useAnalyzeCvMutation, useAnalyzeCvWithJdMutation } from "@/hooks/use-diagnosis";
import { getApiErrorMessage } from "@/lib/api-error";
import { IT_ROLES } from "@/constants/it-roles";

export function DiagnosisStep1Upload() {
  const { t } = useTranslation("diagnosis");
  const {
    cvFile, jobDescription, isFromBuilder, builderCvId, builderCvName, targetRole, consentAccepted,
    setCvFile, setTargetRole, setConsentAccepted,
    setHasActivatedJdMode, setTargetStep, setLoadingProgress, setLoadingMsgIdx, setIsAnalyzing,
    setReviewData, setApiError, setAnalysisMode, setStep, setLastCvId, clearBuilderState
  } = useDiagnosisStore();
  
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const analyzeCvMutation = useAnalyzeCvMutation();
  const analyzeCvWithJdMutation = useAnalyzeCvWithJdMutation();

  const [isDragging, setIsDragging] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [showJd, setShowJd] = React.useState(false);

  const hasUsableCv = Boolean(cvFile) || (isFromBuilder && Boolean(builderCvId));

  const validateAndSetFile = (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    const validExts = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    if (file.size > MAX_FILE_SIZE) {
      const errMsg = t("upload.errorFileTooLarge");
      setFileError(errMsg);
      toast({ title: t("upload.toastInvalidTitle"), description: errMsg, variant: "destructive" });
      return;
    }

    if (validTypes.includes(file.type) || validExts.includes(ext ?? "")) {
      setCvFile(file);
      toast({ title: t("upload.toastUploadedTitle"), description: file.name });
    } else {
      const errMsg = t("upload.toastInvalidDesc");
      setFileError(errMsg);
      toast({ title: t("upload.toastInvalidTitle"), description: errMsg, variant: "destructive" });
    }
  };

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const analyzeCvOnly = async () => {
    if (!hasUsableCv) { return toast({ title: t("upload.toastMissingCvTitle"), description: t("upload.toastMissingCvDesc"), variant: "destructive" }); }
    if (!targetRole) { return toast({ title: t("upload.toastMissingRoleTitle"), description: t("upload.toastMissingRoleDesc"), variant: "destructive" }); }

    setHasActivatedJdMode(false);
    setAnalysisMode("cv-only");
    setApiError(null);
    setReviewData(null);
    setTargetStep("cv-review");
    setLoadingProgress(0);
    setLoadingMsgIdx(0);
    setIsAnalyzing(true);

    try {
      const payload = isFromBuilder
        ? { builderCvId, targetRole, consentAccepted }
        : { file: cvFile!, targetRole, consentAccepted };
      const { cvId, review } = await analyzeCvMutation.mutateAsync(payload);
      setLastCvId(cvId);
      setReviewData(review);
      setStep("cv-review");
    } catch (error) {
      const message = getApiErrorMessage(error, t("upload.errorAnalyze"));
      setApiError(message);
      toast({ title: t("upload.toastAnalysisFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      setLoadingProgress(0);
    }
  };

  const analyzeWithJd = async () => {
    if (!hasUsableCv) {
      return toast({ title: t("upload.toastMissingCvTitle"), description: t("upload.toastMissingCvDesc"), variant: "destructive" });
    }
    if (!targetRole) {
      return toast({ title: t("upload.toastMissingRoleTitle"), description: t("upload.toastMissingRoleDesc"), variant: "destructive" });
    }
    if (!jobDescription.trim()) {
      return toast({ title: t("upload.toastMissingJdTitle"), description: t("upload.toastMissingJdDesc"), variant: "destructive" });
    }

    setAnalysisMode("cv-jd");
    setApiError(null);
    setReviewData(null);
    setTargetStep("results");
    setLoadingProgress(0);
    setLoadingMsgIdx(0);
    setIsAnalyzing(true);

    try {
      const payload = isFromBuilder
        ? { builderCvId, targetRole, jdText: jobDescription.trim(), consentAccepted }
        : { file: cvFile!, targetRole, jdText: jobDescription.trim(), consentAccepted };
      const { cvId, review } = await analyzeCvWithJdMutation.mutateAsync(payload);
      setLastCvId(cvId);
      setReviewData(review);
      setHasActivatedJdMode(true);
      setStep("results");
    } catch (error) {
      const message = getApiErrorMessage(error, t("upload.errorCompare"));
      setHasActivatedJdMode(false);
      setApiError(message);
      toast({ title: t("upload.toastAnalysisFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      setLoadingProgress(0);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-400 max-w-4xl mx-auto w-full">
      {/* Auth Banner */}
      {!isAuthenticated && (
        <div className="flex items-center justify-between py-2 px-3 bg-[#FBF3DB] border border-[#F5E6BE] rounded-lg text-slate-700 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{t("authBanner.message")}</span>
          </div>
          <Link to="/login" className="text-primary font-bold hover:underline shrink-0 ml-4">
            {t("authBanner.cta")}
          </Link>
        </div>
      )}

      {/* Main Single Form Card */}
      <Card className="bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-6 space-y-5">
        
        {/* Header Block */}
        <div className="flex items-center justify-between border-b border-[#F1F1EF] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#2F3437]">{t("upload.cardTitle")}</h2>
              <p className="text-xs text-[#787774]">{t("upload.cardSubtitle")}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-[#787774] hover:text-primary gap-1.5 font-medium text-xs px-2.5 h-8 rounded-lg active:scale-[0.98]">
            <History className="w-3.5 h-3.5" /> <span>{t("upload.historyLink")}</span>
          </Button>
        </div>

        {/* 2-Door CV Section */}
        <div>
          {isFromBuilder ? (
            <div className="space-y-3 w-full">
              <p className="text-xs text-[#787774]">{t("upload.builderReady")}</p>
              <div className="flex items-center justify-between p-4 bg-[#EDF3EC]/40 border border-[#DCE9D7] rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#2F3437] truncate">{builderCvName || "Generated_CV.pdf"}</p>
                    <p className="text-xs text-[#787774]">{t("upload.builderSource")}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 text-xs rounded-lg border-primary text-primary hover:bg-primary/5 h-9 active:scale-[0.98]" 
                  onClick={() => setStep("builder")}
                >
                  {t("upload.editInBuilder")}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-xs rounded-lg text-red-500 border-red-200 hover:text-red-600 hover:bg-red-50 hover:border-red-300 h-9 active:scale-[0.98]" 
                  onClick={() => { clearBuilderState(); setCvFile(null); }}
                >
                  {t("upload.removeCv")}
                </Button>
              </div>
            </div>
          ) : cvFile ? (
            <div className="space-y-3 w-full">
              <p className="text-xs text-[#787774]">{t("upload.fileReady")}</p>
              <div className="flex items-center justify-between p-4 bg-[#EDF3EC]/40 border border-[#DCE9D7] rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#2F3437] truncate">{cvFile.name}</p>
                    <p className="text-xs text-[#787774]">{(cvFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="w-full text-xs rounded-lg text-red-500 border-red-200 hover:text-red-600 hover:bg-red-50 hover:border-red-300 h-9 active:scale-[0.98]" 
                  onClick={() => setCvFile(null)}
                >
                  {t("upload.removeCv")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 w-full">
              <label className="text-xs font-semibold text-[#2F3437] block mb-1">{t("upload.twoDoorLabel")}</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Door 1: Upload (with drag-and-drop support) */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={handleDrop}
                  className={cn(
                    "border rounded-xl p-4 flex flex-col justify-between min-h-[140px] transition-all cursor-pointer relative",
                    isDragging 
                      ? "border-primary bg-primary/5" 
                      : "border-[#EAEAEA] bg-white hover:border-slate-300"
                  )}
                >
                  <label htmlFor="cv-upload-2door" className="w-full h-full flex flex-col justify-between absolute inset-0 p-4 cursor-pointer">
                    <div className="space-y-1">
                      <h4 className={cn("font-bold text-xs flex items-center gap-1.5 transition-colors", isDragging ? "text-primary" : "text-slate-800")}>
                        <Upload className={cn("w-4 h-4", isDragging ? "text-primary" : "text-slate-450")} /> 
                        {isDragging ? t("upload.dropActive") : t("upload.doorUploadTitle")}
                      </h4>
                      <p className="text-[11px] text-[#787774] leading-relaxed">
                        {t("upload.doorUploadDesc")}
                      </p>
                    </div>
                    <div className="mt-3 inline-flex items-center justify-center w-full py-1.5 px-3 rounded-lg bg-[#F1F1EF] border border-[#EAEAEA] text-[11px] font-semibold text-[#2F3437] hover:bg-slate-100 transition-colors text-center shrink-0">
                      {t("upload.doorUploadCta")}
                    </div>
                    <input id="cv-upload-2door" type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={handleCVUpload} />
                  </label>
                </div>

                {/* Door 2: AI Builder */}
                <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 flex flex-col justify-between min-h-[140px] transition-all hover:bg-primary/10">
                  <div className="space-y-1">
                    <h4 className="font-bold text-primary text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary" /> {t("upload.doorBuilderTitle")}
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {t("upload.doorBuilderDesc")}
                    </p>
                  </div>
                  <div className="mt-3">
                    <Button onClick={() => setStep("builder")} className="w-full h-8 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg active:scale-[0.98]">
                      {t("upload.doorBuilderCta")}
                    </Button>
                  </div>
                </div>
              </div>
              {fileError && (
                <div className="text-xs text-[#9F2F2D] bg-[#FDEBEC] border border-[#F6D4D5] py-1.5 px-2.5 rounded-lg">
                  {fileError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[#F1F1EF]" />

        {/* Target Role Selector */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#787774] block">
            {t("upload.roleLabel")} <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {IT_ROLES.map((role) => {
              const isSelected = targetRole === role.code;
              return (
                <button
                  key={role.code}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setTargetRole(isSelected ? null : role.code)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40 outline-none active:scale-[0.98]",
                    isSelected
                      ? "bg-primary/5 border-primary text-primary font-semibold"
                      : "bg-white border-[#EAEAEA] text-[#2F3437] hover:border-slate-350"
                  )}
                >
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#F1F1EF]" />

        {/* Collapsible Job Description block */}
        <div className="space-y-3">
          <button 
            type="button" 
            onClick={() => setShowJd(!showJd)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          >
            {showJd ? `- ${t("upload.hideJd")}` : `+ ${t("upload.addJd")}`}
          </button>
          
          {showJd && (
            <div className="animate-in fade-in duration-300">
              <JobDescriptionInput compact={true} />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[#F1F1EF]" />

        {/* Consent Checkbox */}
        {hasUsableCv && (
          <label className="flex items-start gap-3 p-4 bg-[#FBFBFA] border border-[#EAEAEA] rounded-xl cursor-pointer group">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[#EAEAEA] text-primary focus:ring-primary/40 accent-primary shrink-0"
            />
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#787774] mt-0.5 shrink-0" />
              <span className="text-xs text-[#787774] leading-relaxed">{t("upload.consentLabel")}</span>
            </div>
          </label>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={analyzeCvOnly}
            disabled={!hasUsableCv || !targetRole || !consentAccepted || analyzeCvMutation.isPending || analyzeCvWithJdMutation.isPending}
            className={cn("rounded-lg px-8 text-sm font-semibold border transition-all h-11 active:scale-[0.98]",
              hasUsableCv && targetRole && consentAccepted 
                ? "border-slate-300 text-[#2F3437] hover:border-primary hover:text-primary" 
                : "border-[#EAEAEA] bg-white text-slate-400 cursor-not-allowed"
            )}
          >
            <Upload className="mr-2 w-4 h-4" /> {isFromBuilder ? t("upload.analyzeGeneratedCv") : t("upload.analyzeCv")}
          </Button>
          <Button 
            size="lg" 
            onClick={analyzeWithJd}
            disabled={!hasUsableCv || !targetRole || !jobDescription.trim() || !consentAccepted || analyzeCvMutation.isPending || analyzeCvWithJdMutation.isPending}
            className={cn("rounded-lg px-8 text-sm font-semibold transition-all h-11 active:scale-[0.98]",
              hasUsableCv && targetRole && jobDescription.trim() && consentAccepted 
                ? "bg-primary hover:bg-primary/90 text-white" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            <Sparkles className="mr-2 w-4 h-4" /> {isFromBuilder ? t("upload.compareGeneratedJd") : t("upload.compareJd")}
          </Button>
        </div>

        {/* Helper text */}
        {(!hasUsableCv || !targetRole || !consentAccepted) && (
          <p className="text-center text-xs text-[#787774] mt-1">{t("upload.helper")}</p>
        )}
      </Card>
    </div>
  );
}
