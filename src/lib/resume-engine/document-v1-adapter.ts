import type { CanonicalCvDocument } from "@shared/api";
import type {
  CareerLevel,
  CvBuilderSectionKey,
  CvBuilderState,
  ResumeFontScale,
  ResumeFontFamily,
  ResumeLineHeight,
  ResumeSpacing,
} from "@/store/useCvBuilderStore";
import type { ResumeDocumentV1 } from "./document-v1";
import { createDefaultResumeDocumentV1 } from "./document-v1";

const SECTION_KEYS: CvBuilderSectionKey[] = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
];

const CAREER_LEVELS = new Set<CareerLevel>([
  "student",
  "intern",
  "fresher",
  "junior",
  "mid-level",
  "career-switcher",
]);

const FONT_SCALES = new Set<ResumeFontScale>(["small", "normal", "large"]);
const FONT_FAMILIES = new Set<ResumeFontFamily>(["inter", "serif", "roboto", "merriweather", "mono"]);
const LINE_HEIGHTS = new Set<ResumeLineHeight>(["tight", "normal", "relaxed"]);
const SPACINGS = new Set<ResumeSpacing>(["compact", "normal", "spacious"]);

function hashString(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function stableItemId(section: string, index: number, fields: Array<string | null | undefined>): string {
  const signature = fields
    .map((field) => (field ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join("|");
  return `cv_${section}_${hashString(signature || `${section}-${index}`)}`;
}

function asResumeFontScale(value: string | undefined): ResumeFontScale {
  return FONT_SCALES.has(value as ResumeFontScale) ? (value as ResumeFontScale) : "normal";
}

function asResumeFontFamily(value: string | undefined): ResumeFontFamily {
  return FONT_FAMILIES.has(value as ResumeFontFamily) ? (value as ResumeFontFamily) : "inter";
}

function asResumeLineHeight(value: string | undefined): ResumeLineHeight {
  return LINE_HEIGHTS.has(value as ResumeLineHeight) ? (value as ResumeLineHeight) : "normal";
}

function asResumeSpacing(value: string | undefined, fallbackDensity?: "compact" | "comfortable"): ResumeSpacing {
  if (SPACINGS.has(value as ResumeSpacing)) return value as ResumeSpacing;
  if (fallbackDensity === "compact") return "compact";
  return "normal";
}

function asCareerLevel(value: string): CareerLevel | "" {
  return CAREER_LEVELS.has(value as CareerLevel) ? (value as CareerLevel) : "";
}

function asSectionVisibility(value: Record<string, boolean>): Record<CvBuilderSectionKey, boolean> {
  return SECTION_KEYS.reduce(
    (visibility, section) => ({
      ...visibility,
      [section]: value[section] ?? true,
    }),
    {} as Record<CvBuilderSectionKey, boolean>,
  );
}

function asSectionOrder(value: string[]): CvBuilderSectionKey[] {
  const ordered = value.filter((section): section is CvBuilderSectionKey =>
    SECTION_KEYS.includes(section as CvBuilderSectionKey),
  );
  const missing = SECTION_KEYS.filter((section) => !ordered.includes(section));
  return [...ordered, ...missing];
}

/**
 * Transforms CvBuilderState into the stable ResumeDocumentV1 contract.
 * Preserves existing stable IDs from items; if missing, generates them.
 */
export function builderStateToResumeDocumentV1(state: CvBuilderState): ResumeDocumentV1 {
  const doc = createDefaultResumeDocumentV1();

  doc.title = state.fullName.trim() || state.targetPosition.trim() || "Untitled Resume";
  doc.language = state.cvLanguage || "vi";

  doc.basics = {
    fullName: state.fullName,
    email: state.email,
    phone: state.phone,
    location: state.location,
    linkedin: state.linkedin,
    portfolio: state.portfolio,
    github: state.github,
    targetPosition: state.targetPosition,
  };

  doc.sections.summary = {
    content: state.summary,
    mode: state.summaryMode || "manual",
  };

  doc.sections.experience.items = (state.experience || []).map((exp, index) => ({
    id: exp.id || stableItemId("experience", index, [
      exp.company,
      exp.position,
      exp.startDate,
      exp.endDate,
      exp.description,
    ]),
    company: exp.company,
    position: exp.position,
    startDate: exp.startDate,
    endDate: exp.endDate,
    description: exp.description,
    responsibilities: exp.responsibilities,
    achievements: exp.achievements,
    aiRewrite: exp.aiRewrite || "",
  }));

  doc.sections.projects.items = (state.projects || []).map((proj, index) => ({
    id: proj.id || stableItemId("project", index, [
      proj.name,
      proj.role,
      proj.link,
      proj.tools,
      proj.description,
    ]),
    name: proj.name,
    role: proj.role,
    link: proj.link,
    description: proj.description,
    tools: proj.tools,
    contribution: proj.contribution,
    result: proj.result,
  }));

  doc.sections.education.items = (state.education || []).map((edu, index) => ({
    id: edu.id || stableItemId("education", index, [
      edu.school,
      edu.major,
      edu.degree,
      edu.startYear,
      edu.endYear,
    ]),
    school: edu.school,
    major: edu.major,
    degree: edu.degree,
    startYear: edu.startYear,
    endYear: edu.endYear,
    gpa: edu.gpa,
    coursework: edu.coursework,
    achievements: edu.achievements,
  }));

  doc.sections.skills = {
    technicalSkills: [...(state.technicalSkills || [])],
    softSkills: [...(state.softSkills || [])],
    tools: [...(state.tools || [])],
    languages: [...(state.languages || [])],
  };

  doc.sections.certifications.items = (state.certifications || []).map((cert, index) => ({
    id: cert.id || stableItemId("certification", index, [
      cert.name,
      cert.organization,
      cert.issueDate,
      cert.credentialUrl,
    ]),
    name: cert.name,
    organization: cert.organization,
    issueDate: cert.issueDate,
    credentialUrl: cert.credentialUrl,
  }));

  doc.metadata = {
    templateId: state.template || "onyx",
    resumeFontFamily: state.resumeFontFamily || "inter",
    resumeFontScale: state.resumeFontScale || "normal",
    resumeLineHeight: state.resumeLineHeight || "normal",
    resumePageMargin: state.resumePageMargin || "normal",
    resumeSectionSpacing: state.resumeSectionSpacing || "normal",
    resumeAccentColor: state.resumeAccentColor || "#0f172a",
    resumeHideSectionIcons: state.resumeHideSectionIcons || false,
    sectionVisibility: { ...(state.sectionVisibility || {}) },
    sectionOrder: [...(state.sectionOrder || [])],
    careerLevel: state.careerLevel || "",
    industry: state.industry || "",
  };

  return doc;
}

/**
 * Transforms ResumeDocumentV1 back into CvBuilderState properties.
 * Can be merged into Zustand.
 */
export function resumeDocumentV1ToBuilderState(doc: ResumeDocumentV1): Partial<CvBuilderState> {
  return {
    cvLanguage: doc.language,
    fullName: doc.basics.fullName,
    email: doc.basics.email,
    phone: doc.basics.phone,
    location: doc.basics.location,
    linkedin: doc.basics.linkedin,
    portfolio: doc.basics.portfolio,
    github: doc.basics.github,
    targetPosition: doc.basics.targetPosition,
    
    summary: doc.sections.summary.content,
    summaryMode: doc.sections.summary.mode,

    experience: doc.sections.experience.items.map(item => ({ ...item })),
    projects: doc.sections.projects.items.map(item => ({ ...item })),
    education: doc.sections.education.items.map(item => ({ ...item })),
    
    technicalSkills: [...doc.sections.skills.technicalSkills],
    softSkills: [...doc.sections.skills.softSkills],
    tools: [...doc.sections.skills.tools],
    languages: [...doc.sections.skills.languages],
    
    certifications: doc.sections.certifications.items.map(item => ({ ...item })),

    template: doc.metadata.templateId,
    resumeFontFamily: asResumeFontFamily(doc.metadata.resumeFontFamily),
    resumeFontScale: asResumeFontScale(doc.metadata.resumeFontScale),
    resumeLineHeight: asResumeLineHeight(doc.metadata.resumeLineHeight),
    resumePageMargin: asResumeSpacing(doc.metadata.resumePageMargin, doc.metadata.resumeDensity),
    resumeSectionSpacing: asResumeSpacing(doc.metadata.resumeSectionSpacing, doc.metadata.resumeDensity),
    resumeAccentColor: doc.metadata.resumeAccentColor,
    resumeHideSectionIcons: doc.metadata.resumeHideSectionIcons,
    sectionVisibility: asSectionVisibility(doc.metadata.sectionVisibility),
    sectionOrder: asSectionOrder(doc.metadata.sectionOrder),
    careerLevel: asCareerLevel(doc.metadata.careerLevel),
    industry: doc.metadata.industry,
  };
}

/**
 * Helper to split text chunks into array of non-empty bullets.
 */
function toBullets(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.length > 0)
    .map((line) => line.replace(/^-+\s*/, ""));
}

function toList(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Transforms ResumeDocumentV1 into CanonicalCvDocument.
 * This ensures the backend receives structured, standard text inputs for ATS Evaluation.
 */
export function resumeDocumentV1ToDiagnosisCanonical(doc: ResumeDocumentV1): CanonicalCvDocument {
  const contactLinks = [
    { label: "LinkedIn", url: doc.basics.linkedin },
    { label: "Portfolio", url: doc.basics.portfolio },
    { label: "GitHub", url: doc.basics.github },
  ].filter(l => Boolean(l.url));

  return {
    language: doc.language,
    contact: {
      name: doc.basics.fullName || null,
      email: doc.basics.email || null,
      phone: doc.basics.phone || null,
      location: doc.basics.location || null,
      links: contactLinks,
    },
    summary: doc.sections.summary.content,
    education: doc.sections.education.items.map(edu => ({
      school: edu.school,
      degree: edu.degree || null,
      field: edu.major || null,
      start: edu.startYear || null,
      end: edu.endYear || null,
      gpa: edu.gpa || null,
      highlights: [
        ...toBullets(edu.coursework),
        ...toBullets(edu.achievements)
      ]
    })),
    experience: doc.sections.experience.items.map(exp => ({
      org: exp.company,
      role: exp.position || null,
      start: exp.startDate || null,
      end: exp.endDate || null,
      location: null,
      bullets: [
        ...toBullets(exp.description),
        ...toBullets(exp.responsibilities),
        ...toBullets(exp.achievements)
      ]
    })),
    projects: doc.sections.projects.items.map(proj => ({
      name: proj.name,
      role: proj.role || null,
      tech: toList(proj.tools),
      bullets: [
        ...toBullets(proj.description),
        ...toBullets(proj.contribution),
        ...toBullets(proj.result)
      ],
      link: proj.link || null,
    })),
    skills: {
      technical: doc.sections.skills.technicalSkills,
      soft: doc.sections.skills.softSkills,
      languages: doc.sections.skills.languages,
      tools: doc.sections.skills.tools,
    },
    certifications: doc.sections.certifications.items.map(cert => ({
      name: cert.name,
      issuer: cert.organization || null,
      date: cert.issueDate || null,
    })),
    activities: [], // Currently not explicitly modeled in builder, map to empty
  };
}
