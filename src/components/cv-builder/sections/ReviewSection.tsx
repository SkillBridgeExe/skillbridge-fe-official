import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCvBuilderStore, type SectionStatus } from "@/store/useCvBuilderStore";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BuilderSection, EvaluateSectionResponse } from "@shared/api";

/** FE fallback map for known BE English evaluation labels → Vietnamese. */
const BE_LABEL_VI: Record<string, string> = {
  "Excellent": "Rất tốt",
  "Good": "Tốt",
  "Needs improvement": "Cần cải thiện",
  "NEEDS IMPROVEMENT": "Cần cải thiện",
  "Needs Improvement": "Cần cải thiện",
  "No data": "Chưa có thông tin",
  "Missing": "Thiếu",
};

function localizeBeLabel(label: string, lang: "vi" | "en"): string {
  if (lang === "en") return label;
  return BE_LABEL_VI[label] ?? BE_LABEL_VI[label.trim()] ?? label;
}

/* ── Section title i18n map (matches CvFormPanel SECTIONS order) ── */
const SECTION_KEYS: Array<{
  titleEn: string;
  titleVi: string;
  /** CvFormPanel element id — used for scroll-into-view after Fix click. */
  focusId: string;
  /** Index in the CvFormPanel SECTIONS array. */
  sectionIndex: number;
  /** Corresponding BuilderSection for BE evaluation lookup. */
  beSection?: BuilderSection;
}> = [
  { titleEn: "Basic Information", titleVi: "Thông tin cá nhân", focusId: "basic-info", sectionIndex: 0, beSection: "basic" },
  { titleEn: "Career Target", titleVi: "Mục tiêu nghề nghiệp", focusId: "career-target", sectionIndex: 1 },
  { titleEn: "Professional Summary", titleVi: "Tóm tắt chuyên môn", focusId: "summary", sectionIndex: 2, beSection: "summary" },
  { titleEn: "Education", titleVi: "Học vấn", focusId: "education", sectionIndex: 3, beSection: "education" },
  { titleEn: "Work Experience", titleVi: "Kinh nghiệm làm việc", focusId: "experience", sectionIndex: 4, beSection: "experience" },
  { titleEn: "Projects", titleVi: "Dự án", focusId: "projects", sectionIndex: 5, beSection: "projects" },
  { titleEn: "Skills", titleVi: "Kỹ năng", focusId: "skills", sectionIndex: 6, beSection: "skills" },
  { titleEn: "Certifications", titleVi: "Chứng chỉ", focusId: "certifications", sectionIndex: 7, beSection: "certifications" },
];

/**
 * Merge BE section evaluation score into the local heuristic status.
 * BE score takes priority when available (single source of truth).
 */
function getDisplaySectionStatus(
  localStatus: SectionStatus,
  evaluation?: EvaluateSectionResponse,
): SectionStatus {
  if (!evaluation) return localStatus;
  if (evaluation.score >= 80) return "completed";
  if (evaluation.score > 0) return "needs-improvement";
  // score === 0 → treat as needs-improvement (section exists but empty/weak)
  return "needs-improvement";
}

export function ReviewSection() {
  const { getSectionStatuses, setActiveSection, sectionEvaluations, sectionFixFeedback } =
    useCvBuilderStore();
  const { t, i18n } = useTranslation("diagnosis");
  const currentLang = i18n.language.startsWith("vi") ? "vi" : "en";

  const localStatuses = getSectionStatuses();

  // Hybrid completion: calculate per-section blended score.
  // If BE evaluated it, use BE score. If not, use local heuristic score (completed=100, needs-improvement=50, missing=0).
  // This prevents unevaluated sections from dragging the total down to 0.
  const blendedScores = SECTION_KEYS.map((s, i) => {
    if (s.beSection && sectionEvaluations[s.beSection]) {
      return sectionEvaluations[s.beSection]!.score;
    }
    const localStat = localStatuses[i]?.status ?? "missing";
    if (localStat === "completed") return 100;
    if (localStat === "needs-improvement") return 50;
    return 0;
  });

  const completion = Math.round(blendedScores.reduce((sum, score) => sum + score, 0) / SECTION_KEYS.length);

  const getStatusIcon = (status: SectionStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "needs-improvement":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "missing":
        return <XCircle className="w-4 h-4 text-slate-300" />;
    }
  };

  const getStatusLabel = (status: SectionStatus) => {
    switch (status) {
      case "completed":
        return t("builder.review.completed");
      case "needs-improvement":
        return t("builder.review.needsImprovement");
      case "missing":
        return t("builder.review.missing");
    }
  };

  const handleFix = (sectionIndex: number, focusId: string) => {
    setActiveSection(sectionIndex);
    // Give the DOM time to render the target section, then scroll + focus first input.
    setTimeout(() => {
      const sectionEl = document.getElementById(focusId);
      if (!sectionEl) return;
      sectionEl.scrollIntoView({ behavior: "smooth", block: "start" });
      // After scroll settles, focus the first editable field in the section
      setTimeout(() => {
        const firstInput = sectionEl.querySelector<HTMLElement>(
          'textarea, input[type="text"], input[type="email"], input[type="tel"], input[type="url"], [contenteditable="true"]'
        );
        firstInput?.focus();
      }, 350);
    }, 100);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="text-center space-y-2 mb-6">
        <h3 className="text-xl font-bold text-slate-800">
          {t("builder.review.completionScore")}
        </h3>
        <div className="text-4xl font-black text-primary">{completion}%</div>
        <Progress value={completion} className="h-2 w-full max-w-xs mx-auto" />
      </div>

      <div className="space-y-3">
        {SECTION_KEYS.map((section, idx) => {
          const local = localStatuses[idx];
          if (!local) return null;

          const evaluation = section.beSection
            ? sectionEvaluations[section.beSection]
            : undefined;
          const displayStatus = getDisplaySectionStatus(local.status, evaluation);
          const feedback = section.beSection ? sectionFixFeedback[section.beSection] : undefined;
          const title = currentLang === "vi" ? section.titleVi : section.titleEn;

          return (
            <div
              key={section.focusId}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(displayStatus)}
                <div className="flex flex-col">
                  <span className="font-medium text-slate-700 text-sm">{title}</span>
                  {evaluation && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {evaluation.score}% — {localizeBeLabel(evaluation.label, currentLang)}
                    </span>
                  )}
                  {!evaluation && feedback?.status === "needs_recheck" && (
                    <span className="text-[11px] text-amber-600 font-medium">
                      {t("builder.review.needsRecheck")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {displayStatus !== "completed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary"
                    onClick={() => handleFix(section.sectionIndex, section.focusId)}
                  >
                    {t("builder.review.fix")}
                  </Button>
                )}
                {displayStatus !== "completed" && (
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    {getStatusLabel(displayStatus)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
