import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { cn } from "@/lib/utils";
import { 
  User, Target, FileText, GraduationCap, Briefcase, 
  FolderGit2, Wrench, Award, CheckCircle, Check
} from "lucide-react";

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

export function CvSectionNav({ variant = "vertical" }: { variant?: "vertical" | "horizontal" }) {
  const { t, i18n } = useTranslation("diagnosis");
  const { activeSection, setActiveSection, getSectionStatuses } = useCvBuilderStore();
  const statuses = getSectionStatuses();
  const currentLang = i18n.language.startsWith("vi") ? "vi" : "en";

  // Calculate completion
  const doneCount = statuses.filter(s => s.status === "completed").length;
  const totalCount = 8; // There are 8 metadata statuses (0-7)

  // IntersectionObserver to sync scroll active section
  useEffect(() => {
    const callback = (entries: IntersectionObserverEntry[]) => {
      // Find the entry that is currently intersecting
      const visibleEntry = entries.find(entry => entry.isIntersecting);
      if (visibleEntry) {
        const id = visibleEntry.target.id;
        const idx = SECTIONS.findIndex(s => s.id === id);
        if (idx !== -1 && idx !== activeSection) {
          setActiveSection(idx);
        }
      }
    };

    const observer = new IntersectionObserver(callback, {
      rootMargin: "-40% 0px -55% 0px",
      threshold: 0
    });

    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeSection, setActiveSection]);

  const handleNavClick = (idx: number, id: string) => {
    setActiveSection(idx);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (variant === "horizontal") {
    return (
      <div className="flex items-center gap-2 overflow-x-auto py-3 px-4 bg-white scrollbar-none select-none">
        {SECTIONS.map((section, index) => {
          const Icon = section.icon;
          const isSelected = activeSection === index;
          const status = index < 8 ? statuses[index]?.status : null;
          const title = sectionTitleMap[section.id][currentLang];

          return (
            <button
              key={section.id}
              onClick={() => handleNavClick(index, section.id)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap outline-none shrink-0",
                isSelected
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-[#FBFBFA] border-[#EAEAEA] text-[#2F3437] hover:border-slate-350"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{title}</span>
              
              {/* Status dot in horizontal view */}
              {status === "completed" && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
              {status === "needs-improvement" && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Vertical layout (Sidebar)
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
        {SECTIONS.map((section, index) => {
          const Icon = section.icon;
          const isSelected = activeSection === index;
          const status = index < 8 ? statuses[index]?.status : null;
          const title = sectionTitleMap[section.id][currentLang];

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

              {/* Status indicator on the right */}
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
            </button>
          );
        })}
      </nav>
    </div>
  );
}
