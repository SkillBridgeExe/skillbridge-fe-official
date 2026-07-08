import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { usePostHog } from "@posthog/react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { CheckCircle2, Upload, History, Sparkles, ShieldCheck, Trash2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useHasApiSession } from "@/hooks/use-api-session";
import { JobDescriptionInput } from "./JobDescriptionInput";
import {
  useAnalyzeCvMutation,
  useAnalyzeCvWithJdMutation,
  useCvHistoryQuery,
  useLoadCvFromHistoryMutation,
} from "@/hooks/use-diagnosis";
import { getApiErrorCode, getApiErrorMessage, isThrottledError } from "@/lib/api-error";
import { extractAiGateCode } from "@/lib/ai-input-gate";
import { IT_ROLES, getRoleLabel } from "@/constants/it-roles";
import { QUERY_KEYS } from "@/constants/app";
import { useQuery } from "@tanstack/react-query";
import { getMyEntitlements } from "@/services/billing.service";
import { ActionRail } from "./editorial";
import { useCompanionStore } from "@/store/useCompanionStore";
import {
  buildCvUploadedEventProperties,
  createCvUploadId,
  getCvUploadScanProperties,
  type CvUploadInputMethod,
} from "@/lib/cv-analytics";

/**
 * "Còn x/y lượt chấm" từ GET /api/me/entitlements (BE #49) — số thật theo plan,
 * reset theo period (DAILY cho cv_review). Hết lượt → cảnh báo + gợi ý nâng cấp;
 * nút Analyze không bị khoá cứng ở FE (BE vẫn là người gác 402).
 */
function QuotaLine({
  enabled,
  t,
}: {
  enabled: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const { data } = useQuery({
    queryKey: QUERY_KEYS.BILLING_ENTITLEMENTS,
    queryFn: getMyEntitlements,
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
  const review = data?.find((f) => f.feature === "cv_review");
  if (!review || review.unlimited) return null;

  const exhausted = !review.allowed;
  return (
    <div
      className={
        exhausted
          ? "flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold bg-[#FDEBEC] text-[#9F2F2D]"
          : "flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold bg-[#F4F5F5] text-slate-500"
      }
    >
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
      <span>
        {exhausted
          ? t("quota.exhausted")
          : t(review.period === "DAILY" ? "quota.remainingDaily" : "quota.remainingMonthly", {
              remaining: review.remaining ?? 0,
              limit: review.limit,
            })}
      </span>
      {exhausted && (
        <Link to="/pricing" className="ml-1 font-bold text-primary hover:underline shrink-0">
          {t("quota.upgradeCta")}
        </Link>
      )}
    </div>
  );
}

export function DiagnosisStep1Upload() {
  const { t, i18n } = useTranslation("diagnosis");
  const {
    cvFile, jobDescription, isFromBuilder, builderCvId, builderCvName, targetRole, consentAccepted,
    setCvFile, setJobDescription, setTargetRole, setConsentAccepted,
    setHasActivatedJdMode, setTargetStep, setLoadingProgress, setLoadingMsgIdx, setIsAnalyzing,
    setReviewData, setApiError, setAnalysisMode, setStep, setLastCvId, clearBuilderState
  } = useDiagnosisStore();
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasApiSession = useHasApiSession();
  const { toast } = useToast();
  const posthog = usePostHog();
  const analyzeCvMutation = useAnalyzeCvMutation();
  const analyzeCvWithJdMutation = useAnalyzeCvWithJdMutation();

  const [isDragging, setIsDragging] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [showJd, setShowJd] = React.useState(false);
  const [cvUploadId, setCvUploadId] = React.useState<string | null>(null);

  // Lịch sử W7: list khi mở Sheet; mở lại 1 CV = đọc review đã lưu (không tốn quota).
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const historyQuery = useCvHistoryQuery(historyOpen && hasApiSession);
  const loadFromHistoryMutation = useLoadCvFromHistoryMutation();
  const loadingHistoryId = loadFromHistoryMutation.isPending
    ? loadFromHistoryMutation.variables
    : null;

  const hasUsableCv = Boolean(cvFile) || (isFromBuilder && Boolean(builderCvId));
  const cvSource = isFromBuilder ? "builder" : "upload";

  /* ── Companion: Step-1 upload guide (#16) ── */
  useEffect(() => {
    const store = useCompanionStore.getState();
    store.registerContext({
      id: "diagnosis:upload",
      priority: 5,
      getTurn: () => ({
        skill: "diagnosis_upload",
        props: {
          message: t("companion.upload.greet"),
        },
      }),
    });
    store.activateContext("diagnosis:upload");
    return () => useCompanionStore.getState().unregisterContext("diagnosis:upload");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatHistoryDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language?.startsWith("vi") ? "vi-VN" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const openFromHistory = (id: string) => {
    loadFromHistoryMutation.mutate(id, {
      onSuccess: ({ cvId, review }) => {
        setLastCvId(cvId);
        setReviewData(review);
        setApiError(null);
        setAnalysisMode("cv-only");
        setHasActivatedJdMode(false);
        setHistoryOpen(false);
        setStep("cv-review");
      },
      onError: (error) => {
        toast({
          title: t("upload.history.loadFailedTitle"),
          description: getApiErrorMessage(error, t("upload.history.loadFailedDesc")),
          variant: "destructive",
        });
      },
    });
  };

  const validateAndSetFile = (
    file: File | undefined,
    inputMethod: CvUploadInputMethod,
  ) => {
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
      const nextCvUploadId = createCvUploadId();
      setCvFile(file);
      setCvUploadId(nextCvUploadId);
      posthog?.capture(
        "cv_uploaded",
        buildCvUploadedEventProperties({
          cvUploadId: nextCvUploadId,
          file,
          inputMethod,
          targetRole,
          jobDescription,
          consentAccepted,
        }),
      );
      toast({ title: t("upload.toastUploadedTitle"), description: file.name });
    } else {
      const errMsg = t("upload.toastInvalidDesc");
      setFileError(errMsg);
      toast({ title: t("upload.toastInvalidTitle"), description: errMsg, variant: "destructive" });
    }
  };

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file, "file_picker");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file, "drag_drop");
  };

  const analyzeCvOnly = async () => {
    if (!hasUsableCv) { return toast({ title: t("upload.toastMissingCvTitle"), description: t("upload.toastMissingCvDesc"), variant: "destructive" }); }
    if (!targetRole) { return toast({ title: t("upload.toastMissingRoleTitle"), description: t("upload.toastMissingRoleDesc"), variant: "destructive" }); }

    const scanProperties = {
      mode: "cv_only",
      cv_source: cvSource,
      target_role: targetRole,
      ...(isFromBuilder && builderCvId ? { source_cv_id: builderCvId } : {}),
      ...getCvUploadScanProperties(cvSource, cvUploadId),
    };
    posthog?.capture("cv_scan_started", scanProperties);

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
      posthog?.capture("cv_scan_completed", {
        ...scanProperties,
        cv_id: cvId,
        overall_score: review.overallScore,
      });
      setLastCvId(cvId);
      setReviewData(review);
      setStep("cv-review");
    } catch (error) {
      const gateCode = extractAiGateCode(error);
      const message =
        isThrottledError(error)
          ? t("upload.throttled")
          : gateCode === "CV_CONTENT_INSUFFICIENT"
            ? t("aiGate.cvUnreadable")
            : getApiErrorMessage(error, t("upload.errorAnalyze"));
      posthog?.capture("cv_scan_failed", {
        ...scanProperties,
        error_code: gateCode ?? getApiErrorCode(error) ?? "unknown",
      });
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

    const scanProperties = {
      mode: "cv_jd",
      cv_source: cvSource,
      target_role: targetRole,
      ...(isFromBuilder && builderCvId ? { source_cv_id: builderCvId } : {}),
      ...getCvUploadScanProperties(cvSource, cvUploadId),
    };
    posthog?.capture("cv_scan_started", scanProperties);

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
      posthog?.capture("cv_scan_completed", {
        ...scanProperties,
        cv_id: cvId,
        match_id: review.jdMatch?.matchId,
        overall_score: review.overallScore,
        match_score: review.jdMatch?.matchScore,
      });
      setLastCvId(cvId);
      setReviewData(review);
      setHasActivatedJdMode(true);
      setStep("results");
    } catch (error) {
      const gateCode = extractAiGateCode(error);
      const message =
        isThrottledError(error)
          ? t("upload.throttled")
          : gateCode === "CV_CONTENT_INSUFFICIENT"
            ? t("aiGate.cvUnreadable")
            : gateCode === "JD_CONTENT_INSUFFICIENT"
              ? t("aiGate.jdThin")
              : getApiErrorMessage(error, t("upload.errorCompare"));
      posthog?.capture("cv_scan_failed", {
        ...scanProperties,
        error_code: gateCode ?? getApiErrorCode(error) ?? "unknown",
      });
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
          <Link to="/?auth=login" className="text-primary font-bold hover:underline shrink-0 ml-4">
            {t("authBanner.cta")}
          </Link>
        </div>
      )}

      {/* Header moved outside the white card */}
      <div className="flex items-center justify-end gap-3 pb-3">
        {hasApiSession && <QuotaLine enabled={hasApiSession} t={t} />}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHistoryOpen(true)}
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 gap-1.5 font-bold text-xs uppercase tracking-wider px-3 h-8 rounded-lg active:scale-[0.98] shrink-0"
        >
          <History className="w-3.5 h-3.5" /> <span>{t("upload.historyLink")}</span>
        </Button>
      </div>

      {/* Main Form Double-Bezel Card */}
      <div className="bg-slate-50/50 p-2 md:p-3 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in zoom-in-95 duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
        <div className="bg-white rounded-[calc(2.5rem-0.75rem)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 p-6 md:p-10 lg:p-12 space-y-0">

        {/* 2-Door CV Section */}
        <div>
          {isFromBuilder ? (
            <div className="w-full">
              <div className="flex items-center justify-between p-4 bg-[#EDF3EC]/40 border border-[#DCE9D7] rounded-xl relative group">
                <div className="flex items-center gap-3 min-w-0 pr-8">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#2F3437] truncate">{builderCvName || "Generated_CV.pdf"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-[#787774]">{t("upload.builderSource")}</p>
                      <button 
                        onClick={() => setStep("builder")}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        {t("upload.editInBuilder")}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearBuilderState();
                    setCvFile(null);
                    setCvUploadId(null);
                  }}
                  className="absolute right-4 text-slate-400 hover:text-red-500 transition-colors p-2 rounded-md hover:bg-red-50"
                  title={t("upload.removeCv")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : cvFile ? (
            <div className="w-full">
              <div className="flex items-center justify-between p-4 bg-[#EDF3EC]/40 border border-[#DCE9D7] rounded-xl relative group">
                <div className="flex items-center gap-3 min-w-0 pr-8">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#2F3437] truncate">{cvFile.name}</p>
                    <p className="text-xs text-[#787774]">{(cvFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCvFile(null);
                    setCvUploadId(null);
                  }}
                  className="absolute right-4 text-slate-400 hover:text-red-500 transition-colors p-2 rounded-md hover:bg-red-50"
                  title={t("upload.removeCv")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">{t("upload.twoDoorLabel")}</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                
                {/* Door 1: Upload (with drag-and-drop support) */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={handleDrop}
                  className={cn(
                    "rounded-[1.5rem] p-6 md:p-8 flex flex-col justify-between min-h-[160px] md:min-h-[180px] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer relative border",
                    isDragging 
                      ? "bg-ink-accent/5 ring-2 ring-ink-accent/40 border-transparent" 
                      : "bg-[#F8FAFC] border-slate-200/60 hover:border-ink-accent/30 hover:shadow-md hover:bg-white active:scale-[0.98]"
                  )}
                >
                  <label htmlFor="cv-upload-2door" className="w-full h-full flex flex-col justify-between absolute inset-0 p-6 md:p-8 cursor-pointer">
                    <div className="space-y-2">
                      {/* Eyebrow */}
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t("editorial.whyUpload")}</p>
                      <h4 className={cn("font-bold text-sm md:text-base flex items-center gap-2 transition-colors", isDragging ? "text-ink-accent" : "text-slate-800")}>
                        <Upload className={cn("w-4 h-4 md:w-5 md:h-5", isDragging ? "text-ink-accent" : "text-slate-400")} /> 
                        {isDragging ? t("upload.dropActive") : t("upload.doorUploadTitle")}
                      </h4>
                      <p className="text-xs md:text-sm text-slate-500 leading-relaxed pr-2">
                        {t("upload.doorUploadDesc")}
                      </p>
                    </div>
                    <div className="mt-6 inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm transition-all text-center shrink-0">
                      {t("upload.doorUploadCta")}
                    </div>
                    <input id="cv-upload-2door" type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={handleCVUpload} />
                  </label>
                </div>

                {/* Door 2: AI Builder */}
                <div className="bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] border border-slate-200/50 rounded-[1.5rem] p-6 md:p-8 flex flex-col justify-between min-h-[160px] md:min-h-[180px] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-md hover:border-ink-accent/30 cursor-pointer active:scale-[0.98]" onClick={() => setStep("builder")}>
                  <div className="space-y-2">
                    {/* Eyebrow */}
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t("editorial.whyBuilder")}</p>
                    <h4 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-ink-accent" /> {t("upload.doorBuilderTitle")}
                    </h4>
                    <p className="text-xs md:text-sm text-slate-500 leading-relaxed pr-2">
                      {t("upload.doorBuilderDesc")}
                    </p>
                  </div>
                  <div className="mt-6">
                    <Button onClick={() => setStep("builder")} className="w-full h-11 text-xs font-bold bg-ink-accent hover:bg-ink-accent/90 text-white rounded-xl shadow-lg shadow-ink-accent/20 transition-all">
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

        {/* Target Role Selector */}
        <div className="space-y-6 mt-12">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              {t("upload.roleLabel")} <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded-sm">(Bắt buộc)</span>
            </label>
            <Select 
              value={targetRole || ""} 
              onValueChange={(val) => setTargetRole(val)}
            >
              <SelectTrigger className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-ink-accent/30 focus:border-ink-accent shadow-sm transition-all text-sm font-medium hover:bg-white">
                <SelectValue placeholder={t("upload.rolePlaceholder")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                {IT_ROLES.map((role) => (
                  <SelectItem key={role.code} value={role.code} className="cursor-pointer py-3 text-sm font-medium focus:bg-slate-50 focus:text-ink-accent">
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Description block */}
          <div className="space-y-3">
            {!showJd ? (
              <div className="pt-2">
                <button 
                  type="button"
                  onClick={() => setShowJd(true)}
                  className="text-sm font-semibold text-ink-accent hover:text-ink-accent/80 transition-colors flex items-center gap-1 mb-2"
                >
                  {t("upload.addJd")} <ChevronDown className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-800">{t("upload.jdLabel")}</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowJd(false);
                      setJobDescription(""); // clear it out if they hide it
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {t("upload.removeJd")}
                  </button>
                </div>
                <JobDescriptionInput compact={true} />
              </div>
            )}
          </div>
        </div>

        {/* Consent Checkbox */}
        {hasUsableCv && (
          <div className="mt-8">
            <label className="flex items-start gap-3 py-2 cursor-pointer group transition-colors select-none">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-[3px] w-4 h-4 rounded border-slate-300 text-ink-accent focus:ring-ink-accent/40 accent-ink-accent shrink-0 cursor-pointer"
              />
              <span className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                {t("upload.consentLabel")}
              </span>
            </label>
          </div>
        )}

        {/* CTA — ActionRail */}
        <div className="pt-4">
          <ActionRail
            primaryLabel={
              isFromBuilder
                ? (showJd && jobDescription.trim() ? t("upload.compareGeneratedJd") : t("upload.analyzeGeneratedCv"))
                : (showJd && jobDescription.trim() ? t("upload.compareJd") : t("upload.analyzeCv"))
            }
            primaryIcon={showJd && jobDescription.trim() ? <Sparkles className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            primaryAction={showJd && jobDescription.trim() ? analyzeWithJd : analyzeCvOnly}
            primaryDisabled={
              !hasUsableCv || 
              !targetRole || 
              !consentAccepted || 
              analyzeCvMutation.isPending || 
              analyzeCvWithJdMutation.isPending ||
              (showJd && !jobDescription.trim())
            }
            helperText={(!hasUsableCv || !targetRole || !consentAccepted) ? t("upload.helper") : null}
          />
        </div>
        </div>
      </div>
      
      {/* History Sheet — mở lại kết quả đã chấm từ GET /api/cvs (W7), không tốn quota */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#F1F1EF] text-left">
            <SheetTitle className="text-sm font-bold text-[#2F3437]">
              {t("upload.history.title")}
            </SheetTitle>
            <SheetDescription className="text-xs text-[#787774]">
              {t("upload.history.subtitle")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {!isAuthenticated ? (
              <div className="text-xs text-[#787774] leading-relaxed space-y-2">
                <p>{t("authBanner.message")}</p>
                <Link to="/?auth=login" className="text-primary font-bold hover:underline inline-block">
                  {t("authBanner.cta")}
                </Link>
              </div>
            ) : historyQuery.isLoading ? (
              <p className="text-xs text-[#787774]">{t("upload.history.loading")}</p>
            ) : historyQuery.isError ? (
              <div className="text-xs text-[#9F2F2D] bg-[#FDEBEC] border border-[#F6D4D5] py-1.5 px-2.5 rounded-lg">
                {getApiErrorMessage(historyQuery.error, t("upload.history.loadFailedDesc"))}
              </div>
            ) : !historyQuery.data?.items.length ? (
              <p className="text-xs text-[#787774]">{t("upload.history.empty")}</p>
            ) : (
              historyQuery.data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openFromHistory(item.id)}
                  disabled={loadFromHistoryMutation.isPending}
                  className="w-full text-left p-3 rounded-xl border border-[#EAEAEA] bg-white hover:border-ink-accent/50 hover:bg-ink-accent-tint transition-colors disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-ink-accent/40 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#2F3437] truncate">
                        {item.title || item.originalFileName || t("upload.history.untitled")}
                      </p>
                      <p className="text-[11px] text-[#787774] mt-0.5">
                        {[getRoleLabel(item.targetRole), formatHistoryDate(item.createdAt)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {loadingHistoryId === item.id ? (
                      <span className="text-[11px] text-[#787774] shrink-0">
                        {t("upload.history.opening")}
                      </span>
                    ) : typeof item.atsReadabilityScore === "number" ? (
                      <span className="font-mono text-xs font-bold text-ink-accent shrink-0">
                        {Math.round(item.atsReadabilityScore)}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
