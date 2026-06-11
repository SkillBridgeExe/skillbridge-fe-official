import { useCvBuilderStore, type Education, type WorkExperience, type Project, type Certification } from "@/store/useCvBuilderStore";
import { useTranslation } from "react-i18next";
import { 
  User, Target, FileText, GraduationCap, Briefcase, 
  FolderGit2, Wrench, Award, CheckCircle, Check, X, Gauge
} from "lucide-react";
import * as Sections from "./sections";
import { useEffect, useRef, useState, useCallback } from "react";
import { useEvaluateSectionMutation } from "@/hooks/use-cv-builder";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BuilderSnapshot } from "@/services/cv-builder.service";
import type { BuilderSection } from "@shared/api";

const SECTIONS = [
  { id: "basic-info", icon: User, component: Sections.BasicInfoSection },
  { id: "career-target", icon: Target, component: Sections.CareerTargetSection },
  { id: "summary", icon: FileText, component: Sections.SummarySection },
  { id: "education", icon: GraduationCap, component: Sections.EducationSection },
  { id: "experience", icon: Briefcase, component: Sections.ExperienceSection },
  { id: "projects", icon: FolderGit2, component: Sections.ProjectsSection },
  { id: "skills", icon: Wrench, component: Sections.SkillsSection },
  { id: "certifications", icon: Award, component: Sections.CertificationsSection },
  { id: "review", icon: CheckCircle, component: Sections.ReviewSection },
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

const isSectionDirty = (sectionId: string, state: ReturnType<typeof useCvBuilderStore.getState>): boolean => {
  switch (sectionId) {
    case "basic-info":
      return !!(state.fullName.trim() || state.email.trim() || state.phone.trim() || state.location.trim());
    case "summary":
      return !!state.summary.trim();
    case "education":
      return state.education.some((e: Education) => e.school.trim() || e.major.trim());
    case "experience":
      return state.experience.some((e: WorkExperience) => e.company.trim() || e.position.trim());
    case "projects":
      return state.projects.some((p: Project) => p.name.trim());
    case "skills":
      return state.technicalSkills.length > 0 || state.softSkills.length > 0 || state.tools.length > 0 || state.languages.length > 0;
    case "certifications":
      return state.certifications.some((c: Certification) => c.name.trim());
    default:
      return false;
  }
};

const getBuilderSnapshot = (state: ReturnType<typeof useCvBuilderStore.getState>): BuilderSnapshot => ({
  fullName: state.fullName,
  email: state.email,
  phone: state.phone,
  location: state.location,
  linkedin: state.linkedin,
  portfolio: state.portfolio,
  github: state.github,
  targetPosition: state.targetPosition,
  summary: state.summary,
  education: state.education,
  experience: state.experience,
  projects: state.projects,
  technicalSkills: state.technicalSkills,
  softSkills: state.softSkills,
  tools: state.tools,
  languages: state.languages,
  certifications: state.certifications,
  cvLanguage: state.cvLanguage,
});

export function CvFormPanel() {
  const { getSectionStatuses, activeSection, draftId, sectionEvaluations, setSectionEvaluation } = useCvBuilderStore();
  const statuses = getSectionStatuses();
  const { t, i18n } = useTranslation("diagnosis");
  const currentLang = i18n.language.startsWith("vi") ? "vi" : "en";
  const isLoggedIn = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.authSource === "api",
  );

  const [evaluatingMap, setEvaluatingMap] = useState<Record<string, boolean>>({});
  const evaluateMutation = useEvaluateSectionMutation();

  const handleEvaluateSection = useCallback((beSection: BuilderSection, _sectionId: string) => {
    if (!isLoggedIn || !draftId) return;

    const state = useCvBuilderStore.getState();
    const snapshot = getBuilderSnapshot(state);
    const roleCode = useDiagnosisStore.getState().targetRole;

    setEvaluatingMap((prev) => ({ ...prev, [beSection]: true }));

    evaluateMutation.mutate(
      {
        draftId,
        section: beSection,
        snapshot,
        roleCode,
      },
      {
        onSuccess: (data) => {
          setSectionEvaluation(beSection, data);
          setEvaluatingMap((prev) => ({ ...prev, [beSection]: false }));
        },
        onError: () => {
          setEvaluatingMap((prev) => ({ ...prev, [beSection]: false }));
        },
      }
    );
  }, [draftId, evaluateMutation, isLoggedIn, setSectionEvaluation]);

  const prevActiveSectionRef = useRef(activeSection);

  useEffect(() => {
    const prevIdx = prevActiveSectionRef.current;
    prevActiveSectionRef.current = activeSection;

    if (prevIdx === activeSection) return;

    if (!isLoggedIn || !draftId) return;

    const prevSection = SECTIONS[prevIdx];
    if (!prevSection) return;

    const beSection = sectionUiToBeMap[prevSection.id];
    if (!beSection) return;

    const state = useCvBuilderStore.getState();
    if (!isSectionDirty(prevSection.id, state)) return;

    const timer = setTimeout(() => {
      handleEvaluateSection(beSection, prevSection.id);
    }, 400);

    return () => clearTimeout(timer);
  }, [activeSection, draftId, handleEvaluateSection, isLoggedIn]);

  const renderEvaluateChip = (beSection: BuilderSection, sectionId: string) => {
    const evaluation = sectionEvaluations[beSection];
    const isEvaluating = evaluatingMap[beSection];

    if (isEvaluating) {
      return (
        <div className="w-16 h-6 bg-slate-100 animate-pulse rounded-full shrink-0" />
      );
    }

    if (evaluation) {
      const { score, label, checklist, missing } = evaluation;
      let badgeClass = "";
      if (score >= 80) {
        badgeClass = "bg-[#EDF3EC] text-[#346538] hover:bg-[#E3EDE1]";
      } else if (score >= 1) {
        badgeClass = "bg-[#FEF7EA] text-[#B98900] hover:bg-[#FDF0D5]";
      } else {
        badgeClass = "border border-slate-200 text-slate-500 bg-[#FBFBFA] hover:bg-slate-55";
      }

      return (
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn("px-2.5 py-1 text-[11px] font-mono font-bold rounded-full transition-colors flex items-center gap-1 shrink-0 shadow-sm", badgeClass)}>
              <span>{score}%</span>
              <span className="font-sans font-semibold text-[9px] uppercase tracking-wider">{label}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <h5 className="font-bold text-slate-800 text-xs mb-3 border-b border-slate-100 pb-1.5 uppercase tracking-wider">
              {sectionTitleMap[sectionId][currentLang]}
            </h5>
            
            <div className="space-y-2 mb-3">
              {checklist && checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-xs">
                  {item.pass ? (
                    <Check className="w-3.5 h-3.5 text-[#346538] shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-[#9F2F2D] shrink-0 mt-0.5" />
                  )}
                  <span className={cn("leading-tight", item.pass ? "text-slate-600" : "text-slate-400")}>
                    {item.criterion}
                  </span>
                </div>
              ))}
            </div>

            {missing && missing.length > 0 && (
              <div className="mt-3 bg-[#FBF3DB]/60 border border-[#F2E5BC] rounded-lg p-2.5">
                <div className="text-[11px] font-bold text-[#8C6D1F] uppercase tracking-wider mb-1">
                  {t("builder.missingTitle")}
                </div>
                <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-[#705615] leading-relaxed">
                  {missing.map((txt, i) => (
                    <li key={i}>{txt}</li>
                  ))}
                </ul>
              </div>
            )}
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleEvaluateSection(beSection, sectionId)}
        className="h-7 text-[11px] text-slate-500 hover:text-primary hover:bg-slate-100/80 px-2 py-1 flex items-center gap-1 shrink-0"
      >
        <Gauge className="w-3.5 h-3.5" />
        <span>{t("builder.evaluateNow")}</span>
      </Button>
    );
  };

  return (
    <div className="p-4 space-y-6">
      {SECTIONS.map((section, index) => {
        const Icon = section.icon;
        const status = index < 8 ? statuses[index]?.status : null;
        const title = sectionTitleMap[section.id][currentLang];
        const beSection = sectionUiToBeMap[section.id];

        return (
          <div
            key={section.id}
            id={section.id}
            className="scroll-mt-24 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm hover:border-slate-300 transition-all duration-200"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-slate-800 text-sm">{title}</h4>
              </div>

              {/* Status Chip / Score Chip */}
              {isLoggedIn && beSection ? (
                renderEvaluateChip(beSection, section.id)
              ) : (
                status && (
                  <div>
                    {status === "completed" && (
                      <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#EDF3EC] text-[#346538]">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>{currentLang === "vi" ? "Đã xong" : "Done"}</span>
                      </div>
                    )}
                    {status === "needs-improvement" && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#FEF7EA] text-[#B98900]">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{currentLang === "vi" ? "Cần cải thiện" : "Improve"}</span>
                      </div>
                    )}
                    {status === "missing" && (
                      <div className="px-2.5 py-1 text-xs font-semibold rounded-full border border-[#EAEAEA] text-[#787774] bg-[#FBFBFA]">
                        <span>{currentLang === "vi" ? "Chưa bắt đầu" : "Missing"}</span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Content Body */}
            <div className="p-5 bg-white">
              <section.component />
            </div>
          </div>
        );
      })}
    </div>
  );
}
