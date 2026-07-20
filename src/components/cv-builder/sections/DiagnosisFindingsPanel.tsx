import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { buildDiagnosisFindingRows, type DiagnosisFindingRow } from "./diagnosis-findings";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function useDiagnosisFindingRows(): DiagnosisFindingRow[] {
  const reviewData = useDiagnosisStore((s) => s.reviewData);
  const lastCvId = useDiagnosisStore((s) => s.lastCvId);
  const diagnosisSourceCvId = useCvBuilderStore((s) => s.diagnosisSourceCvId);
  const experience = useCvBuilderStore((s) => s.experience);
  const projects = useCvBuilderStore((s) => s.projects);
  const summary = useCvBuilderStore((s) => s.summary);

  return useMemo(() => {
    // Provenance guard: findings chỉ thuộc về phiên builder được seed từ ĐÚNG CV
    // vừa chẩn đoán — không bind kết quả quét CV A vào draft CV B mở từ thư viện.
    if (!reviewData || !diagnosisSourceCvId || diagnosisSourceCvId !== lastCvId) return [];
    const document = useCvBuilderStore.getState().getResumeDocumentV1();
    return buildDiagnosisFindingRows({ reviewData, gapReport: null, document });
    // experience/projects/summary chỉ là trigger re-resolve anchor trên document sống.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewData, lastCvId, diagnosisSourceCvId, experience, projects, summary]);
}

// activeSection đánh index vào orderedSections = [basic-info, career-target,
// ...sectionOrder, review] (cùng công thức CvFormPanel/CvSectionNav) — sectionOrder
// do user kéo-thả và persist, nên index PHẢI tính động, không hardcode.
const sectionIndexInOrder = (sectionOrder: string[], id: string): number => {
  const idx = sectionOrder.indexOf(id);
  return idx >= 0 ? idx + 2 : -1;
};
const reviewIndexInOrder = (sectionOrder: string[]): number => sectionOrder.length + 2;

const scrollToSectionCard = (id: string) => {
  const el = document.getElementById(`cv-section-${id}`);
  if (!el) return;
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
};

export function DiagnosisFindingsPanel() {
  const { t } = useTranslation("diagnosis");
  const rows = useDiagnosisFindingRows();

  if (rows.length === 0) {
    return null;
  }

  const handleFix = (anchor: NonNullable<DiagnosisFindingRow["anchor"]>) => {
    if (!anchor.ok) return;
    const { sectionOrder, setActiveSection, setSectionCollapsed, markSectionNeedsRecheck } =
      useCvBuilderStore.getState();
    const sectionIndex = sectionIndexInOrder(sectionOrder, anchor.section);
    if (sectionIndex >= 0) setActiveSection(sectionIndex);
    setSectionCollapsed(anchor.section, false);
    markSectionNeedsRecheck(anchor.section, { source: "diagnosis_fix" });

    // Chờ 1 nhịp re-render (panel/banner có thể unmount làm layout dịch) rồi mới scroll.
    setTimeout(() => {
      const sectionEl = document.getElementById(`cv-section-${anchor.section}`);
      if (!sectionEl) return;
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
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
  const activeSection = useCvBuilderStore((s) => s.activeSection);
  const sectionOrder = useCvBuilderStore((s) => s.sectionOrder);
  const rows = useDiagnosisFindingRows();
  const reviewIndex = reviewIndexInOrder(sectionOrder);

  // Provenance đã gate trong useDiagnosisFindingRows (rows rỗng khi CV không khớp),
  // nên banner KHÔNG dựa vào seededFromDiagnosis (cờ đó bị consume-then-clear
  // ngay khi ensureDraft xong — gate bằng nó thì banner biến mất sau ~1s).
  if (rows.length === 0 || activeSection === reviewIndex) {
    return null;
  }

  const jumpToReview = () => {
    const { setActiveSection, setSectionCollapsed } = useCvBuilderStore.getState();
    setActiveSection(reviewIndex);
    setSectionCollapsed("review", false);
    // Scroll sau khi banner unmount (activeSection === reviewIndex) để target không bị dịch.
    setTimeout(() => scrollToSectionCard("review"), 100);
  };

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
        onClick={jumpToReview}
        className="w-full sm:w-auto bg-[#D97706] hover:bg-[#B45309] text-white shrink-0 shadow-sm"
        size="sm"
      >
        {t("builder.diagnosisFindings.bannerCta")}
      </Button>
    </div>
  );
}
