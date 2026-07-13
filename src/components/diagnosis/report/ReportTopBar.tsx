import { ArrowLeft, Briefcase, Menu, RotateCcw, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { getRoleLabel } from "@/constants/it-roles";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { cn } from "@/lib/utils";

interface ReportTopBarProps {
  activeTab: 'audit' | 'cv' | 'market';
  onTabChange: (tab: 'audit' | 'cv' | 'market') => void;
}

export function ReportTopBar({ activeTab, onTabChange }: ReportTopBarProps) {
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

  const roleName = targetRole ? getRoleLabel(targetRole) : "";
  const backLabelText = roleName ? `${t("review.title", { defaultValue: "Phân tích CV" })} · ${roleName}` : t("review.title", { defaultValue: "Phân tích CV" });
  // CV identity for the row-2 heading — the file name, not "CV của bạn" (that
  // collides with the middle tab). Role already shows in row 1's back label.
  const cvName = cvFile?.name || builderCvName || t("review.fallbackCvName", { defaultValue: "CV chưa đặt tên" });

  const tabItems = [
    { key: "audit" as const, label: t("review.tabAudit", { defaultValue: "Đánh giá CV" }) },
    { key: "cv" as const, label: t("review.tabCv", { defaultValue: "CV của bạn" }) },
    { key: "market" as const, label: t("review.tabMarket", { defaultValue: "Thị trường tuyển dụng" }) },
  ];

  return (
    <div className="sticky top-0 z-30 w-full bg-white flex flex-col shrink-0 select-none">
      {/* ROW 1: Utility bar (h-14 = 56px) */}
      <div className="h-14 border-b border-[#EAEAEA] flex items-center justify-between px-4 md:px-6 w-full">
        {/* Left cluster */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-50 text-[#787774] shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-xs font-bold text-[#787774] hover:text-[#2F3437] transition-colors group rounded shrink-0 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF]"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="truncate max-w-[200px] sm:max-w-xs" title={backLabelText}>{backLabelText}</span>
          </button>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            onClick={reset}
            size="sm"
            variant="ghost"
            className="rounded-full gap-1.5 px-2 sm:px-3 h-8 text-[12px] font-bold text-[#787774] hover:text-[#2F3437] focus-visible:ring-2 focus-visible:ring-[#00AEEF]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("review.startOver", { defaultValue: "Làm lại từ đầu" })}</span>
          </Button>

          {step === "cv-review" ? (
            <Button
              onClick={() => setShowJdInput(true)}
              size="sm"
              className="rounded-full gap-1.5 px-3 sm:px-4 h-8 text-[12px] font-bold bg-[#00AEEF] hover:bg-[#049bd7] text-white focus-visible:ring-2 focus-visible:ring-[#00AEEF] border-0"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{t("review.quickPanel.compareCta", { defaultValue: "So sánh JD" })}</span>
            </Button>
          ) : step === "results" ? (
            <Button
              onClick={scanAgain}
              size="sm"
              className="rounded-full gap-1.5 px-3 sm:px-4 h-8 text-[12px] font-bold bg-[#00AEEF] hover:bg-[#049bd7] text-white focus-visible:ring-2 focus-visible:ring-[#00AEEF] border-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t("results.scanAgainButton", { defaultValue: "Quét lại" })}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* ROW 2: Tab strip (h-12 = 48px). items-stretch so each cell fills the
          full height and centers its own text — avoids the nested h-full drift. */}
      <nav
        role="tablist"
        className="h-12 border-b border-[#EAEAEA] flex items-stretch w-full bg-white animate-in fade-in"
      >
        {/* Left: CV filename (desktop only) — same 300px as the rail */}
        <div className="hidden lg:flex items-center lg:w-[300px] lg:min-w-[300px] lg:max-w-[300px] border-r border-[#F1F1EF] px-6 shrink-0 min-w-0">
          <span className="text-[13px] font-bold text-[#2F3437] truncate" title={cvName}>{cvName}</span>
        </div>

        {/* Right: Tabs — natural width, left-aligned, vertically centered */}
        <div className="flex-1 flex items-stretch px-4 lg:px-8 overflow-x-auto scrollbar-none">
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "relative flex items-center px-5 text-[13px] font-bold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00AEEF]",
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
