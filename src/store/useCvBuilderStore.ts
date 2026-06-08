import { create } from "zustand";
import type { BuilderSection, CanonicalCvDocument, EvaluateSectionResponse } from "@shared/api";

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

  // BE draft (W5 — builder live): id draft trên BE + kết quả chấm live per-section
  draftId: string | null;
  sectionEvaluations: Partial<Record<BuilderSection, EvaluateSectionResponse>>;

  /** True khi store vừa được nạp từ CV đã chẩn đoán (Diagnosis → "Sửa CV"):
   *  báo cho Diagnosis page đẩy ngay nội dung vào draft mới sau khi tạo. */
  seededFromDiagnosis: boolean;

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

  // Actions — BE draft (W5)
  setDraftId: (id: string | null) => void;
  setSectionEvaluation: (section: BuilderSection, result: EvaluateSectionResponse) => void;

  // Actions — seed từ CV đã chẩn đoán
  /** Đổ 1 CanonicalCvDocument (từ Diagnosis) vào form builder + reset draft cho phiên sửa mới. */
  hydrateFromCanonical: (doc: CanonicalCvDocument) => void;
  setSeededFromDiagnosis: (val: boolean) => void;

  // Computed
  getSectionStatuses: () => SectionMeta[];
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
  template: "ats-modern",
  cvLanguage: "en" as CvLanguage,
  draftId: null as string | null,
  sectionEvaluations: {} as Partial<Record<BuilderSection, EvaluateSectionResponse>>,
  seededFromDiagnosis: false,
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
    activeSection: 0,
    seededFromDiagnosis: true,
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
  setDraftId: (draftId) => set({ draftId }),
  setSectionEvaluation: (section, result) =>
    set((s) => ({ sectionEvaluations: { ...s.sectionEvaluations, [section]: result } })),

  // Seed từ CV đã chẩn đoán
  hydrateFromCanonical: (doc) => set(canonicalToBuilderState(doc)),
  setSeededFromDiagnosis: (seededFromDiagnosis) => set({ seededFromDiagnosis }),
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
