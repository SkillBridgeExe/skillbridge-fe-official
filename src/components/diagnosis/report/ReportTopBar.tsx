import { useRef, useEffect } from "react";
import { ArrowLeft, Briefcase, Menu, RotateCcw, RefreshCw, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { getRoleLabel } from "@/constants/it-roles";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { cn } from "@/lib/utils";

import type { ReportTab } from "@/pages/user/Diagnosis";

export type { ReportTab };

interface ReportTopBarProps {
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
  mode?: 'review' | 'match';
  jdTitle?: string;
  onBackToReview?: () => void;
}

export function ReportTopBar({ activeTab, onTabChange, mode = 'review', jdTitle, onBackToReview }: ReportTopBarProps) {
  const { t } = useTranslation("diagnosis");
  const step = useDiagnosisStore((s) => s.step);
  const targetRole = useDiagnosisStore((s) => s.targetRole);
  const goBack = useDiagnosisStore((s) => s.goBack);
  const reset = useDiagnosisStore((s) => s.reset);
  const scanAgain = useDiagnosisStore((s) => s.scanAgain);
  const setShowJdInput = useDiagnosisStore((s) => s.setShowJdInput);
  const cvFile = useDiagnosisStore((s) => s.cvFile);
  const builderCvName = useDiagnosisStore((s) => s.builderCvName);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  const roleName = targetRole ? getRoleLabel(targetRole) : "";
  const isMatch = mode === 'match';

  const backLabelText = isMatch
    ? t("review.matchTitle", { defaultValue: "Kết quả khớp CV–JD" })
    : roleName
      ? `${t("review.title", { defaultValue: "Phân tích CV" })} · ${roleName}`
      : t("review.title", { defaultValue: "Phân tích CV" });

  const cvName = cvFile?.name || builderCvName || t("review.fallbackCvName", { defaultValue: "CV chưa đặt tên" });
  const displayJdTitle = jdTitle || t("review.defaultJdName", { defaultValue: "JD đã tải lên" });

  const reviewTabItems: Array<{ key: ReportTab; label: string }> = [
    { key: "audit", label: t("review.tabAudit", { defaultValue: "Đánh giá CV" }) },
    { key: "cv", label: t("review.tabCv", { defaultValue: "CV của bạn" }) },
    { key: "market", label: t("review.tabMarket", { defaultValue: "Thị trường tuyển dụng" }) },
  ];

  const matchTabItems: Array<{ key: ReportTab; label: string }> = [
    { key: "fit", label: t("review.tabFit", { defaultValue: "Mức độ phù hợp" }) },
    { key: "cv_jd", label: t("review.tabCvJd", { defaultValue: "CV & JD" }) },
    { key: "jobs", label: t("review.tabJobs", { defaultValue: "Việc làm liên quan" }) },
  ];

  const tabItems = isMatch ? matchTabItems : reviewTabItems;

  useEffect(() => {
    if (activeTabRef.current?.scrollIntoView) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab]);

  return (
    <div className="sticky top-0 z-30 w-full bg-white flex flex-col shrink-0 select-none">
      {/* ROW 1: Utility bar (h-14 = 56px) */}
      <div className="h-14 border-b border-[#EAEAEA] flex items-center justify-between px-3 sm:px-4 md:px-6 w-full gap-2">
        {/* Left cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-slate-50 text-[#787774] shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <button
            data-testid="back-button"
            onClick={isMatch && onBackToReview ? onBackToReview : goBack}
            className="flex items-center gap-1.5 text-xs font-bold text-[#787774] hover:text-[#2F3437] transition-colors group rounded shrink min-w-0 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF]"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="truncate max-w-[110px] min-[375px]:max-w-[160px] sm:max-w-xs" title={backLabelText}>{backLabelText}</span>
          </button>
          {isMatch && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-[#00AEEF]/10 border border-[#00AEEF]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#00AEEF] shrink-0">
              {t("review.matchTitle", { defaultValue: "Kết quả khớp CV–JD" })}
            </span>
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            onClick={reset}
            size="sm"
            variant="ghost"
            aria-label={t("review.startOver", { defaultValue: "Làm lại từ đầu" })}
            title={t("review.startOver", { defaultValue: "Làm lại từ đầu" })}
            className="rounded-full gap-1.5 px-2 sm:px-3 min-h-[44px] text-[12px] font-bold text-[#787774] hover:text-[#2F3437] focus-visible:ring-2 focus-visible:ring-[#00AEEF]"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t("review.startOver", { defaultValue: "Làm lại từ đầu" })}</span>
          </Button>

          {isMatch ? (
            <Button
              onClick={() => setShowJdInput(true)}
              size="sm"
              className="rounded-full gap-1.5 px-2.5 sm:px-4 min-h-[44px] text-[12px] font-bold bg-[#00AEEF] hover:bg-[#049bd7] text-white focus-visible:ring-2 focus-visible:ring-[#00AEEF] border-0 whitespace-nowrap"
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>{t("review.matchAction", { defaultValue: "So khớp CV với JD" })}</span>
            </Button>
          ) : step === "cv-review" ? (
            <Button
              onClick={() => setShowJdInput(true)}
              size="sm"
              className="rounded-full gap-1.5 px-2.5 sm:px-4 min-h-[44px] text-[12px] font-bold bg-[#00AEEF] hover:bg-[#049bd7] text-white focus-visible:ring-2 focus-visible:ring-[#00AEEF] border-0 whitespace-nowrap"
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>{t("review.matchAction", { defaultValue: "So khớp CV với JD" })}</span>
            </Button>
          ) : step === "results" ? (
            <Button
              onClick={scanAgain}
              size="sm"
              className="rounded-full gap-1.5 px-2.5 sm:px-4 min-h-[44px] text-[12px] font-bold bg-[#00AEEF] hover:bg-[#049bd7] text-white focus-visible:ring-2 focus-visible:ring-[#00AEEF] border-0 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>{t("results.scanAgainButton", { defaultValue: "Quét lại" })}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* ROW 2: Tab strip */}
      <nav
        role="tablist"
        className="h-12 border-b border-[#EAEAEA] flex items-stretch w-full bg-white animate-in fade-in"
      >
        {/* Left: CV filename / JD title (desktop only) — same 300px as the rail */}
        <div className="hidden lg:flex items-center gap-2.5 lg:w-[300px] lg:min-w-[300px] lg:max-w-[300px] border-r border-[#F1F1EF] px-6 shrink-0 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center text-[#00AEEF] shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-bold text-[#2F3437] truncate" title={cvName}>
              {cvName}
            </span>
            {isMatch && (
              <span className="text-[10px] text-[#787774] truncate" title={displayJdTitle}>
                vs {displayJdTitle}
              </span>
            )}
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="flex-1 flex items-stretch overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none px-2 sm:px-0">
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                ref={isActive ? activeTabRef : null}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "relative flex-1 min-h-[44px] snap-center flex items-center justify-center px-3 sm:px-4 text-[13px] font-bold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00AEEF]",
                  isActive
                    ? "text-[#00AEEF]"
                    : "text-[#787774] hover:text-[#2F3437]"
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-3 h-[2.5px] rounded-full bg-[#00AEEF]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
