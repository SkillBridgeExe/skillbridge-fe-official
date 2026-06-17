import React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CheckCircle2, Upload, History, Sparkles, ShieldCheck } from "lucide-react";
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
import { getApiErrorMessage } from "@/lib/api-error";
import { extractAiGateCode } from "@/lib/ai-input-gate";
import { IT_ROLES, getRoleLabel } from "@/constants/it-roles";
import { QUERY_KEYS } from "@/constants/app";
import { useQuery } from "@tanstack/react-query";
import { getMyEntitlements } from "@/services/billing.service";
import { SectionRule, ActionRail } from "./editorial";

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
          ? "flex items-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium bg-[#FDEBEC] border-[#F6D4D5] text-[#9F2F2D]"
          : "flex items-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium bg-[#F7F6F3] border-[#EAEAEA] text-[#787774]"
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
        <Link to="/pricing" className="ml-auto font-bold text-primary hover:underline shrink-0">
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
    setCvFile, setTargetRole, setConsentAccepted,
    setHasActivatedJdMode, setTargetStep, setLoadingProgress, setLoadingMsgIdx, setIsAnalyzing,
    setReviewData, setApiError, setAnalysisMode, setStep, setLastCvId, clearBuilderState
  } = useDiagnosisStore();
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasApiSession = useHasApiSession();
  const { toast } = useToast();
  const analyzeCvMutation = useAnalyzeCvMutation();
  const analyzeCvWithJdMutation = useAnalyzeCvWithJdMutation();

  const [isDragging, setIsDragging] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [showJd, setShowJd] = React.useState(false);

  // Lịch sử W7: list khi mở Sheet; mở lại 1 CV = đọc review đã lưu (không tốn quota).
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const historyQuery = useCvHistoryQuery(historyOpen && hasApiSession);
  const loadFromHistoryMutation = useLoadCvFromHistoryMutation();
  const loadingHistoryId = loadFromHistoryMutation.isPending
    ? loadFromHistoryMutation.variables
    : null;

  const hasUsableCv = Boolean(cvFile) || (isFromBuilder && Boolean(builderCvId));

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
      const gateCode = extractAiGateCode(error);
      const message =
        gateCode === "CV_CONTENT_INSUFFICIENT"
          ? t("aiGate.cvUnreadable")
          : getApiErrorMessage(error, t("upload.errorAnalyze"));
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
      const gateCode = extractAiGateCode(error);
      const message =
        gateCode === "CV_CONTENT_INSUFFICIENT"
          ? t("aiGate.cvUnreadable")
          : gateCode === "JD_CONTENT_INSUFFICIENT"
            ? t("aiGate.jdThin")
            : getApiErrorMessage(error, t("upload.errorCompare"));
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

      {/* Main Form Card */}
      <Card className="bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-6 space-y-0">
        
        {/* Header — minimal: the page headline already introduces this screen */}
        <div className="flex items-center justify-end pb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="text-[#787774] hover:text-primary gap-1.5 font-medium text-xs px-2.5 h-8 rounded-lg active:scale-[0.98] shrink-0"
          >
            <History className="w-3.5 h-3.5" /> <span>{t("upload.historyLink")}</span>
          </Button>
        </div>

        {/* Quota thật theo plan (ẩn với mock account — không có session BE) */}
        {hasApiSession && <QuotaLine enabled={hasApiSession} t={t} />}

        <SectionRule className="my-5" />

        {/* 2-Door CV Section */}
        <div>
          {isFromBuilder ? (
            <div className="space-y-3 w-full">
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
                      ? "border-ink-accent bg-ink-accent-tint" 
                      : "border-[#EAEAEA] bg-white hover:border-slate-300"
                  )}
                >
                  <label htmlFor="cv-upload-2door" className="w-full h-full flex flex-col justify-between absolute inset-0 p-4 cursor-pointer">
                    <div className="space-y-1">
                      {/* Eyebrow */}
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9B9B97]">{t("editorial.whyUpload")}</p>
                      <h4 className={cn("font-bold text-xs flex items-center gap-1.5 transition-colors", isDragging ? "text-ink-accent" : "text-slate-800")}>
                        <Upload className={cn("w-4 h-4", isDragging ? "text-ink-accent" : "text-slate-450")} /> 
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
                <div className="border border-ink-accent/30 bg-ink-accent-tint rounded-xl p-4 flex flex-col justify-between min-h-[140px] transition-all hover:bg-ink-accent/10">
                  <div className="space-y-1">
                    {/* Eyebrow */}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9B9B97]">{t("editorial.whyBuilder")}</p>
                    <h4 className="font-bold text-ink-accent text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-ink-accent" /> {t("upload.doorBuilderTitle")}
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {t("upload.doorBuilderDesc")}
                    </p>
                  </div>
                  <div className="mt-3">
                    <Button onClick={() => setStep("builder")} className="w-full h-8 text-[11px] font-semibold bg-ink-accent hover:bg-ink-accent/90 text-white rounded-lg active:scale-[0.98]">
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

        <SectionRule className="my-5" />

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
                    "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ink-accent/40 outline-none active:scale-[0.98]",
                    isSelected
                      ? "bg-ink-accent-tint border-ink-accent text-ink-accent font-semibold"
                      : "bg-white border-[#EAEAEA] text-[#2F3437] hover:border-slate-350"
                  )}
                >
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>

        <SectionRule className="my-5" />

        {/* Collapsible Job Description block */}
        <div className="space-y-3">
          <button 
            type="button" 
            onClick={() => setShowJd(!showJd)}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-accent hover:underline py-1 outline-none focus-visible:ring-2 focus-visible:ring-ink-accent/40 rounded"
          >
            {showJd ? `- ${t("upload.hideJd")}` : `+ ${t("upload.addJd")}`}
          </button>
          
          {showJd && (
            <div className="animate-in fade-in duration-300">
              <JobDescriptionInput compact={true} />
            </div>
          )}
        </div>

        <SectionRule className="my-5" />

        {/* Consent Checkbox — elevated visual */}
        {hasUsableCv && (
          <label className={cn(
            "flex items-start gap-3 p-4 border rounded-xl cursor-pointer group transition-colors",
            consentAccepted
              ? "bg-ink-accent-tint border-ink-accent/20"
              : "bg-[#FBFBFA] border-[#EAEAEA]"
          )}>
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[#EAEAEA] text-ink-accent focus:ring-ink-accent/40 accent-ink-accent shrink-0"
            />
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#787774] mt-0.5 shrink-0" />
              <span className="text-xs text-[#787774] leading-relaxed">{t("upload.consentLabel")}</span>
            </div>
          </label>
        )}

        {/* CTA — ActionRail */}
        <div className="pt-2">
          <ActionRail
            secondaryLabel={isFromBuilder ? t("upload.analyzeGeneratedCv") : t("upload.analyzeCv")}
            secondaryIcon={<Upload className="w-4 h-4" />}
            secondaryAction={analyzeCvOnly}
            secondaryDisabled={!hasUsableCv || !targetRole || !consentAccepted || analyzeCvMutation.isPending || analyzeCvWithJdMutation.isPending}
            primaryLabel={isFromBuilder ? t("upload.compareGeneratedJd") : t("upload.compareJd")}
            primaryIcon={<Sparkles className="w-4 h-4" />}
            primaryAction={analyzeWithJd}
            primaryDisabled={!hasUsableCv || !targetRole || !jobDescription.trim() || !consentAccepted || analyzeCvMutation.isPending || analyzeCvWithJdMutation.isPending}
            helperText={(!hasUsableCv || !targetRole || !consentAccepted) ? t("upload.helper") : null}
          />
        </div>
      </Card>

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
