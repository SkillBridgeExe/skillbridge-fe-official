import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { buildDiagnosisFindingRows, type DiagnosisFindingRow } from "./diagnosis-findings";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function useDiagnosisFindingRows(): DiagnosisFindingRow[] {
  const reviewData = useDiagnosisStore((s) => s.reviewData);
  const experience = useCvBuilderStore((s) => s.experience);
  const projects = useCvBuilderStore((s) => s.projects);
  const summary = useCvBuilderStore((s) => s.summary);
  
  return useMemo(() => {
    if (!reviewData) return [];
    const document = useCvBuilderStore.getState().getResumeDocumentV1();
    return buildDiagnosisFindingRows({ reviewData, gapReport: null, document });
    // experience/projects/summary chỉ là trigger re-resolve anchor trên document sống.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewData, experience, projects, summary]);
}

const SECTION_IDX: Record<"summary" | "experience" | "projects", number> = {
  summary: 2,
  experience: 4,
  projects: 5,
};

export function DiagnosisFindingsPanel() {
  const { t } = useTranslation("diagnosis");
  const store = useCvBuilderStore();
  const { setActiveSection, markSectionNeedsRecheck } = store;
  const rows = useDiagnosisFindingRows();

  if (rows.length === 0) {
    return null;
  }

  const handleFix = (anchor: NonNullable<DiagnosisFindingRow["anchor"]>) => {
    if (!anchor || !anchor.ok) return;
    const sectionIndex = SECTION_IDX[anchor.section];
    setActiveSection(sectionIndex);
    markSectionNeedsRecheck(anchor.section, { source: "diagnosis_fix" });

    setTimeout(() => {
      const focusId = anchor.section;
      const sectionEl = document.getElementById(focusId) || document.getElementById(`cv-section-${focusId}`);
      if (!sectionEl) return;
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      sectionEl.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      
      setTimeout(() => {
        const firstInput = sectionEl.querySelector<HTMLElement>(
          'textarea, input[type="text"], input[type="email"], input[type="tel"], input[type="url"], [contenteditable="true"]'
        );
        firstInput?.focus();
      }, 350);
    }, 100);
  };

  return (
    <div className="bg-white border border-[#FDE68A] rounded-xl p-4 shadow-sm space-y-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <AlertCircle className="w-5 h-5 text-[#D97706]" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm text-slate-800">
            {t("builder.diagnosisFindings.title")}
          </h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {t("builder.diagnosisFindings.subtitle")}
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
        {rows.map((row) => {
          const hasValidAnchor = row.anchor?.ok === true;
          const isMaybeFixed = row.anchor && !row.anchor.ok;
          const labelText = row.label ?? (row.labelKey ? t(row.labelKey) : "");

          return (
            <div
              key={row.id}
              className={`py-3 flex items-start justify-between gap-4 ${
                isMaybeFixed ? "opacity-60" : ""
              }`}
            >
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 leading-relaxed break-words">
                  {labelText}
                </p>
                {row.excerpt && (
                  <p className="text-[11px] font-mono text-slate-500 break-all leading-normal bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block">
                    {row.excerpt}
                  </p>
                )}
              </div>

              {hasValidAnchor && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 shrink-0"
                  onClick={() => handleFix(row.anchor!)}
                >
                  {t("builder.diagnosisFindings.fixButton")}
                </Button>
              )}

              {isMaybeFixed && (
                <span className="text-[11px] text-slate-400 font-medium italic shrink-0 mt-1">
                  {t("builder.diagnosisFindings.maybeFixed")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DiagnosisFindingsBanner() {
  const { t } = useTranslation("diagnosis");
  const seededFromDiagnosis = useCvBuilderStore((s) => s.seededFromDiagnosis);
  const activeSection = useCvBuilderStore((s) => s.activeSection);
  const setActiveSection = useCvBuilderStore((s) => s.setActiveSection);
  const rows = useDiagnosisFindingRows();

  if (!seededFromDiagnosis || rows.length === 0 || activeSection === 8) {
    return null;
  }

  return (
    <div className="bg-[#FFF8E6] border border-[#FDE68A] rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-sm mb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#FEF0C7] flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 text-[#D97706]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#92400E]">
            {t("builder.diagnosisFindings.bannerText", { count: rows.length })}
          </p>
        </div>
      </div>
      <Button
        onClick={() => setActiveSection(8)}
        className="w-full sm:w-auto bg-[#D97706] hover:bg-[#B45309] text-white shrink-0 shadow-sm"
        size="sm"
      >
        {t("builder.diagnosisFindings.bannerCta")}
      </Button>
    </div>
  );
}
