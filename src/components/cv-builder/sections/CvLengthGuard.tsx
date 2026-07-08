import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { getBuilderSnapshot } from "../builder-snapshot";
import { evaluateCvLengthQuality } from "@/lib/resume-engine/quality/cv-length-quality";
import { getResumePreviewPageCount } from "@/lib/resume-engine/preview/preview.shared";
import { adaptCanonicalToResumeData } from "@/lib/resume-engine/adapter";
import { mapStoreToCanonical } from "@/services/cv-builder.service";
import { CheckCircle2, AlertTriangle, Info, ArrowRight, FileText, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CvLengthGuardProps {
  onFix: (sectionIndex: number, focusId: string) => void;
}

const SECTION_FOCUS_MAP: Record<string, { sectionIndex: number; focusId: string }> = {
  summary: { sectionIndex: 2, focusId: "summary" },
  education: { sectionIndex: 3, focusId: "education" },
  experience: { sectionIndex: 4, focusId: "experience" },
  projects: { sectionIndex: 5, focusId: "projects" },
  skills: { sectionIndex: 6, focusId: "skills" },
  certifications: { sectionIndex: 7, focusId: "certifications" },
};

export function CvLengthGuard({ onFix }: CvLengthGuardProps) {
  const { t } = useTranslation("diagnosis");
  const store = useCvBuilderStore();
  const diagnosisStore = useDiagnosisStore();

  const qualityResult = useMemo(() => {
    const snapshot = getBuilderSnapshot(store);
    const canonical = mapStoreToCanonical(snapshot);
    const resumeData = adaptCanonicalToResumeData(canonical);
    const pageCount = getResumePreviewPageCount(resumeData);
    
    return evaluateCvLengthQuality({
      document: canonical,
      pageCount,
      targetRole: diagnosisStore.targetRole,
    });
  }, [store, diagnosisStore]);

  const { status, targetPages, pageCount, headlineKey, explanationKey, sectionSuggestions } = qualityResult;

  const StatusIcon = status === "good" 
    ? CheckCircle2 
    : status === "watch" 
    ? AlertTriangle 
    : AlertTriangle;
    
  const statusColorClass = status === "good" 
    ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
    : status === "watch" 
    ? "text-amber-600 bg-amber-50 border-amber-100" 
    : "text-rose-600 bg-rose-50 border-rose-100";

  const iconColorClass = status === "good" 
    ? "text-emerald-500" 
    : status === "watch" 
    ? "text-amber-500" 
    : "text-rose-500";

  return (
    <div className={`p-4 rounded-xl border shadow-sm ${statusColorClass} mb-6`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <StatusIcon className={`w-5 h-5 ${iconColorClass}`} />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="font-bold text-sm text-slate-800">
              {t(headlineKey)}
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {t(explanationKey)}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded border border-black/5">
              <FileText className="w-3.5 h-3.5 opacity-70" />
              {t("builder.lengthGuard.statusPages", { estimated: pageCount })}
            </div>
            <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded border border-black/5">
              <Target className="w-3.5 h-3.5 opacity-70" />
              {t("builder.lengthGuard.targetPages", { target: targetPages })}
            </div>
          </div>

          {sectionSuggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
              {sectionSuggestions.map((sug, idx) => {
                const SeverityIcon = sug.severity === "critical" || sug.severity === "warning" ? AlertTriangle : Info;
                const suggestionColor = sug.severity === "critical" ? "text-rose-600" : sug.severity === "warning" ? "text-amber-600" : "text-slate-600";
                
                return (
                  <div key={idx} className="flex items-center justify-between gap-3 bg-white/60 p-2 rounded-lg border border-white">
                    <div className="flex items-start gap-2">
                      <SeverityIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${suggestionColor}`} />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-700">{t(sug.reasonKey)}</span>
                        <span className="text-[11px] text-slate-500">{t(sug.actionKey)}</span>
                      </div>
                    </div>
                    {SECTION_FOCUS_MAP[sug.section] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-slate-500 hover:text-slate-800 shrink-0"
                        onClick={() => onFix(SECTION_FOCUS_MAP[sug.section].sectionIndex, SECTION_FOCUS_MAP[sug.section].focusId)}
                      >
                        {t("builder.review.fix")}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
