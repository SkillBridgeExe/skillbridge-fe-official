import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useTranslation } from "react-i18next";
import { 
  User, Target, FileText, GraduationCap, Briefcase, 
  FolderGit2, Wrench, Award, CheckCircle, Check
} from "lucide-react";
import * as Sections from "./sections";

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

export function CvFormPanel() {
  const { getSectionStatuses } = useCvBuilderStore();
  const statuses = getSectionStatuses();
  const { i18n } = useTranslation("diagnosis");
  const currentLang = i18n.language.startsWith("vi") ? "vi" : "en";

  return (
    <div className="p-4 space-y-6">
      {SECTIONS.map((section, index) => {
        const Icon = section.icon;
        const status = index < 8 ? statuses[index]?.status : null;
        const title = sectionTitleMap[section.id][currentLang];

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

              {/* Status Chip */}
              {status && (
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
