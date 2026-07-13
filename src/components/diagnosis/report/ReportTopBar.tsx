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

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  const backLabel = step === "results" ? t("results.backToReview", { defaultValue: "Quay lại đánh giá" }) : t("review.backToUpload", { defaultValue: "Quay lại" });
  const roleName = targetRole ? getRoleLabel(targetRole) : t("review.title", { defaultValue: "Phân tích CV" });

  const tabItems = [
    { key: "audit" as const, label: t("review.tabAudit", { defaultValue: "Đánh giá CV" }) },
    { key: "cv" as const, label: t("review.tabCv", { defaultValue: "CV của bạn" }) },
    { key: "market" as const, label: t("review.tabMarket", { defaultValue: "Thị trường tuyển dụng" }) },
  ];

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-[#EAEAEA] flex items-center justify-between select-none w-full shrink-0 px-4 md:px-6">
      
      {/* LEFT CLUSTER: hamburger, Back, hairline, role/title truncate */}
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
          <span className="hidden sm:inline">{backLabel}</span>
        </button>
        <span className="h-4 w-px bg-[#EAEAEA] shrink-0 mx-1" />
        <h2 className="text-xs font-bold text-[#2F3437] truncate max-w-[120px] sm:max-w-[200px]" title={roleName}>
          {roleName}
        </h2>
      </div>

      {/* CENTER/LEFT-OF-ACTIONS: Tabs navigation */}
      <nav 
        role="tablist"
        className="h-full flex items-center gap-1 overflow-x-auto scrollbar-none shrink mx-2 sm:mx-4"
      >
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "h-full px-2 sm:px-4 text-xs font-bold transition-all relative border-b-2 flex items-center justify-center -mb-[1px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF]",
                isActive
                  ? "border-[#00AEEF] text-[#00AEEF]"
                  : "border-transparent text-[#787774] hover:text-[#2F3437] hover:border-slate-200"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* RIGHT CLUSTER: secondary (Start over), primary CTA */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Button
          onClick={reset}
          size="sm"
          variant="ghost"
          className="rounded-full gap-1.5 px-2 sm:px-3 h-8 text-[12px] font-bold text-[#787774] hover:text-[#2F3437] focus-visible:ring-2 focus-visible:ring-[#00AEEF]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{t("review.startOver", { defaultValue: "Làm lại" })}</span>
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
            <RefreshCw className="w-3.5 h-3.5 animate-none" />
            <span>{t("results.scanAgainButton", { defaultValue: "Quét lại" })}</span>
          </Button>
        ) : null}
      </div>

    </header>
  );
}
