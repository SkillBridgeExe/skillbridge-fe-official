import { create } from "zustand";
import type { BuilderSection, CanonicalCvDocument, EvaluateSectionResponse } from "@shared/api";
import type { AssistantAnswer, AssistantFieldPatch, CvAssistantTurn } from "@/types/companion";
import { isGibberish, checkRolePosition } from "@/lib/input-quality";
import type { ResumeData } from "@/lib/resume-engine/schema/resume/data";
import { adaptCvBuilderStoreToResumeData } from "@/lib/resume-engine/adapter";
import { TEMPLATE_PREVIEWS } from "@/lib/resume-engine/template-meta";
import type { Template } from "@/lib/resume-engine/schema/templates";

/* ── Types ── */
export type CareerLevel = "student" | "intern" | "fresher" | "junior" | "mid-level" | "career-switcher";
export type SummaryMode = "manual" | "ai";
export type CvLanguage = "en" | "vi";
export type ResumeFontScale = "small" | "normal" | "large";
export type ResumeDensity = "compact" | "comfortable";

export interface Education {
  id: string;
  school: string;
  major: string;
  degree: string;
  startYear: string;
  endYear: string;
  gpa: string;
  coursework: string;
  achievements: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  responsibilities: string;
  achievements: string;
  aiRewrite: string;
}

export interface Project {
  id: string;
  name: string;
  role: string;
  link: string;
  description: string;
  tools: string;
  contribution: string;
  result: string;
}

export interface Certification {
  id: string;
  name: string;
  organization: string;
  issueDate: string;
  credentialUrl: string;
}

export type SectionStatus = "completed" | "missing" | "needs-improvement";
export type SectionFixFeedback = {
  status: "needs_recheck";
  updatedAt: number;
};

export type CvBuilderSectionKey = "summary" | "experience" | "education" | "projects" | "skills" | "certifications";

export interface SectionMeta {
  label: string;
  status: SectionStatus;
  /** Optional machine code explaining a needs-improvement (e.g. "typo:Engineer", "industry_unclear"). */
  reason?: string;
}

export interface PendingProveItTarget {
  canonical: string;
  displayName: string;
}

/* ── Helpers ── */
let _idCounter = 0;
const uid = () => `cv_${Date.now()}_${++_idCounter}`;

const emptyEducation = (): Education => ({
  id: uid(), school: "", major: "", degree: "", startYear: "", endYear: "", gpa: "", coursework: "", achievements: "",
});

const emptyExperience = (): WorkExperience => ({
  id: uid(), company: "", position: "", startDate: "", endDate: "", description: "", responsibilities: "", achievements: "", aiRewrite: "",
});

const emptyProject = (): Project => ({
  id: uid(), name: "", role: "", link: "", description: "", tools: "", contribution: "", result: "",
});

const emptyCertification = (): Certification => ({
  id: uid(), name: "", organization: "", issueDate: "", credentialUrl: "",
});

/* ── State Interface ── */
export interface CvBuilderState {
  // Section 1: Basic Info
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github: string;

  // Section 2: Career Target
  targetPosition: string;
  careerLevel: CareerLevel | "";
  industry: string;

  // Section 3: Professional Summary
  summary: string;
  summaryMode: SummaryMode;

  // Section 4: Education
  education: Education[];

  // Section 5: Work Experience
  experience: WorkExperience[];

  // Section 6: Projects
  projects: Project[];

  // Section 7: Skills
  technicalSkills: string[];
  softSkills: string[];
  tools: string[];
  languages: string[];

  // Section 8: Certifications
  certifications: Certification[];

  // UI state
  activeSection: number;
  template: string;
  cvLanguage: CvLanguage;
  resumeAccentColor: string;
  resumeFontScale: ResumeFontScale;
  resumeDensity: ResumeDensity;
  resumeHideSectionIcons: boolean;
  sectionVisibility: Record<CvBuilderSectionKey, boolean>;
  sectionOrder: CvBuilderSectionKey[];

  // BE draft (W5 — builder live): id draft trên BE + kết quả chấm live per-section
  draftId: string | null;
  sectionEvaluations: Partial<Record<BuilderSection, EvaluateSectionResponse>>;
  sectionFixFeedback: Partial<Record<BuilderSection, SectionFixFeedback>>;

  /** True khi store vừa được nạp từ CV đã chẩn đoán (Diagnosis → "Sửa CV"):
   *  báo cho Diagnosis page đẩy ngay nội dung vào draft mới sau khi tạo. */
  seededFromDiagnosis: boolean;
  seedSourceCvId: string | null;

  // Actions — Basic Info
  setBasicInfo: (field: keyof Pick<CvBuilderState, "fullName" | "email" | "phone" | "location" | "linkedin" | "portfolio" | "github">, value: string) => void;

  // Actions — Career Target
  setCareerTarget: (field: keyof Pick<CvBuilderState, "targetPosition" | "careerLevel" | "industry">, value: string) => void;

  // Actions — Summary
  setSummary: (value: string) => void;
  setSummaryMode: (mode: SummaryMode) => void;

  // Actions — Education
  addEducation: () => void;
  updateEducation: (id: string, field: keyof Education, value: string) => void;
  removeEducation: (id: string) => void;
  duplicateEducation: (id: string) => void;
  moveEducation: (id: string, direction: "up" | "down") => void;

  // Actions — Experience
  addExperience: () => void;
  updateExperience: (id: string, field: keyof WorkExperience, value: string) => void;
  removeExperience: (id: string) => void;
  duplicateExperience: (id: string) => void;
  moveExperience: (id: string, direction: "up" | "down") => void;

  // Actions — Projects
  addProject: () => void;
  updateProject: (id: string, field: keyof Project, value: string) => void;
  removeProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  moveProject: (id: string, direction: "up" | "down") => void;

  // Actions — Skills
  setSkills: (field: keyof Pick<CvBuilderState, "technicalSkills" | "softSkills" | "tools" | "languages">, value: string[]) => void;
  addSkill: (field: keyof Pick<CvBuilderState, "technicalSkills" | "softSkills" | "tools" | "languages">, skill: string) => void;
  removeSkill: (field: keyof Pick<CvBuilderState, "technicalSkills" | "softSkills" | "tools" | "languages">, skill: string) => void;

  // Actions — Certifications
  addCertification: () => void;
  updateCertification: (id: string, field: keyof Certification, value: string) => void;
  removeCertification: (id: string) => void;
  duplicateCertification: (id: string) => void;
  moveCertification: (id: string, direction: "up" | "down") => void;

  // Actions — UI
  setActiveSection: (section: number) => void;
  setTemplate: (template: string) => void;
  setCvLanguage: (lang: CvLanguage) => void;
  setResumeAccentColor: (color: string) => void;
  setResumeFontScale: (scale: ResumeFontScale) => void;
  setResumeDensity: (density: ResumeDensity) => void;
  setResumeHideSectionIcons: (hide: boolean) => void;
  setSectionVisibility: (section: CvBuilderSectionKey, visible: boolean) => void;
  moveSection: (section: CvBuilderSectionKey, direction: "up" | "down") => void;
  moveSectionWithinGroup: (section: CvBuilderSectionKey, direction: "up" | "down", group: CvBuilderSectionKey[]) => void;
  resetSectionOrder: () => void;

  // Actions — BE draft (W5)
  setDraftId: (id: string | null) => void;
  setSectionEvaluation: (section: BuilderSection, result: EvaluateSectionResponse) => void;
  clearSectionEvaluation: (section: BuilderSection) => void;

  // Actions — seed từ CV đã chẩn đoán
  /** Đổ 1 CanonicalCvDocument (từ Diagnosis) vào form builder + reset draft cho phiên sửa mới. */
  hydrateFromCanonical: (doc: CanonicalCvDocument, opts?: { preserveDraft?: boolean }) => void;
  setSeededFromDiagnosis: (val: boolean) => void;
  setSeedSourceCvId: (id: string | null) => void;

  // ── Companion state (mascot state machine) ──
  mascotState: 'idle' | 'asking' | 'thinking' | 'presenting';
  companionField: string | null;
  companionSection: 'projects' | 'experience' | 'summary' | null;
  companionTurn: CvAssistantTurn | null;
  companionAnswers: AssistantAnswer[];
  companionPatch: AssistantFieldPatch | null;
  companionMessage: string | null;
  companionReaskCount: number;
  pendingProveIt: PendingProveItTarget | null;

  // Actions — Companion
  setMascotState: (state: CvBuilderState['mascotState']) => void;
  setCompanionField: (field: string | null, section: CvBuilderState['companionSection']) => void;
  setCompanionTurn: (turn: CvAssistantTurn | null) => void;
  addCompanionAnswer: (answer: AssistantAnswer) => void;
  clearCompanionAnswers: () => void;
  setCompanionPatch: (patch: AssistantFieldPatch | null) => void;
  setCompanionMessage: (msg: string | null) => void;
  incrementReask: () => void;
  setPendingProveIt: (target: PendingProveItTarget | null) => void;
  resetCompanion: () => void;

  // Computed
  getSectionStatuses: () => SectionMeta[];

  /**
   * RE-V1 Migration: Derives the new canonical ResumeData on the fly
   * from the legacy builder state. We defer structural store migration
   * to keep the old CV Builder UI working.
   */
  getResumeData: () => ResumeData;
  getCompletionPercent: () => number;

  // Reset
  reset: () => void;
}

const initialState = {
  fullName: "", email: "", phone: "", location: "", linkedin: "", portfolio: "", github: "",
  targetPosition: "", careerLevel: "" as const, industry: "",
  summary: "", summaryMode: "manual" as SummaryMode,
  education: [emptyEducation()],
  experience: [emptyExperience()],
  projects: [emptyProject()],
  technicalSkills: [], softSkills: [], tools: [], languages: [],
  certifications: [],
  activeSection: 0,
  template: "azurill",
  cvLanguage: "en" as CvLanguage,
  resumeAccentColor: "#0f172a",
  resumeFontScale: "normal" as ResumeFontScale,
  resumeDensity: "comfortable" as ResumeDensity,
  resumeHideSectionIcons: false,
  sectionVisibility: {
    summary: true,
    education: true,
    experience: true,
    projects: true,
    skills: true,
    certifications: true,
  } as Record<CvBuilderSectionKey, boolean>,
  sectionOrder: ["summary", "experience", "education", "projects", "certifications", "skills"] as CvBuilderSectionKey[],
  draftId: null as string | null,
  sectionEvaluations: {} as Partial<Record<BuilderSection, EvaluateSectionResponse>>,
  sectionFixFeedback: {} as Partial<Record<BuilderSection, SectionFixFeedback>>,
  seededFromDiagnosis: false,
  seedSourceCvId: null as string | null,
  // Companion
  mascotState: 'idle' as const,
  companionField: null as string | null,
  companionSection: null as 'projects' | 'experience' | 'summary' | null,
  companionTurn: null as CvAssistantTurn | null,
  companionAnswers: [] as AssistantAnswer[],
  companionPatch: null as AssistantFieldPatch | null,
  companionMessage: null as string | null,
  companionReaskCount: 0,
  pendingProveIt: null as PendingProveItTarget | null,
};

/* ── Map ngược CanonicalCvDocument → builder store (inverse của mapStoreToCanonical) ──
 * Forward map gộp nhiều field FE thành bullets/highlights, nên chiều ngược không tách
 * lại được — gom hết bullets về 1 ô (description/achievements) để user tự sắp lại. */
function canonicalToBuilderState(doc: CanonicalCvDocument) {
  const links = doc.contact?.links ?? [];
  const findLinkUrl = (...keys: string[]) =>
    links.find((l) =>
      keys.some((k) =>
        (l.label ?? "").toLowerCase().includes(k) || (l.url ?? "").toLowerCase().includes(k)),
    )?.url ?? "";
  const linkedin = findLinkUrl("linkedin");
  const github = findLinkUrl("github");
  const portfolio =
    links.find((l) => {
      const v = `${l.label ?? ""} ${l.url ?? ""}`.toLowerCase();
      return !v.includes("linkedin") && !v.includes("github");
    })?.url ?? "";

  const education: Education[] = (doc.education ?? []).map((e) => ({
    id: uid(),
    school: e.school ?? "",
    major: e.field ?? "",
    degree: e.degree ?? "",
    startYear: e.start ?? "",
    endYear: e.end ?? "",
    gpa: e.gpa ?? "",
    coursework: "",
    achievements: (e.highlights ?? []).join("\n"),
  }));

  const experience: WorkExperience[] = (doc.experience ?? []).map((x) => ({
    id: uid(),
    company: x.org ?? "",
    position: x.role ?? "",
    startDate: x.start ?? "",
    endDate: x.end ?? "",
    description: (x.bullets ?? []).join("\n"),
    responsibilities: "",
    achievements: "",
    aiRewrite: "",
  }));

  const projects: Project[] = (doc.projects ?? []).map((p) => ({
    id: uid(),
    name: p.name ?? "",
    role: p.role ?? "",
    link: p.link ?? "",
    description: (p.bullets ?? []).join("\n"),
    tools: (p.tech ?? []).join(", "),
    contribution: "",
    result: "",
  }));

  const certifications: Certification[] = (doc.certifications ?? []).map((c) => ({
    id: uid(),
    name: c.name ?? "",
    organization: c.issuer ?? "",
    issueDate: c.date ?? "",
    credentialUrl: "",
  }));

  return {
    fullName: doc.contact?.name ?? "",
    email: doc.contact?.email ?? "",
    phone: doc.contact?.phone ?? "",
    location: doc.contact?.location ?? "",
    linkedin,
    github,
    portfolio,
    summary: doc.summary ?? "",
    summaryMode: "manual" as SummaryMode,
    education: education.length ? education : [emptyEducation()],
    experience: experience.length ? experience : [emptyExperience()],
    projects: projects.length ? projects : [emptyProject()],
    technicalSkills: doc.skills?.technical ?? [],
    softSkills: doc.skills?.soft ?? [],
    tools: doc.skills?.tools ?? [],
    languages: doc.skills?.languages ?? [],
    certifications,
    cvLanguage: (doc.language === "vi" ? "vi" : "en") as CvLanguage,
    // Phiên sửa mới cho CV này: bỏ draft cũ + đánh giá cũ, bật cờ seed.
    draftId: null,
    sectionEvaluations: {},
    sectionFixFeedback: {},
    activeSection: 0,
    seededFromDiagnosis: true,
    seedSourceCvId: null,
  };
}

export const useCvBuilderStore = create<CvBuilderState>((set, get) => ({
  ...initialState,

  // Basic Info
  setBasicInfo: (field, value) => set({ [field]: value }),

  // Career Target
  setCareerTarget: (field, value) => set({ [field]: value }),

  // Summary
  setSummary: (value) => set({ summary: value }),
  setSummaryMode: (mode) => set({ summaryMode: mode }),

  // Education
  addEducation: () => set((s) => ({ education: [...s.education, emptyEducation()] })),
  updateEducation: (id, field, value) => set((s) => ({
    education: s.education.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
  })),
  removeEducation: (id) => set((s) => ({
    education: s.education.filter((e) => e.id !== id),
  })),
  duplicateEducation: (id) => set((s) => {
    const idx = s.education.findIndex((e) => e.id === id);
    if (idx < 0) return {};
    const cloned = { ...s.education[idx], id: uid() };
    const newArr = [...s.education];
    newArr.splice(idx + 1, 0, cloned);
    return { education: newArr };
  }),
  moveEducation: (id, direction) => set((s) => {
    const idx = s.education.findIndex((e) => e.id === id);
    if (idx < 0) return {};
    if (direction === "up" && idx === 0) return {};
    if (direction === "down" && idx === s.education.length - 1) return {};
    const newArr = [...s.education];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
    return { education: newArr };
  }),

  // Experience
  addExperience: () => set((s) => ({ experience: [...s.experience, emptyExperience()] })),
  updateExperience: (id, field, value) => set((s) => ({
    experience: s.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
  })),
  removeExperience: (id) => set((s) => ({
    experience: s.experience.filter((e) => e.id !== id),
  })),
  duplicateExperience: (id) => set((s) => {
    const idx = s.experience.findIndex((e) => e.id === id);
    if (idx < 0) return {};
    const cloned = { ...s.experience[idx], id: uid() };
    const newArr = [...s.experience];
    newArr.splice(idx + 1, 0, cloned);
    return { experience: newArr };
  }),
  moveExperience: (id, direction) => set((s) => {
    const idx = s.experience.findIndex((e) => e.id === id);
    if (idx < 0) return {};
    if (direction === "up" && idx === 0) return {};
    if (direction === "down" && idx === s.experience.length - 1) return {};
    const newArr = [...s.experience];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
    return { experience: newArr };
  }),

  // Projects
  addProject: () => set((s) => ({ projects: [...s.projects, emptyProject()] })),
  updateProject: (id, field, value) => set((s) => ({
    projects: s.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
  })),
  removeProject: (id) => set((s) => ({
    projects: s.projects.filter((p) => p.id !== id),
  })),
  duplicateProject: (id) => set((s) => {
    const idx = s.projects.findIndex((p) => p.id === id);
    if (idx < 0) return {};
    const cloned = { ...s.projects[idx], id: uid() };
    const newArr = [...s.projects];
    newArr.splice(idx + 1, 0, cloned);
    return { projects: newArr };
  }),
  moveProject: (id, direction) => set((s) => {
    const idx = s.projects.findIndex((p) => p.id === id);
    if (idx < 0) return {};
    if (direction === "up" && idx === 0) return {};
    if (direction === "down" && idx === s.projects.length - 1) return {};
    const newArr = [...s.projects];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
    return { projects: newArr };
  }),

  // Skills
  setSkills: (field, value) => set({ [field]: value }),
  addSkill: (field, skill) => set((s) => {
    const current = s[field] as string[];
    if (current.includes(skill)) return s;
    return { [field]: [...current, skill] };
  }),
  removeSkill: (field, skill) => set((s) => ({
    [field]: (s[field] as string[]).filter((sk) => sk !== skill),
  })),

  // Certifications
  addCertification: () => set((s) => ({ certifications: [...s.certifications, emptyCertification()] })),
  updateCertification: (id, field, value) => set((s) => ({
    certifications: s.certifications.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
  })),
  removeCertification: (id) => set((s) => ({
    certifications: s.certifications.filter((c) => c.id !== id),
  })),
  duplicateCertification: (id) => set((s) => {
    const idx = s.certifications.findIndex((c) => c.id === id);
    if (idx < 0) return {};
    const cloned = { ...s.certifications[idx], id: uid() };
    const newArr = [...s.certifications];
    newArr.splice(idx + 1, 0, cloned);
    return { certifications: newArr };
  }),
  moveCertification: (id, direction) => set((s) => {
    const idx = s.certifications.findIndex((c) => c.id === id);
    if (idx < 0) return {};
    if (direction === "up" && idx === 0) return {};
    if (direction === "down" && idx === s.certifications.length - 1) return {};
    const newArr = [...s.certifications];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
    return { certifications: newArr };
  }),

  // UI
  setActiveSection: (section) => set({ activeSection: section }),
  setDraftId: (draftId) => set({ draftId }),
  setSectionEvaluation: (section, result) =>
    set((s) => {
      const sectionFixFeedback = { ...s.sectionFixFeedback };
      delete sectionFixFeedback[section];
      return {
        sectionEvaluations: { ...s.sectionEvaluations, [section]: result },
        sectionFixFeedback,
      };
    }),
  clearSectionEvaluation: (section) =>
    set((s) => {
      const next = { ...s.sectionEvaluations };
      delete next[section];
      return {
        sectionEvaluations: next,
        sectionFixFeedback: {
          ...s.sectionFixFeedback,
          [section]: { status: "needs_recheck", updatedAt: Date.now() },
        },
      };
    }),

  // Seed từ CV đã chẩn đoán
  hydrateFromCanonical: (doc, opts) =>
    set((state) => {
      const next = canonicalToBuilderState(doc);
      // preserveDraft: reflect new canonical content in the form WITHOUT resetting the active
      // editing session. The default (fresh Diagnosis seed) nulls draftId — doing that inside an
      // active draft would break every draftId-gated builder action (save/evaluate/rewrite/PDF).
      return opts?.preserveDraft
        ? {
            ...next,
            draftId: state.draftId,
            activeSection: state.activeSection,
            sectionEvaluations: state.sectionEvaluations,
            sectionFixFeedback: state.sectionFixFeedback,
            seededFromDiagnosis: state.seededFromDiagnosis,
            seedSourceCvId: state.seedSourceCvId,
          }
        : next;
    }),
  setSeededFromDiagnosis: (seededFromDiagnosis) => set({ seededFromDiagnosis }),
  setSeedSourceCvId: (seedSourceCvId) => set({ seedSourceCvId }),
  setTemplate: (template) => set(() => {
    const meta = TEMPLATE_PREVIEWS[template as Template];
    if (meta) {
      return { 
        template,
        resumeAccentColor: meta.accent,
        resumeDensity: meta.density,
        resumeFontScale: meta.fontScale,
      };
    }
    return { template };
  }),
  setCvLanguage: (cvLanguage) => set({ cvLanguage }),
  setResumeAccentColor: (resumeAccentColor) => set({ resumeAccentColor }),
  setResumeFontScale: (resumeFontScale) => set({ resumeFontScale }),
  setResumeDensity: (resumeDensity) => set({ resumeDensity }),
  setResumeHideSectionIcons: (resumeHideSectionIcons) => set({ resumeHideSectionIcons }),
  setSectionVisibility: (section, visible) => set((s) => ({
    sectionVisibility: { ...s.sectionVisibility, [section]: visible },
  })),
  moveSection: (section, direction) => set((s) => {
    const idx = s.sectionOrder.indexOf(section);
    if (idx < 0) return {};
    if (direction === "up" && idx === 0) return {};
    if (direction === "down" && idx === s.sectionOrder.length - 1) return {};
    const newOrder = [...s.sectionOrder];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    return { sectionOrder: newOrder };
  }),
  moveSectionWithinGroup: (section, direction, group) => set((s) => {
    const allowed = new Set(group);
    const orderedGroup = s.sectionOrder.filter((key) => allowed.has(key));
    const groupIdx = orderedGroup.indexOf(section);
    if (groupIdx < 0) return {};
    if (direction === "up" && groupIdx === 0) return {};
    if (direction === "down" && groupIdx === orderedGroup.length - 1) return {};

    const targetIdx = direction === "up" ? groupIdx - 1 : groupIdx + 1;
    [orderedGroup[groupIdx], orderedGroup[targetIdx]] = [orderedGroup[targetIdx], orderedGroup[groupIdx]];

    let cursor = 0;
    return {
      sectionOrder: s.sectionOrder.map((key) => (allowed.has(key) ? orderedGroup[cursor++] : key)),
    };
  }),
  resetSectionOrder: () => set({
    sectionOrder: [...initialState.sectionOrder],
  }),

  // Computed
  getResumeData: () => adaptCvBuilderStoreToResumeData(get()),

  getSectionStatuses: () => {
    const s = get();
    const statuses: SectionMeta[] = [];

    // 1. Basic Info
    const basicFilled = [s.fullName, s.email, s.phone].every((v) => v.trim());
    statuses.push({ label: "Basic Information", status: basicFilled ? "completed" : "missing" });

    // 2. Career Target — presence first, then QUALITY (gibberish industry / role typo).
    const careerPresent = !!(s.targetPosition.trim() && s.careerLevel);
    const roleCheck = checkRolePosition(s.targetPosition);
    const industryBad = s.industry.trim() ? isGibberish(s.industry) : false;
    let careerStatus: SectionStatus = careerPresent ? "completed" : "missing";
    let careerReason: string | undefined;
    if (careerPresent && (!roleCheck.ok || industryBad)) {
      careerStatus = "needs-improvement";
      careerReason = !roleCheck.ok
        ? (roleCheck.suspectedTypo ? `typo:${roleCheck.suspectedTypo}` : "role_unclear")
        : "industry_unclear";
    }
    statuses.push({ label: "Career Target", status: careerStatus, reason: careerReason });

    // 3. Summary — length AND not gibberish.
    const summaryText = s.summary.trim();
    const summaryStatus: SectionStatus = !summaryText
      ? "missing"
      : isGibberish(summaryText) || summaryText.length <= 30
        ? "needs-improvement"
        : "completed";
    statuses.push({ label: "Professional Summary", status: summaryStatus });

    // 4. Education
    const hasEdu = s.education.some((e) => e.school.trim() && e.major.trim());
    statuses.push({ label: "Education", status: hasEdu ? "completed" : "missing" });

    // 5. Experience
    const hasExp = s.experience.some((e) => e.company.trim() && e.position.trim());
    const expHasDetail = s.experience.some((e) => e.description.trim() || e.responsibilities.trim());
    statuses.push({ label: "Work Experience", status: hasExp && expHasDetail ? "completed" : hasExp ? "needs-improvement" : "missing" });

    // 6. Projects
    const hasProj = s.projects.some((p) => p.name.trim());
    statuses.push({ label: "Projects", status: hasProj ? "completed" : "missing" });

    // 7. Skills
    const totalSkills = s.technicalSkills.length + s.softSkills.length + s.tools.length;
    statuses.push({ label: "Skills", status: totalSkills >= 5 ? "completed" : totalSkills > 0 ? "needs-improvement" : "missing" });

    // 8. Certifications
    const hasCerts = s.certifications.some((c) => c.name.trim());
    statuses.push({ label: "Certifications", status: hasCerts ? "completed" : "missing" });

    return statuses;
  },

  getCompletionPercent: () => {
    const statuses = get().getSectionStatuses();
    const weights = { completed: 1, "needs-improvement": 0.5, missing: 0 };
    const total = statuses.reduce((acc, s) => acc + weights[s.status], 0);
    return Math.round((total / statuses.length) * 100);
  },

  reset: () => set({
    ...initialState,
    education: [emptyEducation()],
    experience: [emptyExperience()],
    projects: [emptyProject()],
  }),

  // ── Companion ──
  setMascotState: (mascotState) => set({ mascotState }),
  setCompanionField: (companionField, companionSection) => set({
    companionField,
    companionSection,
    // Reset companion state when switching fields
    mascotState: 'idle',
    companionTurn: null,
    companionAnswers: [],
    companionPatch: null,
    companionMessage: null,
    companionReaskCount: 0,
  }),
  setCompanionTurn: (companionTurn) => set({ companionTurn }),
  addCompanionAnswer: (answer) => set((s) => ({
    companionAnswers: [...s.companionAnswers, answer],
  })),
  clearCompanionAnswers: () => set({ companionAnswers: [] }),
  setCompanionPatch: (companionPatch) => set({ companionPatch }),
  setCompanionMessage: (companionMessage) => set({ companionMessage }),
  incrementReask: () => set((s) => ({ companionReaskCount: s.companionReaskCount + 1 })),
  setPendingProveIt: (pendingProveIt) => set({ pendingProveIt }),
  resetCompanion: () => set({
    mascotState: 'idle',
    companionField: null,
    companionSection: null,
    companionTurn: null,
    companionAnswers: [],
    companionPatch: null,
    companionMessage: null,
    companionReaskCount: 0,
    pendingProveIt: null,
  }),
}));
