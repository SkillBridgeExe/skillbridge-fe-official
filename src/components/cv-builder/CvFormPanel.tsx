import { useCvBuilderStore, type Education, type WorkExperience, type Project, type Certification } from "@/store/useCvBuilderStore";
import { useTranslation } from "react-i18next";
import {
  User, Target, FileText, GraduationCap, Briefcase,
  FolderGit2, Wrench, Award, CheckCircle, Check, X, Gauge, RotateCcw, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import * as Sections from "./sections";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useEvaluateSectionMutation } from "@/hooks/use-cv-builder";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCompanionStore } from "@/store/useCompanionStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BuilderSection } from "@shared/api";
import { getBuilderSnapshot } from "./builder-snapshot";

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

/**
 * FE fallback map for known BE English evaluation text → Vietnamese.
 * Only maps stable strings the BE is known to return.
 * Unknown strings pass through as-is (do not machine-translate arbitrary text).
 */
const BE_TEXT_VI_MAP: Record<string, string> = {
  // Labels
  "Excellent": "Rất tốt",
  "Good": "Tốt",
  "Needs improvement": "Cần cải thiện",
  "NEEDS IMPROVEMENT": "Cần cải thiện",
  "Needs Improvement": "Cần cải thiện",
  "No data": "Chưa có thông tin",
  "Missing": "Thiếu",
  // Common checklist criteria — summary
  "No obvious format/spelling issues": "Không có lỗi định dạng/chính tả rõ ràng",
  "Summary length is adequate": "Độ dài tóm tắt phù hợp",
  "Contains action verbs": "Có động từ hành động",
  "Contains measurable results": "Có kết quả đo lường được",
  "2-3 concise sentences: strengths + goal": "2-3 câu ngắn gọn: điểm mạnh + mục tiêu",
  "Active voice, strong words": "Câu chủ động, từ ngữ mạnh",
  "No first-person pronouns": "Không dùng đại từ ngôi thứ nhất",
  "No vague/buzzword filler": "Không dùng từ chung chung/buzzword",
  // Common checklist criteria — experience
  "Each role has measurable impact bullets": "Mỗi vị trí có gạch đầu dòng thể hiện tác động đo lường được",
  "Action verbs lead each bullet": "Mỗi gạch đầu dòng bắt đầu bằng động từ hành động",
  "No passive voice": "Không dùng câu bị động",
  "Dates are consistent": "Ngày tháng nhất quán",
  "Job titles are clear": "Chức danh rõ ràng",
  // Common checklist criteria — projects
  "Each project needs a name": "Mỗi dự án cần có tên",
  "Each project needs a description": "Mỗi dự án cần có mô tả",
  "Each project needs tools/technologies": "Mỗi dự án cần công cụ/công nghệ",
  "Projects show impact or outcome": "Dự án thể hiện tác động hoặc kết quả",
  // Common checklist criteria — skills
  "Has relevant skills listed": "Có liệt kê kỹ năng liên quan",
  "Skills are categorized": "Kỹ năng được phân loại",
  "No outdated or irrelevant skills": "Không có kỹ năng lỗi thời hoặc không liên quan",
  // Common checklist criteria — education
  "Degree and major are specified": "Đã ghi rõ bằng cấp và chuyên ngành",
  "GPA included if strong": "Điểm GPA nếu cao",
  // Common checklist criteria — basic info
  "Email is provided": "Đã cung cấp email",
  "Phone number is provided": "Đã cung cấp số điện thoại",
  "Full name is provided": "Đã cung cấp họ tên",
  "LinkedIn or portfolio link provided": "Đã cung cấp link LinkedIn hoặc portfolio",
  // Common missing text
  "Add a professional summary": "Thêm tóm tắt chuyên môn",
  "Add work experience details": "Thêm chi tiết kinh nghiệm làm việc",
  "Add project descriptions": "Thêm mô tả dự án",
  "Add measurable achievements": "Thêm thành tích đo lường được",
  "Add more technical skills": "Thêm kỹ năng kỹ thuật",
  "Add education details": "Thêm thông tin học vấn",
  "Include quantified results": "Bao gồm kết quả định lượng",
  "Use stronger action verbs": "Sử dụng động từ hành động mạnh hơn",
  "Remove buzzwords and filler": "Loại bỏ từ chung chung và từ thừa",
  "Shorten to 2-3 sentences": "Rút gọn còn 2-3 câu",
};

/** Localize known BE English text when UI is Vietnamese. Pass-through otherwise. */
function localizeBeText(text: string, lang: "vi" | "en"): string {
  if (lang === "en") return text;
  return BE_TEXT_VI_MAP[text] ?? BE_TEXT_VI_MAP[text.trim()] ?? text;
}

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

export function CvFormPanel() {
  const { t, i18n } = useTranslation("diagnosis");
  const store = useCvBuilderStore();
  const prefersReducedMotion = useReducedMotion();
  const { activeSection, draftId, sectionEvaluations, setSectionEvaluation, sectionFixFeedback, collapsedSections, toggleSectionCollapse, sectionOrder } = store;
  const statuses = store.getSectionStatuses();
  const currentLang = i18n.language.startsWith("vi") ? "vi" : "en";
  const isLoggedIn = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.authSource === "api",
  );

  const orderedSections = useMemo(() => [
    SECTIONS.find(s => s.id === "basic-info")!,
    SECTIONS.find(s => s.id === "career-target")!,
    ...sectionOrder.map(id => SECTIONS.find(s => s.id === id)).filter(Boolean) as typeof SECTIONS[0][],
    SECTIONS.find(s => s.id === "review")!,
  ], [sectionOrder]);

  // Intersection Observer for scroll tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let maxVisibleRatio = 0;
        let mostVisibleSectionIdx = -1;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-section-idx"));
            // We can just pick the first one that intersects near the top (e.g., threshold > 0)
            // or simply the one currently intersecting
            if (!isNaN(idx) && entry.intersectionRatio > maxVisibleRatio) {
              maxVisibleRatio = entry.intersectionRatio;
              mostVisibleSectionIdx = idx;
            }
          }
        });

        if (mostVisibleSectionIdx !== -1) {
          // Check if it's actually a user scroll versus a programmatic scroll
          // We'll just set active section to keep the left nav in sync
          useCvBuilderStore.getState().setActiveSection(mostVisibleSectionIdx);
        }
      },
      { root: null, rootMargin: "-10% 0px -60% 0px", threshold: [0, 0.5, 1] }
    );

    const elements = document.querySelectorAll(".cv-section-card");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [orderedSections]);

  const [evaluatingMap, setEvaluatingMap] = useState<Record<string, boolean>>({});
  const evaluateMutation = useEvaluateSectionMutation();

  // Companion is builder-scoped: clear the floating dolphin + its context registry when the builder
  // unmounts, so it doesn't follow the user onto unrelated pages (anti-Clippy).
  useEffect(() => () => useCompanionStore.getState().resetCompanion(), []);

  const handleEvaluateSection = useCallback((beSection: BuilderSection, _sectionId: string) => {
    if (!isLoggedIn || !draftId) return;

    const state = useCvBuilderStore.getState();
    const snapshot = getBuilderSnapshot(state);
    const roleCode = useDiagnosisStore.getState().targetRole;

    // Override cvLanguage with current UI language so BE returns localized text
    const uiLang = i18n.language.startsWith("vi") ? "vi" : "en";
    snapshot.cvLanguage = uiLang as typeof snapshot.cvLanguage;

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
  }, [draftId, evaluateMutation, i18n.language, isLoggedIn, setSectionEvaluation]);

  const prevActiveSectionRef = useRef(activeSection);

  useEffect(() => {
    const prevIdx = prevActiveSectionRef.current;
    prevActiveSectionRef.current = activeSection;

    if (prevIdx === activeSection) return;

    if (!isLoggedIn || !draftId) return;

    const prevSection = orderedSections[prevIdx];
    if (!prevSection) return;

    const beSection = sectionUiToBeMap[prevSection.id];
    if (!beSection) return;

    const state = useCvBuilderStore.getState();
    if (!isSectionDirty(prevSection.id, state)) return;

    const timer = setTimeout(() => {
      handleEvaluateSection(beSection, prevSection.id);
    }, 400);

    return () => clearTimeout(timer);
  }, [activeSection, draftId, handleEvaluateSection, isLoggedIn, orderedSections]);

  const renderEvaluateChip = (beSection: BuilderSection, sectionId: string) => {
    const evaluation = sectionEvaluations[beSection];
    const isEvaluating = evaluatingMap[beSection];

    if (isEvaluating) {
      return (
        <div className="w-16 h-6 bg-slate-100 animate-pulse rounded-full shrink-0" />
      );
    }

    const fixFeedback = sectionFixFeedback[beSection];
    if (fixFeedback) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleEvaluateSection(beSection, sectionId); }}
          className="h-7 px-2.5 py-1 text-[11px] font-mono font-bold rounded-full transition-colors flex items-center gap-1 shrink-0 shadow-sm bg-[#FFF8E6] text-[#D97706] hover:bg-[#FEF0C7] border border-[#FDE68A]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="font-sans font-semibold text-[10px] uppercase tracking-wider">
            {t("builder.review.recheckSectionShort")}
          </span>
        </Button>
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
              <span className="font-sans font-semibold text-[9px] uppercase tracking-wider">{localizeBeText(label, currentLang)}</span>
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
                    {localizeBeText(item.criterion, currentLang)}
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
                    <li key={i}>{localizeBeText(txt, currentLang)}</li>
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
    <div className="flex flex-col relative max-w-4xl mx-auto pb-32 space-y-4">
      {orderedSections.map((section, index) => {
        const Icon = section.icon;
        const statusIdx = STATUS_INDEX_MAP[section.id];
        const status = statusIdx !== undefined ? statuses[statusIdx]?.status : null;
        const title = sectionTitleMap[section.id][currentLang];
        const beSection = sectionUiToBeMap[section.id];
        const isReview = section.id === "review";
        const isHidden = (["summary", "experience", "education", "projects", "skills", "certifications"].includes(section.id)) && store.sectionVisibility[section.id as keyof typeof store.sectionVisibility] === false;

        // Add active highlighting style
        const isActive = activeSection === index;

        return (
          <div
            key={section.id}
            id={`cv-section-${section.id}`}
            data-section-idx={index}
            className={cn(
              "cv-section-card overflow-hidden transition-all duration-300 scroll-mt-6",
              isHidden ? "bg-slate-50/50 opacity-60" : "bg-white",
              isActive ? "ring-1 ring-primary/20 border-primary/20" : "border-slate-200",
              "border rounded-lg"
            )}
          >
            <div
              className={cn(
                "px-3 py-2 border-b transition-colors cursor-pointer select-none group",
                isHidden ? "bg-transparent border-slate-100" : "bg-slate-50/50 hover:bg-slate-50 border-slate-200"
              )}
              onClick={() => toggleSectionCollapse(section.id)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", isHidden ? "bg-slate-100/50 text-slate-400" : isActive ? "bg-primary/10 text-primary" : "bg-white border border-slate-200 text-slate-500 shadow-sm")}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className={cn("font-bold text-sm tracking-tight", isHidden ? "text-slate-400" : "text-slate-900")}>{title}</h4>
                    {isHidden && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200/70 text-slate-500 uppercase tracking-wider">
                        {t("builder.review.hidden")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Chip / Score Chip */}
                <div
                  className="flex items-center gap-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  {!isReview && (isLoggedIn && beSection ? (
                    renderEvaluateChip(beSection, section.id)
                  ) : (
                    status && (
                      <div className="flex items-center">
                        {status === "completed" && (
                          <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#EDF3EC] text-[#346538]">
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span>{t("builder.review.doneShort")}</span>
                          </div>
                        )}
                        {status === "needs-improvement" && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#FEF7EA] text-[#B98900]">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{t("builder.review.improveShort")}</span>
                          </div>
                        )}
                        {status === "missing" && (
                          <div className="px-2.5 py-1 text-xs font-semibold rounded-full border border-[#EAEAEA] text-[#787774] bg-[#FBFBFA]">
                            <span>{t("builder.review.missingShort")}</span>
                          </div>
                        )}
                      </div>
                    )
                  ))}

                  {/* Collapse Toggle */}
                  <button
                    type="button"
                    className="text-slate-400 transition-colors group-hover:text-slate-600"
                    onClick={() => toggleSectionCollapse(section.id)}
                    aria-label={collapsedSections[section.id] ? t("builder.expandSection") : t("builder.collapseSection")}
                    title={collapsedSections[section.id] ? t("builder.expandSection") : t("builder.collapseSection")}
                  >
                    {collapsedSections[section.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {!collapsedSections[section.id] && (
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeInOut" }}
                >
                  <div className={cn("p-3 pt-3", isHidden && "pointer-events-none")}>
                    <section.component />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
