import { create } from "zustand";

/* ── Types ── */
export type CareerLevel = "student" | "intern" | "fresher" | "junior" | "mid-level" | "career-switcher";
export type SummaryMode = "manual" | "ai";
export type CvLanguage = "en" | "vi";

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

export interface SectionMeta {
  label: string;
  status: SectionStatus;
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
  id: uid(), name: "", role: "", description: "", tools: "", contribution: "", result: "",
});

const emptyCertification = (): Certification => ({
  id: uid(), name: "", organization: "", issueDate: "", credentialUrl: "",
});

/* ── State Interface ── */
interface CvBuilderState {
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
  preferredLanguage: string;

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

  // Actions — Basic Info
  setBasicInfo: (field: keyof Pick<CvBuilderState, "fullName" | "email" | "phone" | "location" | "linkedin" | "portfolio" | "github">, value: string) => void;

  // Actions — Career Target
  setCareerTarget: (field: keyof Pick<CvBuilderState, "targetPosition" | "careerLevel" | "industry" | "preferredLanguage">, value: string) => void;

  // Actions — Summary
  setSummary: (value: string) => void;
  setSummaryMode: (mode: SummaryMode) => void;

  // Actions — Education
  addEducation: () => void;
  updateEducation: (id: string, field: keyof Education, value: string) => void;
  removeEducation: (id: string) => void;

  // Actions — Experience
  addExperience: () => void;
  updateExperience: (id: string, field: keyof WorkExperience, value: string) => void;
  removeExperience: (id: string) => void;

  // Actions — Projects
  addProject: () => void;
  updateProject: (id: string, field: keyof Project, value: string) => void;
  removeProject: (id: string) => void;

  // Actions — Skills
  setSkills: (field: keyof Pick<CvBuilderState, "technicalSkills" | "softSkills" | "tools" | "languages">, value: string[]) => void;
  addSkill: (field: keyof Pick<CvBuilderState, "technicalSkills" | "softSkills" | "tools" | "languages">, skill: string) => void;
  removeSkill: (field: keyof Pick<CvBuilderState, "technicalSkills" | "softSkills" | "tools" | "languages">, skill: string) => void;

  // Actions — Certifications
  addCertification: () => void;
  updateCertification: (id: string, field: keyof Certification, value: string) => void;
  removeCertification: (id: string) => void;

  // Actions — UI
  setActiveSection: (section: number) => void;
  setTemplate: (template: string) => void;
  setCvLanguage: (lang: CvLanguage) => void;

  // Computed
  getSectionStatuses: () => SectionMeta[];
  getCompletionPercent: () => number;

  // Reset
  reset: () => void;
}

const initialState = {
  fullName: "", email: "", phone: "", location: "", linkedin: "", portfolio: "", github: "",
  targetPosition: "", careerLevel: "" as const, industry: "", preferredLanguage: "",
  summary: "", summaryMode: "manual" as SummaryMode,
  education: [emptyEducation()],
  experience: [emptyExperience()],
  projects: [emptyProject()],
  technicalSkills: [], softSkills: [], tools: [], languages: [],
  certifications: [],
  activeSection: 0,
  template: "ats-modern",
  cvLanguage: "en" as CvLanguage,
};

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
    education: s.education.length > 1 ? s.education.filter((e) => e.id !== id) : s.education,
  })),

  // Experience
  addExperience: () => set((s) => ({ experience: [...s.experience, emptyExperience()] })),
  updateExperience: (id, field, value) => set((s) => ({
    experience: s.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
  })),
  removeExperience: (id) => set((s) => ({
    experience: s.experience.length > 1 ? s.experience.filter((e) => e.id !== id) : s.experience,
  })),

  // Projects
  addProject: () => set((s) => ({ projects: [...s.projects, emptyProject()] })),
  updateProject: (id, field, value) => set((s) => ({
    projects: s.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
  })),
  removeProject: (id) => set((s) => ({
    projects: s.projects.length > 1 ? s.projects.filter((p) => p.id !== id) : s.projects,
  })),

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

  // UI
  setActiveSection: (section) => set({ activeSection: section }),
  setTemplate: (template) => set({ template }),
  setCvLanguage: (cvLanguage) => set({ cvLanguage }),

  // Computed
  getSectionStatuses: () => {
    const s = get();
    const statuses: SectionMeta[] = [];

    // 1. Basic Info
    const basicFilled = [s.fullName, s.email, s.phone].every((v) => v.trim());
    statuses.push({ label: "Basic Information", status: basicFilled ? "completed" : "missing" });

    // 2. Career Target
    const careerFilled = s.targetPosition.trim() && s.careerLevel;
    statuses.push({ label: "Career Target", status: careerFilled ? "completed" : "missing" });

    // 3. Summary
    statuses.push({ label: "Professional Summary", status: s.summary.trim().length > 30 ? "completed" : s.summary.trim() ? "needs-improvement" : "missing" });

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

  reset: () => set({ ...initialState, education: [emptyEducation()], experience: [emptyExperience()], projects: [emptyProject()] }),
}));
