import { ArrowLeft, Briefcase, Menu, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { getRoleLabel } from "@/constants/it-roles";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarStore } from "@/store/useSidebarStore";

/**
 * App-shell top bar for diagnosis report mode (steps cv-review / results) —
 * replaces the floating marketing navbar with a slim Jobscan-style utility bar:
 * back · logo · scan title | re-scan · compare-JD.
 */
export function ReportTopBar() {
  const { t } = useTranslation("diagnosis");
  const step = useDiagnosisStore((s) => s.step);
  const targetRole = useDiagnosisStore((s) => s.targetRole);
  const goBack = useDiagnosisStore((s) => s.goBack);
  const reset = useDiagnosisStore((s) => s.reset);
  const setShowJdInput = useDiagnosisStore((s) => s.setShowJdInput);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  const backLabel = step === "results" ? t("results.backToReview") : t("review.backToUpload");

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur border-b border-[#EAEAEA]">
      <div className="h-full max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-3">
        {/* A1: Sidebar hamburger (mobile, logged-in only) — replaces the hidden
            MobileTopBar so users can still reach navigation while in report mode. */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="md:hidden flex items-center justify-center w-9 h-9 -ml-1 rounded-lg hover:bg-slate-50 text-[#787774] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#787774] hover:text-ink-accent transition-colors group focus-visible:ring-2 focus-visible:ring-ink-accent/40 rounded shrink-0"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">{backLabel}</span>
        </button>

        <span className="h-5 w-px bg-[#EAEAEA] shrink-0" aria-hidden />

        <Link to="/" className="font-black text-sm text-[#2F3437] tracking-tight shrink-0 hover:text-ink-accent transition-colors">
          SkillBridge
        </Link>

        <div className="min-w-0 flex-1 truncate text-sm text-[#787774]">
          <span className="font-semibold text-[#2F3437]">{t("report.topbar.title")}</span>
          {targetRole && <span className="hidden md:inline"> · {getRoleLabel(targetRole)}</span>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={reset}
            size="sm"
            variant="ghost"
            className="rounded-full gap-1.5 px-3 h-9 text-[13px] font-bold text-[#787774] hover:text-[#2F3437]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("review.startOver")}</span>
          </Button>
          {step === "cv-review" && (
            <Button
              onClick={() => setShowJdInput(true)}
              size="sm"
              className="rounded-full gap-1.5 px-4 h-9 text-[13px] font-bold bg-[#00AEEF] hover:bg-[#049bd7] text-white"
            >
              <Briefcase className="w-3.5 h-3.5" />
              {t("review.quickPanel.compareCta")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
