import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BuilderSection, CanonicalCvDocument, EvaluateSectionResponse } from "@shared/api";
import type { AssistantAnswer, AssistantFieldPatch, CvAssistantTurn } from "@/types/companion";
import { isGibberish, checkRolePosition } from "@/lib/input-quality";
import type { ResumeData } from "@/lib/resume-engine/schema/resume/data";
import { adaptCvBuilderStoreToResumeData } from "@/lib/resume-engine/adapter";
import type { CustomSection, ResumeDocumentV1 } from "@/lib/resume-engine/document-v1";
import {
  projectCustomSectionsToActivities,
  sanitizeCustomSections,
  sanitizeLayoutPages,
  sanitizeSectionPage,
  UNTITLED_CUSTOM_SECTION,
} from "@/lib/resume-engine/layout-plan";
import { builderStateToResumeDocumentV1 } from "@/lib/resume-engine/document-v1-adapter";
import { TEMPLATE_PREVIEWS } from "@/lib/resume-engine/template-meta";
import type { Template } from "@/lib/resume-engine/schema/templates";

/* ── Types ── */
export type CareerLevel = "student" | "intern" | "fresher" | "junior" | "mid-level" | "career-switcher";
export type SummaryMode = "manual" | "ai";
export type CvLanguage = "en" | "vi";
export type ResumeFontScale = "small" | "normal" | "large";
export type ResumeFontFamily = "inter" | "serif" | "roboto" | "merriweather" | "mono";
export type ResumeLineHeight = "tight" | "normal" | "relaxed";
export type ResumeSpacing = "compact" | "normal" | "spacious";

export type ProfileLink = { id: string; network: string; url: string; label?: string; visible?: boolean; };
export type CustomField = { id: string; name: string; value: string; icon?: string; };
export type LanguageDetail = { id: string; name: string; proficiency: string; };

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
  source?: "manual_edit" | "assistant_patch" | "diagnosis_fix";
  fieldPath?: string;
  beforePreview?: string;
  afterPreview?: string;
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

const emptyProfileLink = (): ProfileLink => ({ id: uid(), network: "", url: "", visible: true });
const emptyCustomField = (): CustomField => ({ id: uid(), name: "", value: "", icon: "" });
const emptyLanguageDetail = (): LanguageDetail => ({ id: uid(), name: "", proficiency: "" });

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
  // W67: Resume metadata — title of the resume doc, NOT the candidate's full name
  resumeTitle: string;

  // Section 1: Basic Info
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github: string;
  photoUrl: string;
  profileLinks: ProfileLink[];
  customFields: CustomField[];

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
  languageDetails: LanguageDetail[];

  // Section 8: Certifications
  certifications: Certification[];

  // UI state
  activeSection: number;
  template: string;
  cvLanguage: CvLanguage;
  resumeAccentColor: string;
  resumeFontFamily: ResumeFontFamily;
  resumeFontScale: ResumeFontScale;
  resumeLineHeight: ResumeLineHeight;
  resumePageMargin: ResumeSpacing;
  resumeSectionSpacing: ResumeSpacing;
  resumeSidebarPosition: "left" | "right";
  resumeSidebarWidth: "narrow" | "normal" | "wide";
  resumeDividerStyle: "none" | "line" | "accent" | "subtle";
  resumeHideSectionIcons: boolean;
  sectionVisibility: Record<CvBuilderSectionKey, boolean>;
  sectionOrder: CvBuilderSectionKey[];
  sectionPlacement: Partial<Record<CvBuilderSectionKey, "main" | "sidebar">>;
  collapsedSections: Record<string, boolean>;

  // P4: canonical layout plan projection (pages + per-section page assignment + custom sections)
  layoutPages: Array<{ id: string; name?: string; fullWidth?: boolean }>;
  /** sectionId (builtin key or custom id) -> layoutPages[].id; missing = first page. */
  sectionPage: Record<string, string>;
  customSections: CustomSection[];
  /**
   * Which CV the persisted customSections belong to. Hydrating a DIFFERENT
   * CV must never inherit them (they contain content, not just layout).
   */
  customSectionsCvId: string | null;
  /** Transient: real page count of the last rendered preview PDF (overflow honesty). */
  renderedPageCount: number | null;

  // W87: Avatar customization
  resumePictureVisible: boolean;
  resumePictureShape: "circle" | "rounded" | "square";
  resumePictureSize: number;
  resumePictureBorderWidth: number;
  resumePictureBorderColor: string;

  // W88: Typography
  resumeHeadingScale: "match" | "prominent" | "subtle";
  resumeBaseFontSize: number;

  // W89: Theme & Density
  resumeAtsSafeMode: boolean;
  resumeTextColor: string;

  // BE draft (W5 — builder live): id draft trên BE + kết quả chấm live per-section
  draftId: string | null;
  sectionEvaluations: Partial<Record<BuilderSection, EvaluateSectionResponse>>;
  sectionFixFeedback: Partial<Record<BuilderSection, SectionFixFeedback>>;

  /** True khi store vừa được nạp từ CV đã chẩn đoán (Diagnosis → "Sửa CV"):
   *  báo cho Diagnosis page đẩy ngay nội dung vào draft mới sau khi tạo. */
  seededFromDiagnosis: boolean;
  seedSourceCvId: string | null;
  /** cvId đã chẩn đoán — KHÔNG bị consume-then-clear như seedSourceCvId,
   *  để builder chat/panel tra ngược review của CV cha. */
  diagnosisSourceCvId: string | null;

  // Actions — Basic Info
  setBasicInfo: (field: keyof Pick<CvBuilderState, "fullName" | "email" | "phone" | "location" | "linkedin" | "portfolio" | "github" | "photoUrl">, value: string) => void;
  addProfileLink: () => void;
  updateProfileLink: (id: string, field: keyof ProfileLink, value: string | boolean) => void;
  removeProfileLink: (id: string) => void;
  addCustomField: () => void;
  updateCustomField: (id: string, field: keyof CustomField, value: string) => void;
  removeCustomField: (id: string) => void;

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
  addLanguageDetail: () => void;
  updateLanguageDetail: (id: string, field: keyof LanguageDetail, value: string) => void;
  removeLanguageDetail: (id: string) => void;

  // Actions — Certifications
  addCertification: () => void;
  updateCertification: (id: string, field: keyof Certification, value: string) => void;
  removeCertification: (id: string) => void;
  duplicateCertification: (id: string) => void;
  moveCertification: (id: string, direction: "up" | "down") => void;

  // Actions — Resume metadata (W67)
  setResumeTitle: (title: string) => void;

  // Actions — UI
  setActiveSection: (section: number) => void;
  setTemplate: (template: string) => void;
  setCvLanguage: (lang: CvLanguage) => void;
  setResumeAccentColor: (color: string) => void;
  setResumeFontFamily: (family: ResumeFontFamily) => void;
  setResumeFontScale: (scale: ResumeFontScale) => void;
  setResumeLineHeight: (lineHeight: ResumeLineHeight) => void;
  setResumePageMargin: (margin: ResumeSpacing) => void;
  setResumeSectionSpacing: (spacing: ResumeSpacing) => void;
  setResumeSidebarPosition: (val: "left" | "right") => void;
  setResumeSidebarWidth: (val: "narrow" | "normal" | "wide") => void;
  setResumeDividerStyle: (val: "none" | "line" | "accent" | "subtle") => void;
  setResumeHideSectionIcons: (hide: boolean) => void;
  setSectionVisibility: (section: CvBuilderSectionKey, visible: boolean) => void;
  moveSection: (section: CvBuilderSectionKey, direction: "up" | "down") => void;
  moveSectionWithinGroup: (section: CvBuilderSectionKey, direction: "up" | "down", group: CvBuilderSectionKey[]) => void;
  resetSectionOrder: () => void;
  reorderSection: (activeId: CvBuilderSectionKey, overId: CvBuilderSectionKey) => void;
  setSectionPlacement: (section: CvBuilderSectionKey, placement: "main" | "sidebar") => void;

  // Actions — P4 layout pages
  addLayoutPage: () => void;
  removeLayoutPage: (pageId: string) => void;
  renameLayoutPage: (pageId: string, name: string) => void;
  moveLayoutPage: (pageId: string, direction: "up" | "down") => void;
  setLayoutPageFullWidth: (pageId: string, fullWidth: boolean) => void;
  assignSectionToPage: (sectionId: string, pageId: string) => void;

  // Actions — P4 custom sections
  addCustomSection: (title: string) => void;
  updateCustomSection: (id: string, patch: Partial<Omit<CustomSection, "id">>) => void;
  removeCustomSection: (id: string) => void;
  moveCustomSection: (id: string, direction: "up" | "down") => void;
  setRenderedPageCount: (count: number | null) => void;
  toggleSectionCollapse: (sectionId: string) => void;
  setSectionCollapsed: (sectionId: string, collapsed: boolean) => void;
  setResumePictureVisible: (visible: boolean) => void;
  setResumePictureShape: (shape: "circle" | "rounded" | "square") => void;
  setResumePictureSize: (size: number) => void;
  setResumePictureBorderWidth: (width: number) => void;
  setResumePictureBorderColor: (color: string) => void;
  setResumeHeadingScale: (scale: "match" | "prominent" | "subtle") => void;
  setResumeBaseFontSize: (size: number) => void;
  setResumeAtsSafeMode: (safeMode: boolean) => void;
  setResumeTextColor: (color: string) => void;
  
  /** W69: Reset accent/font/density/icons to template defaults. */
  resetStyle: () => void;

  // Actions — BE draft (W5)
  setDraftId: (id: string | null) => void;
  setSectionEvaluation: (section: BuilderSection, result: EvaluateSectionResponse) => void;
  clearSectionEvaluation: (section: BuilderSection) => void;
  markSectionNeedsRecheck: (section: BuilderSection, feedback?: Omit<SectionFixFeedback, "status" | "updatedAt">) => void;

  // Actions — seed từ CV đã chẩn đoán
  /** Đổ 1 CanonicalCvDocument (từ Diagnosis) vào form builder + reset draft cho phiên sửa mới. */
  hydrateFromCanonical: (doc: CanonicalCvDocument, opts?: { preserveDraft?: boolean; cvId?: string | null }) => void;
  setSeededFromDiagnosis: (val: boolean) => void;
  setSeedSourceCvId: (id: string | null) => void;
  setDiagnosisSourceCvId: (id: string | null) => void;

  // Actions — Import/Restore backup (W64)
  importState: (newState: Partial<CvBuilderState>) => void;

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
  getResumeDocumentV1: () => ResumeDocumentV1;
  getCompletionPercent: () => number;

  // Reset
  reset: () => void;
}

const initialState = {
  resumeTitle: "",
  fullName: "", email: "", phone: "", location: "", linkedin: "", portfolio: "", github: "",
  photoUrl: "", profileLinks: [] as ProfileLink[], customFields: [] as CustomField[],
  targetPosition: "", careerLevel: "" as const, industry: "",
  summary: "", summaryMode: "manual" as SummaryMode,
  education: [emptyEducation()],
  experience: [emptyExperience()],
  projects: [emptyProject()],
  technicalSkills: [], softSkills: [], tools: [], languages: [], languageDetails: [] as LanguageDetail[],
  certifications: [],
  activeSection: 0,
  template: "azurill",
  cvLanguage: "en" as CvLanguage,
  resumeAccentColor: "#0f172a",
  resumeFontFamily: "inter" as ResumeFontFamily,
  resumeFontScale: "normal" as ResumeFontScale,
  resumeLineHeight: "normal" as ResumeLineHeight,
  resumePageMargin: "normal" as ResumeSpacing,
  resumeSectionSpacing: "normal" as ResumeSpacing,
  resumeSidebarPosition: "left" as const,
  resumeSidebarWidth: "normal" as const,
  resumeDividerStyle: "line" as const,
  resumeHideSectionIcons: false,
  resumePictureVisible: true,
  resumePictureShape: "circle" as const,
  resumePictureSize: 64,
  resumePictureBorderWidth: 0,
  resumePictureBorderColor: "rgba(0,0,0,0)",
  resumeHeadingScale: "match" as const,
  resumeBaseFontSize: 11,
  resumeAtsSafeMode: false,
  resumeTextColor: "#334155",
  
  sectionVisibility: {
    summary: true,
    education: true,
    experience: true,
    projects: true,
    skills: true,
    certifications: true,
  } as Record<CvBuilderSectionKey, boolean>,
  sectionOrder: ["summary", "experience", "education", "projects", "certifications", "skills"] as CvBuilderSectionKey[],
  sectionPlacement: {} as Partial<Record<CvBuilderSectionKey, "main" | "sidebar">>,
  collapsedSections: {} as Record<string, boolean>,
  layoutPages: [{ id: "page_1" }] as Array<{ id: string; name?: string; fullWidth?: boolean }>,
  sectionPage: {} as Record<string, string>,
  customSections: [] as CustomSection[],
  customSectionsCvId: null as string | null,
  renderedPageCount: null as number | null,
  draftId: null as string | null,
  sectionEvaluations: {} as Partial<Record<BuilderSection, EvaluateSectionResponse>>,
  sectionFixFeedback: {} as Partial<Record<BuilderSection, SectionFixFeedback>>,
  seededFromDiagnosis: false,
  seedSourceCvId: null as string | null,
  diagnosisSourceCvId: null as string | null,
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

  const profileLinks: ProfileLink[] = [];
  const customFields: CustomField[] = [];
  (doc.contact?.links ?? []).forEach((l) => {
    const lLower = (l.label ?? "").toLowerCase();
    const isNetwork = ["linkedin", "github", "portfolio", "facebook", "twitter", "website"].some((n) => lLower.includes(n));
    if (isNetwork) {
      profileLinks.push({ id: uid(), network: l.label || "Link", url: l.url, visible: true });
    } else {
      customFields.push({ id: uid(), name: l.label || "Field", value: l.url });
    }
  });

  const languageDetails = (doc.skills?.languages ?? []).map((lang) => ({
    id: uid(),
    name: lang,
    proficiency: "",
  }));

  // Custom sections project into canonical `activities` (org=title, bullets=items);
  // the inverse restores them one-bullet-per-item. Item headings were joined into
  // the bullet text on the way out and are not split back apart — which is why
  // hydrateFromCanonical prefers the local sections when they still project to
  // the same activities (see localCustomSectionsMatch).
  const customSections: CustomSection[] = (doc.activities ?? [])
    .filter((activity) => (activity.org ?? "").trim())
    .map((activity) => ({
      id: `custom_${uid()}`,
      title: activity.org.trim(),
      placement: "main" as const,
      items: (activity.bullets ?? [])
        .filter((bullet) => bullet.trim())
        .map((bullet) => ({ id: `custom_item_${uid()}`, body: bullet.trim() })),
      visible: true,
    }));

  return {
    fullName: doc.contact?.name ?? "",
    email: doc.contact?.email ?? "",
    phone: doc.contact?.phone ?? "",
    location: doc.contact?.location ?? "",
    linkedin,
    github,
    portfolio,
    photoUrl: "",
    profileLinks,
    customFields,
    summary: doc.summary ?? "",
    summaryMode: "manual" as SummaryMode,
    education: education.length ? education : [emptyEducation()],
    experience: experience.length ? experience : [emptyExperience()],
    projects: projects.length ? projects : [emptyProject()],
    technicalSkills: doc.skills?.technical ?? [],
    softSkills: doc.skills?.soft ?? [],
    tools: doc.skills?.tools ?? [],
    languages: doc.skills?.languages ?? [],
    languageDetails,
    certifications,
    customSections,
    cvLanguage: (doc.language === "vi" ? "vi" : "en") as CvLanguage,
    // Phiên sửa mới cho CV này: bỏ draft cũ + đánh giá cũ, bật cờ seed.
    draftId: null,
    sectionEvaluations: {},
    sectionFixFeedback: {},
    activeSection: 0,
    collapsedSections: {},
    seededFromDiagnosis: true,
    seedSourceCvId: null,
    // Provenance chẩn đoán KHÔNG lây sang phiên hydrate khác (mở từ thư viện/recover):
    // chỉ seedBuilderFromDocument set lại ngay sau hydrate.
    diagnosisSourceCvId: null,
  };
}

/**
 * P4: presentation state (template/style/layout/custom sections) persists in
 * localStorage. The BE autosave only stores CONTENT (CanonicalCvDocument), so
 * without this every refresh silently reset template, colors and placement.
 * Content stays out of here — the server draft is its source of truth.
 */
const PRESENTATION_KEYS = [
  "template",
  "resumeAccentColor",
  "resumeFontFamily",
  "resumeFontScale",
  "resumeLineHeight",
  "resumePageMargin",
  "resumeSectionSpacing",
  "resumeSidebarPosition",
  "resumeSidebarWidth",
  "resumeDividerStyle",
  "resumeHideSectionIcons",
  "resumePictureVisible",
  "resumePictureShape",
  "resumePictureSize",
  "resumePictureBorderWidth",
  "resumePictureBorderColor",
  "resumeHeadingScale",
  "resumeBaseFontSize",
  "resumeAtsSafeMode",
  "resumeTextColor",
  "sectionVisibility",
  "sectionOrder",
  "sectionPlacement",
  "layoutPages",
  "sectionPage",
  "customSections",
  "customSectionsCvId",
] as const satisfies ReadonlyArray<keyof CvBuilderState>;

export const useCvBuilderStore = create<CvBuilderState>()(persist((set, get) => ({
  ...initialState,

  // Basic Info
  setBasicInfo: (field, value) => set({ [field]: value }),
  addProfileLink: () => set((s) => ({ profileLinks: [...s.profileLinks, emptyProfileLink()] })),
  updateProfileLink: (id, field, value) => set((s) => ({
    profileLinks: s.profileLinks.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
  })),
  removeProfileLink: (id) => set((s) => ({ profileLinks: s.profileLinks.filter((p) => p.id !== id) })),

  addCustomField: () => set((s) => ({ customFields: [...s.customFields, emptyCustomField()] })),
  updateCustomField: (id, field, value) => set((s) => ({
    customFields: s.customFields.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
  })),
  removeCustomField: (id) => set((s) => ({ customFields: s.customFields.filter((c) => c.id !== id) })),

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

  addLanguageDetail: () => set((s) => ({ languageDetails: [...s.languageDetails, emptyLanguageDetail()] })),
  updateLanguageDetail: (id, field, value) => set((s) => ({
    languageDetails: s.languageDetails.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
  })),
  removeLanguageDetail: (id) => set((s) => ({ languageDetails: s.languageDetails.filter((l) => l.id !== id) })),

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

  // W67: Resume metadata
  setResumeTitle: (resumeTitle) => set({ resumeTitle }),

  // UI
  setActiveSection: (section) => set({ activeSection: section }),
  toggleSectionCollapse: (sectionId) => set((s) => ({
    collapsedSections: { ...s.collapsedSections, [sectionId]: !s.collapsedSections[sectionId] }
  })),
  setSectionCollapsed: (sectionId, collapsed) => set((s) => ({
    collapsedSections: { ...s.collapsedSections, [sectionId]: collapsed }
  })),


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
  clearSectionEvaluation: (section) => get().markSectionNeedsRecheck(section, { source: "manual_edit" }),
  markSectionNeedsRecheck: (section, feedback) =>
    set((s) => {
      const nextEvaluations = { ...s.sectionEvaluations };
      delete nextEvaluations[section];
      return {
        sectionEvaluations: nextEvaluations,
        sectionFixFeedback: {
          ...s.sectionFixFeedback,
          [section]: { status: "needs_recheck", updatedAt: Date.now(), ...feedback },
        },
      };
    }),

  // Seed từ CV đã chẩn đoán
  hydrateFromCanonical: (doc, opts) =>
    set((state) => {
      const next = canonicalToBuilderState(doc);
      const incomingCvId = opts?.cvId ?? null;
      // Local custom sections may only survive a hydrate of the SAME CV —
      // for any other (or unknown) CV the document wins outright, so content
      // persisted on this device can never bleed into another resume.
      const sameCv = incomingCvId !== null && incomingCvId === state.customSectionsCvId;

      let customSections = next.customSections;
      if (sameCv && state.customSections.length > 0) {
        const projectionMatches =
          JSON.stringify(projectCustomSectionsToActivities(state.customSections)) ===
          JSON.stringify(
            (doc.activities ?? []).map((activity) => ({
              org: (activity.org ?? "").trim(),
              role: null,
              bullets: (activity.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean),
            })),
          );
        if (projectionMatches) {
          // Same content — the local copy is richer (headings, hidden
          // sections, stable ids), keep it wholesale.
          customSections = state.customSections;
        } else {
          // Server content wins (version restore, cross-device edit), but
          // reuse local presentation by title and keep local hidden sections
          // — they are never written to the server by design.
          const localByTitle = new Map(
            state.customSections.map((section) => [section.title.trim() || UNTITLED_CUSTOM_SECTION, section]),
          );
          customSections = next.customSections.map((derived) => {
            const local = localByTitle.get(derived.title);
            return local ? { ...derived, id: local.id, placement: local.placement } : derived;
          });
          const derivedTitles = new Set(customSections.map((section) => section.title));
          customSections = [
            ...customSections,
            ...state.customSections.filter(
              (section) => !section.visible && !derivedTitles.has(section.title.trim() || UNTITLED_CUSTOM_SECTION),
            ),
          ];
        }
      }

      const customSectionsCvId = incomingCvId ?? (opts?.preserveDraft ? state.customSectionsCvId : null);

      // preserveDraft: reflect new canonical content in the form WITHOUT resetting the active
      // editing session. The default (fresh Diagnosis seed) nulls draftId — doing that inside an
      // active draft would break every draftId-gated builder action (save/evaluate/rewrite/PDF).
      return opts?.preserveDraft
        ? {
            ...next,
            customSections,
            customSectionsCvId,
            draftId: state.draftId,
            activeSection: state.activeSection,
            sectionEvaluations: state.sectionEvaluations,
            sectionFixFeedback: state.sectionFixFeedback,
            seededFromDiagnosis: state.seededFromDiagnosis,
            seedSourceCvId: state.seedSourceCvId,
            diagnosisSourceCvId: state.diagnosisSourceCvId,
          }
        : { ...next, customSections, customSectionsCvId };
    }),
  setSeededFromDiagnosis: (seededFromDiagnosis) => set({ seededFromDiagnosis }),
  setSeedSourceCvId: (seedSourceCvId) => set({ seedSourceCvId }),
  setDiagnosisSourceCvId: (diagnosisSourceCvId) => set({ diagnosisSourceCvId }),
  setTemplate: (template) => set(() => {
    const meta = TEMPLATE_PREVIEWS[template as Template];
    if (meta) {
      return {
        template,
        resumeAccentColor: meta.accent,
        resumeFontScale: meta.fontScale,
        resumePageMargin: meta.pageMargin,
        resumeSectionSpacing: meta.sectionSpacing,
      };
    }
    return { template };
  }),
  setCvLanguage: (cvLanguage) => set({ cvLanguage }),
  setResumeAccentColor: (resumeAccentColor) => set({ resumeAccentColor }),
  setResumeFontFamily: (resumeFontFamily) => set({ resumeFontFamily }),
  setResumeFontScale: (resumeFontScale) => set({ resumeFontScale }),
  setResumeLineHeight: (resumeLineHeight) => set({ resumeLineHeight }),
  setResumePageMargin: (resumePageMargin) => set({ resumePageMargin }),
  setResumeSectionSpacing: (resumeSectionSpacing) => set({ resumeSectionSpacing }),
  setResumeSidebarPosition: (resumeSidebarPosition) => set({ resumeSidebarPosition }),
  setResumeSidebarWidth: (resumeSidebarWidth) => set({ resumeSidebarWidth }),
  setResumeDividerStyle: (resumeDividerStyle) => set({ resumeDividerStyle }),
  setResumeHideSectionIcons: (resumeHideSectionIcons) => set({ resumeHideSectionIcons }),
  setResumePictureVisible: (resumePictureVisible) => set({ resumePictureVisible }),
  setResumePictureShape: (resumePictureShape) => set({ resumePictureShape }),
  setResumePictureSize: (resumePictureSize) => set({ resumePictureSize }),
  setResumePictureBorderWidth: (resumePictureBorderWidth) => set({ resumePictureBorderWidth }),
  setResumePictureBorderColor: (resumePictureBorderColor) => set({ resumePictureBorderColor }),
  setResumeHeadingScale: (resumeHeadingScale) => set({ resumeHeadingScale }),
  setResumeBaseFontSize: (resumeBaseFontSize) => set({ resumeBaseFontSize }),
  setResumeAtsSafeMode: (resumeAtsSafeMode) => set({ resumeAtsSafeMode }),
  setResumeTextColor: (resumeTextColor) => set({ resumeTextColor }),
  resetStyle: () => set((s) => {
    const meta = TEMPLATE_PREVIEWS[s.template as Template];
    return {
      resumeAccentColor: meta?.accent ?? "#0f172a",
      resumeFontFamily: "inter",
      resumeFontScale: meta?.fontScale ?? "normal",
      resumeLineHeight: "normal",
      resumePageMargin: meta?.pageMargin ?? "normal",
      resumeSectionSpacing: meta?.sectionSpacing ?? "normal",
      resumeSidebarPosition: "left",
      resumeSidebarWidth: "normal",
      resumeDividerStyle: "line",
      resumeHideSectionIcons: false,
      resumePictureVisible: true,
      resumePictureShape: "circle",
      resumePictureSize: 64,
      resumePictureBorderWidth: 0,
      resumePictureBorderColor: "rgba(0,0,0,0)",
      resumeHeadingScale: "match",
      resumeBaseFontSize: 11,
      resumeAtsSafeMode: false,
      resumeTextColor: "#334155",
    };
  }),
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
    sectionPlacement: {},
    layoutPages: [{ id: "page_1" }],
    sectionPage: {},
  }),
  reorderSection: (activeId, overId) => set((s) => {
    const oldIndex = s.sectionOrder.indexOf(activeId);
    const newIndex = s.sectionOrder.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return {};
    const newOrder = [...s.sectionOrder];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    return { sectionOrder: newOrder };
  }),
  setSectionPlacement: (section, placement) => set((s) => ({
    sectionPlacement: { ...s.sectionPlacement, [section]: placement },
  })),

  // P4 layout pages
  addLayoutPage: () => set((s) => ({ layoutPages: [...s.layoutPages, { id: uid() }] })),
  removeLayoutPage: (pageId) => set((s) => {
    if (s.layoutPages.length <= 1) return {};
    const remaining = s.layoutPages.filter((p) => p.id !== pageId);
    if (remaining.length === s.layoutPages.length) return {};
    // Sections on the removed page fall back to the first remaining page.
    const fallbackId = remaining[0].id;
    const sectionPage = Object.fromEntries(
      Object.entries(s.sectionPage).map(([sectionId, pid]) => [sectionId, pid === pageId ? fallbackId : pid]),
    );
    return { layoutPages: remaining, sectionPage };
  }),
  renameLayoutPage: (pageId, name) => set((s) => ({
    layoutPages: s.layoutPages.map((p) => (p.id === pageId ? { ...p, name: name.trim() || undefined } : p)),
  })),
  moveLayoutPage: (pageId, direction) => set((s) => {
    const idx = s.layoutPages.findIndex((p) => p.id === pageId);
    if (idx < 0) return {};
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= s.layoutPages.length) return {};
    const pages = [...s.layoutPages];
    [pages[idx], pages[targetIdx]] = [pages[targetIdx], pages[idx]];
    return { layoutPages: pages };
  }),
  setLayoutPageFullWidth: (pageId, fullWidth) => set((s) => ({
    layoutPages: s.layoutPages.map((p) => (p.id === pageId ? { ...p, fullWidth: fullWidth || undefined } : p)),
  })),
  assignSectionToPage: (sectionId, pageId) => set((s) => {
    if (!s.layoutPages.some((p) => p.id === pageId)) return {};
    return { sectionPage: { ...s.sectionPage, [sectionId]: pageId } };
  }),

  // P4 custom sections — every edit stamps which CV the sections belong to,
  // so hydrating a different CV later can refuse to inherit them.
  addCustomSection: (title) => set((s) => ({
    customSections: [
      ...s.customSections,
      { id: `custom_${uid()}`, title: title.trim() || "Untitled", placement: "main", items: [], visible: true },
    ],
    customSectionsCvId: s.draftId ?? s.customSectionsCvId,
  })),
  updateCustomSection: (id, patch) => set((s) => ({
    customSections: s.customSections.map((section) =>
      section.id === id ? { ...section, ...patch, id: section.id } : section,
    ),
    customSectionsCvId: s.draftId ?? s.customSectionsCvId,
  })),
  removeCustomSection: (id) => set((s) => {
    const sectionPage = { ...s.sectionPage };
    delete sectionPage[id];
    return {
      customSections: s.customSections.filter((section) => section.id !== id),
      sectionPage,
      customSectionsCvId: s.draftId ?? s.customSectionsCvId,
    };
  }),
  moveCustomSection: (id, direction) => set((s) => {
    const idx = s.customSections.findIndex((section) => section.id === id);
    if (idx < 0) return {};
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= s.customSections.length) return {};
    const sections = [...s.customSections];
    [sections[idx], sections[targetIdx]] = [sections[targetIdx], sections[idx]];
    return { customSections: sections };
  }),
  // Guard against render loops: the preview reports its page count on every
  // load; writing an unchanged value would re-notify store subscribers, which
  // re-derives resume data and re-renders the preview, forever.
  setRenderedPageCount: (renderedPageCount) => {
    if (get().renderedPageCount !== renderedPageCount) set({ renderedPageCount });
  },

  importState: (newState) => set((s) => {
    const cleanState = Object.fromEntries(
      Object.entries(newState).filter(([, value]) => typeof value !== "function"),
    ) as Partial<CvBuilderState>;

    // Trust boundary: backups are arbitrary JSON. The structural P4 fields
    // feed .map()/[0].id accesses all over the studio UI, so junk shapes
    // here would crash the inspector. ALWAYS assigned (not only when the key
    // exists): an import is a whole-document overwrite, so a pre-P4 backup
    // without these keys must clear them, not inherit the current CV's.
    cleanState.customSections = sanitizeCustomSections(cleanState.customSections);
    cleanState.layoutPages = sanitizeLayoutPages(cleanState.layoutPages);
    cleanState.sectionPage = sanitizeSectionPage(
      cleanState.sectionPage,
      cleanState.layoutPages.map((page) => page.id),
    );

    return {
      ...cleanState,
      draftId: s.draftId,
      sectionEvaluations: {},
      sectionFixFeedback: {},
      mascotState: "idle",
      companionField: null,
      companionSection: null,
      companionTurn: null,
      companionAnswers: [],
      companionPatch: null,
      companionMessage: null,
      companionReaskCount: 0,
      pendingProveIt: null,
    };
  }),

  // Computed
  getResumeData: () => adaptCvBuilderStoreToResumeData(get()),
  getResumeDocumentV1: () => builderStateToResumeDocumentV1(get()),

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
}), {
  name: "skillbridge-cv-studio",
  version: 1,
  partialize: (state) =>
    Object.fromEntries(PRESENTATION_KEYS.map((key) => [key, state[key]])) as Partial<CvBuilderState>,
  // Rehydrate runs through the same trust boundary as import: localStorage
  // can hold stale schemas (older deploys) or hand-edited junk, and the
  // studio UI dereferences these shapes without guards.
  merge: (persisted, current) => {
    const incoming = { ...((persisted ?? {}) as Partial<CvBuilderState>) };
    incoming.customSections = sanitizeCustomSections(incoming.customSections);
    incoming.layoutPages = sanitizeLayoutPages(incoming.layoutPages);
    incoming.sectionPage = sanitizeSectionPage(
      incoming.sectionPage,
      incoming.layoutPages.map((page) => page.id),
    );
    return { ...current, ...incoming };
  },
}));
