import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Briefcase, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DocumentPreview } from "../DocumentPreview";

interface CvJdDualPanelProps {
  cvName: string;
  jdText: string;
  jdTitle?: string;
  jdSourceUrl?: string;
  onEditOriginal?: () => void;
}

export function CvJdDualPanel({
  cvName,
  jdText,
  jdTitle,
  jdSourceUrl,
  onEditOriginal,
}: CvJdDualPanelProps) {
  const { t } = useTranslation("diagnosis");
  const [mobileTab, setMobileTab] = useState<"cv" | "jd">("cv");

  const hasJdText = Boolean(jdText && jdText.trim().length > 0);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Mobile/tablet segmented switcher (< 1024px) */}
      <div className="lg:hidden flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMobileTab("cv")}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
            mobileTab === "cv"
              ? "bg-white text-[#2F3437] shadow-sm"
              : "text-[#787774] hover:text-[#2F3437]"
          )}
        >
          <FileText className="w-3.5 h-3.5 text-[#00AEEF]" />
          <span>{t("review.tabCv", { defaultValue: "CV của bạn" })}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("jd")}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
            mobileTab === "jd"
              ? "bg-white text-[#2F3437] shadow-sm"
              : "text-[#787774] hover:text-[#2F3437]"
          )}
        >
          <Briefcase className="w-3.5 h-3.5 text-[#00AEEF]" />
          <span>{t("review.jdLabel", { defaultValue: "Mô tả công việc (JD)" })}</span>
        </button>
      </div>

      {/* Grid: 2 columns on desktop (>= 1024px), one primary scroller below. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: CV Panel */}
        <div
          className={cn(
            "flex flex-col bg-white rounded-xl border border-[#EAEAEA] p-5 shadow-sm space-y-4",
            mobileTab !== "cv" && "hidden lg:flex"
          )}
        >
          <div className="flex items-center justify-between border-b border-[#F1F1EF] pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-[#00AEEF] shrink-0" />
              <h3 className="text-sm font-bold text-[#2F3437] truncate" title={cvName}>
                {cvName}
              </h3>
            </div>
            {onEditOriginal && (
              <Button
                size="sm"
                onClick={onEditOriginal}
                className="bg-[#00AEEF] hover:bg-[#049bd7] text-white font-bold px-3 h-8 rounded-lg text-xs shrink-0"
              >
                {t("preview.editOriginal", { defaultValue: "Sửa CV gốc" })}
              </Button>
            )}
          </div>

          <div className="flex-1 lg:overflow-y-auto lg:max-h-[650px] custom-scrollbar pr-1">
            <DocumentPreview hideEditOriginal />
          </div>
        </div>

        {/* PANEL 2: JD Panel */}
        <div
          className={cn(
            "flex flex-col bg-white rounded-xl border border-[#EAEAEA] p-5 shadow-sm space-y-4",
            mobileTab !== "jd" && "hidden lg:flex"
          )}
        >
          <div className="flex items-center justify-between border-b border-[#F1F1EF] pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Briefcase className="w-4 h-4 text-[#00AEEF] shrink-0" />
              <h3 className="text-sm font-bold text-[#2F3437] truncate">
                {jdTitle || t("review.jdLabel", { defaultValue: "Mô tả công việc (JD)" })}
              </h3>
            </div>
            {jdSourceUrl && (
              <a
                href={jdSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#00AEEF] hover:underline shrink-0"
              >
                <span>{t("jobs.apply", { defaultValue: "Nguồn JD" })}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex-1 lg:overflow-y-auto lg:max-h-[650px] custom-scrollbar pr-1">
            {hasJdText ? (
              <div className="text-xs text-[#2F3437] leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                {jdText}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                <AlertCircle className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-slate-500 font-medium max-w-xs">
                  {t("review.noJdText", { defaultValue: "Chưa có nội dung văn bản JD chi tiết để hiển thị." })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
