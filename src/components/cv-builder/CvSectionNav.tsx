import React from "react";
import { useTranslation } from "react-i18next";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { 
  User, Target, FileText, GraduationCap, Briefcase, 
  FolderGit2, Wrench, Award, CheckCircle, Check, RotateCcw
} from "lucide-react";
import type { BuilderSection } from "@shared/api";

const SECTIONS = [
  { id: "basic-info", icon: User },
  { id: "career-target", icon: Target },
  { id: "summary", icon: FileText },
  { id: "education", icon: GraduationCap },
  { id: "experience", icon: Briefcase },
  { id: "projects", icon: FolderGit2 },
  { id: "skills", icon: Wrench },
  { id: "certifications", icon: Award },
  { id: "review", icon: CheckCircle },
];

const sectionTitleMap: Record<string, { en: string; vi: string }> = {
  "basic-info": { en: "Basic Information", vi: "Thông tin cá nhân" },
  "career-target": { en: "Career Target", vi: "Mục tiêu nghề nghiệp" },
  "summary": { en: "Professional Summary", vi: "Tóm tắt chuyên môn" },
  "education": { en: "Education", vi: "Học vấn" },
  "experience": { en: "Work Experience", vi: "Kinh nghiệm làm việc" },
  "projects": { en: "Projects", vi: "Dự án" },
  "skills": { en: "Skills", vi: "Kỹ năng" },
  "certifications": { en: "Certifications", vi: "Chứng chỉ" },
  "review": { en: "Review & Polish", vi: "Hoàn thiện CV" },
};

const sectionUiToBeMap: Record<string, BuilderSection> = {
  "basic-info": "basic",
  "summary": "summary",
  "education": "education",
  "experience": "experience",
  "projects": "projects",
  "skills": "skills",
  "certifications": "certifications",
};

const STATUS_INDEX_MAP: Record<string, number> = {
  "basic-info": 0,
  "career-target": 1,
  "summary": 2,
  "education": 3,
  "experience": 4,
  "projects": 5,
  "skills": 6,
  "certifications": 7,
};

export function CvSectionNav({ variant = "vertical" }: { variant?: "vertical" | "horizontal" | "icon" }) {
  const { t, i18n } = useTranslation("diagnosis");
  const { activeSection, setActiveSection, getSectionStatuses, sectionEvaluations, sectionFixFeedback, sectionOrder } = useCvBuilderStore();
  const statuses = getSectionStatuses();
  const currentLang = i18n.language.startsWith("vi") ? "vi" : "en";
  const isLoggedIn = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.authSource === "api",
  );

  const orderedSections = React.useMemo(() => [
    SECTIONS.find(s => s.id === "basic-info")!,
    SECTIONS.find(s => s.id === "career-target")!,
    ...sectionOrder.map(id => SECTIONS.find(s => s.id === id)).filter(Boolean) as typeof SECTIONS[0][],
    SECTIONS.find(s => s.id === "review")!,
  ], [sectionOrder]);

  // Calculate completion — prefer BE evaluation over local heuristic
  const doneCount = orderedSections.filter((section) => {
    const statusIdx = STATUS_INDEX_MAP[section.id];
    if (statusIdx === undefined) return false;
    const status = statuses[statusIdx];
    const beSection = sectionUiToBeMap[section.id];
    const evaluation = isLoggedIn && beSection ? sectionEvaluations[beSection] : null;
    if (evaluation) return evaluation.score >= 80;
    return status?.status === "completed";
  }).length;
  const totalCount = 8; // There are 8 metadata statuses (0-7)

  const handleNavClick = (idx: number, id: string) => {
    setActiveSection(idx);
    useCvBuilderStore.getState().setSectionCollapsed(id, false); // Auto-expand
    
    // In studio mode, scroll the editor panel to the section anchor
    const element = document.getElementById(`cv-section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (variant === "horizontal") {
    return (
      <div className="flex max-w-full items-center gap-2 overflow-x-auto bg-white px-3 py-3 scrollbar-none select-none sm:px-4">
        {orderedSections.map((section, index) => {
          const Icon = section.icon;
          const isSelected = activeSection === index;
          const statusIdx = STATUS_INDEX_MAP[section.id];
          const status = statusIdx !== undefined ? statuses[statusIdx]?.status : null;
          const title = sectionTitleMap[section.id][currentLang];
          const beSection = sectionUiToBeMap[section.id];
          const evaluation = isLoggedIn && beSection ? sectionEvaluations[beSection] : null;
          const fixFeedback = isLoggedIn && beSection ? sectionFixFeedback[beSection] : null;

          return (
            <button
              key={section.id}
              onClick={() => handleNavClick(index, section.id)}
              className={cn(
                "max-w-[14rem] px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap outline-none shrink-0",
                isSelected
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-[#FBFBFA] border-[#EAEAEA] text-[#2F3437] hover:border-slate-355"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{title}</span>
              
              {/* Status / Score in horizontal view */}
              {fixFeedback ? (
                <span className="text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-full shrink-0 shadow-sm bg-[#FFF8E6] text-[#D97706] border border-[#FDE68A] flex items-center gap-0.5 uppercase tracking-wider">
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>{t("builder.review.recheckShort")}</span>
                </span>
              ) : evaluation ? (
                <span className={cn("text-[9px] font-mono font-bold px-1 rounded-full shrink-0 shadow-sm",
                  evaluation.score >= 80 ? "bg-[#EDF3EC] text-[#346538]"
                  : evaluation.score >= 1 ? "bg-[#FEF7EA] text-[#B98900]"
                  : "bg-[#FBFBFA] border border-slate-200 text-slate-500"
                )}>
                  {evaluation.score}%
                </span>
              ) : (
                status === "completed" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )
              )}
              {!fixFeedback && !evaluation && status === "needs-improvement" && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Vertical layout (Sidebar - text)
  if (variant === "vertical") {
    return (
      <div className="space-y-4 select-none sticky top-24">
        <div className="px-3 space-y-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">
            {t("builder.sections")}
          </h3>
          <p className="text-xs font-mono text-slate-500">
            {t("builder.sectionsDone", { done: doneCount, total: totalCount })}
          </p>
        </div>

        <nav className="space-y-1">
          {orderedSections.map((section, index) => {
            const Icon = section.icon;
            const isSelected = activeSection === index;
            const statusIdx = STATUS_INDEX_MAP[section.id];
            const status = statusIdx !== undefined ? statuses[statusIdx]?.status : null;
            const title = sectionTitleMap[section.id][currentLang];
            const beSection = sectionUiToBeMap[section.id];
            const evaluation = isLoggedIn && beSection ? sectionEvaluations[beSection] : null;
            const fixFeedback = isLoggedIn && beSection ? sectionFixFeedback[beSection] : null;

            return (
              <button
                key={section.id}
                onClick={() => handleNavClick(index, section.id)}
                className={cn(
                  "w-full text-left py-2 px-3 text-sm rounded-lg flex items-center justify-between transition-all duration-200 group outline-none",
                  isSelected
                    ? "bg-primary/5 text-primary font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                  <span className="truncate">{title}</span>
                </div>

                {/* Status/Score indicator on the right */}
                {fixFeedback ? (
                  <span className="text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2 shadow-sm bg-[#FFF8E6] text-[#D97706] border border-[#FDE68A] uppercase tracking-wider flex items-center gap-1">
                    <RotateCcw className="w-2.5 h-2.5" />
                    {t("builder.review.recheckShort")}
                  </span>
                ) : evaluation ? (
                  <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2 shadow-sm",
                    evaluation.score >= 80 ? "bg-[#EDF3EC] text-[#346538]"
                    : evaluation.score >= 1 ? "bg-[#FEF7EA] text-[#B98900]"
                    : "bg-[#FBFBFA] border border-slate-200 text-slate-500"
                  )}>
                    {evaluation.score}%
                  </span>
                ) : (
                  <>
                    {status === "completed" && (
                      <span className="w-5 h-5 rounded-full bg-[#EDF3EC] flex items-center justify-center text-[#346538] shrink-0 ml-2">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    {status === "needs-improvement" && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ml-2" />
                    )}
                    {status === "missing" && (
                      <span className="w-2 h-2 rounded-full border border-[#EAEAEA] shrink-0 ml-2" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Thin Icon-only Sidebar (Studio V7 style)
  return (
    <div className="flex flex-col items-center py-4 space-y-4 select-none h-full w-[56px]">
      <nav className="flex flex-col gap-2 w-full px-2">
        {orderedSections.map((section, index) => {
          const Icon = section.icon;
          const isSelected = activeSection === index;
          const statusIdx = STATUS_INDEX_MAP[section.id];
          const status = statusIdx !== undefined ? statuses[statusIdx]?.status : null;
          const title = sectionTitleMap[section.id][currentLang];
          const beSection = sectionUiToBeMap[section.id];
          const evaluation = isLoggedIn && beSection ? sectionEvaluations[beSection] : null;
          const fixFeedback = isLoggedIn && beSection ? sectionFixFeedback[beSection] : null;

          return (
            <button
              key={section.id}
              onClick={() => handleNavClick(index, section.id)}
              title={title}
              className={cn(
                "relative w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-all duration-200 group outline-none",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "bg-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <Icon className={cn("w-[18px] h-[18px] shrink-0", isSelected ? "text-primary" : "group-hover:text-slate-700")} />

              {/* Active Left Indicator */}
              {isSelected && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
              )}

              {/* Status dot */}
              {fixFeedback ? (
                <div className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full shadow-sm ring-1 ring-white bg-[#FFF8E6] text-[#D97706] border border-[#FDE68A]">
                  <RotateCcw className="w-2.5 h-2.5" />
                </div>
              ) : evaluation ? (
                <div className={cn("absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[8px] font-bold flex items-center justify-center rounded-full shadow-sm ring-1 ring-white",
                  evaluation.score >= 80 ? "bg-[#EDF3EC] text-[#346538]"
                  : evaluation.score >= 1 ? "bg-[#FEF7EA] text-[#B98900]"
                  : "bg-white text-slate-500"
                )}>
                  {evaluation.score}
                </div>
              ) : (
                <>
                  {status === "completed" && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                  )}
                  {status === "needs-improvement" && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white shadow-sm" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
