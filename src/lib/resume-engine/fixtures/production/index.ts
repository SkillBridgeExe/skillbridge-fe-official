import type { CvBuilderState } from "@/store/useCvBuilderStore";
import type { CanonicalCvDocument, CvDto, CvVersionSummary } from "@shared/api";
import type { ResumeDocumentV1 } from "../../document-v1";
import { createDefaultResumeDocumentV1 } from "../../document-v1";
import {
  resumeDocumentV1ToBuilderState,
  resumeDocumentV1ToDiagnosisCanonical,
} from "../../document-v1-adapter";

/**
 * Canonical PII-free fixtures for the P5 evidence pyramid. Every tier (pure
 * adapter tests, parity byte-render, lifecycle integration, browser smoke)
 * reads from this catalog so failures are comparable across suites.
 *
 * Rules:
 * - All names/emails/orgs are synthetic (@example.com only).
 * - `byteRenderSafe` fixtures contain ASCII-only content so they can render
 *   through the standard Helvetica PDF font offline (no webfont fetch) in CI.
 *   Vietnamese-diacritic fixtures are exercised by logical parity + browser
 *   smoke instead.
 */
export type ProductionFixture = {
  /** Stable id surfaced in test failure messages. */
  name: string;
  description: string;
  doc: ResumeDocumentV1;
  /** Store-only fields the document contract does not carry (e.g. photoUrl). */
  storeOverrides?: Partial<CvBuilderState>;
  /** ASCII-only content — safe for offline byte-render with standard PDF fonts. */
  byteRenderSafe: boolean;
  /** Page count the layout plan promises (physical render may exceed it — see long-cv-warn). */
  plannedPages: number;
};

/** 1x1 transparent PNG — stands in for a real avatar without shipping one. */
export const FIXTURE_AVATAR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const BUILTIN_ORDER = ["summary", "experience", "education", "projects", "skills", "certifications"];

const allVisible = () =>
  Object.fromEntries(BUILTIN_ORDER.map((section) => [section, true])) as Record<string, boolean>;

function baseDoc(overrides: {
  title: string;
  language?: "vi" | "en";
  templateId?: string;
}): ResumeDocumentV1 {
  const doc = createDefaultResumeDocumentV1();
  doc.title = overrides.title;
  doc.language = overrides.language ?? "en";
  doc.metadata.templateId = overrides.templateId ?? "onyx";
  doc.metadata.sectionVisibility = allVisible();
  doc.metadata.sectionOrder = [...BUILTIN_ORDER];
  return doc;
}

const experienceItem = (
  id: string,
  company: string,
  position: string,
  period: [string, string],
  bullets: string[],
) => ({
  id,
  company,
  position,
  startDate: period[0],
  endDate: period[1],
  description: bullets.map((line) => `- ${line}`).join("\n"),
  responsibilities: "",
  achievements: "",
  aiRewrite: "",
});

const projectItem = (id: string, name: string, tools: string, bullets: string[]) => ({
  id,
  name,
  role: "Developer",
  link: "",
  description: bullets.map((line) => `- ${line}`).join("\n"),
  tools,
  contribution: "",
  result: "",
});

const educationItem = (id: string, school: string, major: string, years: [string, string]) => ({
  id,
  school,
  major,
  degree: "Bachelor",
  startYear: years[0],
  endYear: years[1],
  gpa: "3.4/4.0",
  coursework: "",
  achievements: "",
});

// ── 1. Blank first resume ───────────────────────────────────────────────────

const blankDoc = baseDoc({ title: "Untitled Resume" });

// ── 2. Fresher one-page CV (also the EN localized document) ────────────────

const fresherDoc = baseDoc({ title: "Fixture A - Fresher QA Engineer", templateId: "onyx" });
fresherDoc.basics = {
  fullName: "Alex Fixture",
  email: "alex.fixture@example.com",
  phone: "+84 900 000 001",
  location: "Ho Chi Minh City",
  linkedin: "https://linkedin.com/in/alex-fixture",
  portfolio: "",
  github: "https://github.com/alex-fixture",
  targetPosition: "QA Engineer",
};
fresherDoc.sections.summary = {
  content: "Final-year software engineering student focused on test automation and web quality.",
  mode: "manual",
};
fresherDoc.sections.experience.items = [
  experienceItem("exp-fresher-1", "Example Labs", "QA Intern", ["Jun 2025", "Dec 2025"], [
    "Wrote 120 regression cases for a checkout flow",
    "Automated smoke suite with Playwright, cutting manual passes by 60%",
  ]),
];
fresherDoc.sections.projects.items = [
  projectItem("proj-fresher-1", "Bughunt Dashboard", "React, TypeScript", [
    "Built a triage board for 3 student teams",
    "Shipped weekly to 40 active users",
  ]),
];
fresherDoc.sections.education.items = [
  educationItem("edu-fresher-1", "Example University", "Software Engineering", ["2022", "2026"]),
];
fresherDoc.sections.skills = {
  technicalSkills: ["TypeScript", "Playwright", "SQL"],
  softSkills: ["Communication"],
  tools: ["Git", "Jira"],
  languages: ["English"],
};
fresherDoc.sections.certifications.items = [
  { id: "cert-fresher-1", name: "ISTQB Foundation", organization: "ISTQB", issueDate: "2025", credentialUrl: "" },
];
fresherDoc.metadata.careerLevel = "fresher";

// ── 3. Experienced two-page CV ──────────────────────────────────────────────

const experiencedDoc = baseDoc({ title: "Fixture B - Senior Backend", templateId: "gengar" });
experiencedDoc.basics = {
  fullName: "Morgan Sample",
  email: "morgan.sample@example.com",
  phone: "+84 900 000 002",
  location: "Da Nang",
  linkedin: "https://linkedin.com/in/morgan-sample",
  portfolio: "https://morgan-sample.example.com",
  github: "https://github.com/morgan-sample",
  targetPosition: "Backend Engineer",
};
experiencedDoc.sections.summary = {
  content: "Backend engineer with six years across payments and logistics platforms.",
  mode: "manual",
};
experiencedDoc.sections.experience.items = [
  experienceItem("exp-exp-1", "Example Pay", "Senior Backend Engineer", ["2023", "Present"], [
    "Own settlement pipeline processing 2M transactions/day",
    "Led migration from cron batches to event streaming",
    "Cut reconciliation lag from hours to minutes",
  ]),
  experienceItem("exp-exp-2", "Example Logistics", "Backend Engineer", ["2020", "2023"], [
    "Designed routing API used by 300 drivers",
    "Introduced contract tests across 5 services",
  ]),
  experienceItem("exp-exp-3", "Example Studio", "Junior Developer", ["2018", "2020"], [
    "Maintained order management monolith",
  ]),
];
experiencedDoc.sections.projects.items = [
  projectItem("proj-exp-1", "Ledger Kit", "Go, Postgres", ["Open-source double-entry ledger library"]),
  projectItem("proj-exp-2", "Load Atlas", "Kubernetes, Grafana", ["Capacity planning toolkit for staging clusters"]),
];
experiencedDoc.sections.education.items = [
  educationItem("edu-exp-1", "Example Institute", "Computer Science", ["2014", "2018"]),
];
experiencedDoc.sections.skills = {
  technicalSkills: ["Go", "PostgreSQL", "Kafka", "Redis"],
  softSkills: ["Mentoring"],
  tools: ["Docker", "Terraform"],
  languages: ["English", "Japanese"],
};
experiencedDoc.sections.certifications.items = [
  { id: "cert-exp-1", name: "CKA", organization: "CNCF", issueDate: "2024", credentialUrl: "" },
];
experiencedDoc.metadata.careerLevel = "mid-level";
experiencedDoc.metadata.layout = {
  pages: [
    { id: "pg_1", name: "Main", main: ["summary", "experience", "education"], sidebar: ["skills"] },
    { id: "pg_2", main: ["projects", "certifications"], sidebar: [] },
  ],
};

// ── 4. Long CV that plans one page but physically overflows ────────────────

const longDoc = baseDoc({ title: "Fixture - Long CV Warns", templateId: "onyx" });
longDoc.basics = {
  ...fresherDoc.basics,
  fullName: "Jordan Longform",
  email: "jordan.longform@example.com",
  targetPosition: "Full-stack Developer",
};
longDoc.sections.summary = {
  content:
    "Full-stack developer who lists every internship, hackathon, club role and side project in exhaustive detail, which is exactly what makes this resume run far past a single page.",
  mode: "manual",
};
longDoc.sections.experience.items = Array.from({ length: 6 }, (_, i) =>
  experienceItem(`exp-long-${i + 1}`, `Example Company ${i + 1}`, "Software Developer", ["2020", "2026"], [
    "Delivered feature work across web and mobile clients for quarterly releases",
    "Partnered with design and product on discovery, estimation and rollout",
    "Instrumented dashboards and alerts to track adoption and regressions",
    "Mentored two interns through onboarding and first production changes",
  ]),
);
longDoc.sections.projects.items = Array.from({ length: 4 }, (_, i) =>
  projectItem(`proj-long-${i + 1}`, `Side Project ${i + 1}`, "React, Node.js", [
    "Built end-to-end prototype and iterated with weekly user feedback",
    "Wrote integration tests and deployment scripts for reproducible releases",
  ]),
);
longDoc.sections.education.items = [
  educationItem("edu-long-1", "Example University", "Information Systems", ["2016", "2020"]),
];
longDoc.sections.skills = {
  technicalSkills: ["JavaScript", "TypeScript", "React", "Node.js", "GraphQL", "MongoDB"],
  softSkills: ["Presentation", "Facilitation"],
  tools: ["Git", "Figma", "Docker"],
  languages: ["English"],
};
longDoc.metadata.careerLevel = "fresher";

// ── 5. Avatar-supported template, ATS off / on ──────────────────────────────

const avatarDoc = baseDoc({ title: "Fixture - Avatar Gengar", templateId: "gengar" });
avatarDoc.basics = { ...fresherDoc.basics, fullName: "Casey Avatar", email: "casey.avatar@example.com" };
avatarDoc.sections.summary = { content: "Product designer exploring avatar-friendly layouts.", mode: "manual" };
avatarDoc.sections.skills = {
  technicalSkills: ["Figma", "Prototyping"],
  softSkills: [],
  tools: [],
  languages: ["English"],
};

const avatarAtsOnDoc: ResumeDocumentV1 = JSON.parse(JSON.stringify(avatarDoc));
avatarAtsOnDoc.title = "Fixture - Avatar Gengar ATS";
avatarAtsOnDoc.metadata.resumeAtsSafeMode = true;

// ── 6. No-avatar template with a photo set (must stay hidden) ───────────────

const noAvatarDoc = baseDoc({ title: "Fixture - No Avatar Onyx", templateId: "onyx" });
noAvatarDoc.basics = { ...fresherDoc.basics, fullName: "Riley Plain", email: "riley.plain@example.com" };
noAvatarDoc.sections.summary = { content: "Analyst using a strictly single-column template.", mode: "manual" };

// ── 7. Custom section + sidebar placement ───────────────────────────────────

const customDoc = baseDoc({ title: "Fixture - Custom Sidebar", templateId: "azurill" });
customDoc.basics = { ...fresherDoc.basics, fullName: "Sam Custom", email: "sam.custom@example.com" };
customDoc.sections.summary = { content: "Community organizer with custom resume sections.", mode: "manual" };
customDoc.sections.custom = [
  {
    id: "custom_volunteering",
    title: "Volunteering",
    placement: "sidebar",
    visible: true,
    items: [{ id: "vol-1", heading: "Code Club", body: "Weekly mentoring for high-school students" }],
  },
  {
    id: "custom_awards",
    title: "Awards",
    placement: "main",
    visible: true,
    items: [{ id: "award-1", body: "Campus hackathon winner 2025" }],
  },
];
customDoc.metadata.layout = {
  pages: [
    {
      id: "pg_1",
      main: ["summary", "experience", "education", "projects", "custom_awards"],
      sidebar: ["skills", "certifications", "custom_volunteering"],
    },
  ],
};

// ── 8. Vietnamese localized document ────────────────────────────────────────

const vietnameseDoc = baseDoc({ title: "Hồ sơ - Kỹ sư phần mềm", language: "vi", templateId: "azurill" });
vietnameseDoc.basics = {
  fullName: "Nguyễn Mẫu Thử",
  email: "mau.thu@example.com",
  phone: "+84 900 000 003",
  location: "Hà Nội",
  linkedin: "",
  portfolio: "",
  github: "https://github.com/mau-thu",
  targetPosition: "Kỹ sư phần mềm",
};
vietnameseDoc.sections.summary = {
  content: "Sinh viên năm cuối ngành kỹ thuật phần mềm, định hướng phát triển web và kiểm thử tự động.",
  mode: "manual",
};
vietnameseDoc.sections.experience.items = [
  experienceItem("exp-vi-1", "Công ty Ví Dụ", "Thực tập sinh phát triển web", ["06/2025", "12/2025"], [
    "Xây dựng trang quản trị nội bộ bằng React và TypeScript",
    "Viết bộ kiểm thử hồi quy cho luồng thanh toán",
  ]),
];
vietnameseDoc.sections.education.items = [
  {
    id: "edu-vi-1",
    school: "Đại học Ví Dụ",
    major: "Kỹ thuật phần mềm",
    degree: "Cử nhân",
    startYear: "2022",
    endYear: "2026",
    gpa: "3.2/4.0",
    coursework: "",
    achievements: "",
  },
];
vietnameseDoc.sections.skills = {
  technicalSkills: ["React", "TypeScript"],
  softSkills: ["Làm việc nhóm"],
  tools: ["Git"],
  languages: ["Tiếng Anh", "Tiếng Việt"],
};
vietnameseDoc.metadata.careerLevel = "student";

// ── Catalog ─────────────────────────────────────────────────────────────────

export const productionFixtures: ProductionFixture[] = [
  {
    name: "blank-first-resume",
    description: "Brand-new empty resume straight from the default document",
    doc: blankDoc,
    byteRenderSafe: true,
    plannedPages: 1,
  },
  {
    name: "fresher-one-page",
    description: "Fresher CV that fits one page (also the EN localized document)",
    doc: fresherDoc,
    byteRenderSafe: true,
    plannedPages: 1,
  },
  {
    name: "experienced-two-page",
    description: "Mid-level CV with an explicit two-page layout plan",
    doc: experiencedDoc,
    byteRenderSafe: true,
    plannedPages: 2,
  },
  {
    name: "long-cv-warn",
    description: "Plans one page but carries enough content to physically overflow",
    doc: longDoc,
    byteRenderSafe: true,
    plannedPages: 1,
  },
  {
    name: "avatar-ats-off",
    description: "Avatar-capable template with photo visible (ATS safe mode off)",
    doc: avatarDoc,
    storeOverrides: { photoUrl: FIXTURE_AVATAR_DATA_URL } as Partial<CvBuilderState>,
    byteRenderSafe: true,
    plannedPages: 1,
  },
  {
    name: "avatar-ats-on",
    description: "Same avatar template with ATS safe mode on (photo must hide)",
    doc: avatarAtsOnDoc,
    storeOverrides: { photoUrl: FIXTURE_AVATAR_DATA_URL } as Partial<CvBuilderState>,
    byteRenderSafe: true,
    plannedPages: 1,
  },
  {
    name: "no-avatar-template",
    description: "Photo set but the template renders no avatar slot",
    doc: noAvatarDoc,
    storeOverrides: { photoUrl: FIXTURE_AVATAR_DATA_URL } as Partial<CvBuilderState>,
    byteRenderSafe: true,
    plannedPages: 1,
  },
  {
    name: "custom-sidebar-placement",
    description: "Custom sections placed in sidebar and main columns",
    doc: customDoc,
    byteRenderSafe: true,
    plannedPages: 1,
  },
  {
    name: "localized-vi",
    description: "Vietnamese document with full diacritics (webfont territory)",
    doc: vietnameseDoc,
    byteRenderSafe: false,
    plannedPages: 1,
  },
];

export const productionFixtureByName = new Map(productionFixtures.map((f) => [f.name, f]));

/**
 * Hydrates a fixture into the builder-store shape the adapters consume —
 * the same path load/import/restore use in the app.
 */
export function fixtureBuilderState(fixture: ProductionFixture): CvBuilderState {
  return {
    ...resumeDocumentV1ToBuilderState(fixture.doc),
    resumeTitle: fixture.doc.title,
    ...fixture.storeOverrides,
  } as CvBuilderState;
}

// ── Lifecycle-suite fixtures (CvDto / versions / import files) ──────────────

function toCvDto(id: string, doc: ResumeDocumentV1, updatedAt: string): CvDto {
  return {
    id,
    title: doc.title,
    originalFileName: null,
    fileType: null,
    fileSize: null,
    downloadUrl: "",
    parsedText: null,
    parsedJson: resumeDocumentV1ToDiagnosisCanonical(doc),
    cvKind: "BUILT",
    language: doc.language,
    targetRole: doc.basics.targetPosition || null,
    isOcrOnly: false,
    atsReadabilityScore: null,
    skills: [],
    review: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt,
  };
}

/** Two clearly distinguishable server CVs: recover must show A, restore must flip to B. */
export const cvDtoA: CvDto = toCvDto("cv-fixture-a", fresherDoc, "2026-07-10T08:00:00.000Z");
export const cvDtoB: CvDto = toCvDto("cv-fixture-b", experiencedDoc, "2026-07-10T09:00:00.000Z");

export const canonicalDocA: CanonicalCvDocument = cvDtoA.parsedJson as CanonicalCvDocument;
export const canonicalDocB: CanonicalCvDocument = cvDtoB.parsedJson as CanonicalCvDocument;

export const versionSummaries: CvVersionSummary[] = [
  { id: "ver-manual-1", label: "Manual save", origin: "MANUAL", title: cvDtoA.title, createdAt: "2026-07-10T08:05:00.000Z" },
  { id: "ver-auto-restore-1", label: null, origin: "AUTO_PRE_RESTORE", title: cvDtoA.title, createdAt: "2026-07-10T08:10:00.000Z" },
  { id: "ver-auto-import-1", label: null, origin: "AUTO_PRE_IMPORT", title: cvDtoA.title, createdAt: "2026-07-10T08:15:00.000Z" },
];

/** Valid builder backup file matching the `$schema: skillbridge-cv-v1` export shape. */
export function buildImportBackupValid(): Record<string, unknown> {
  return {
    $schema: "skillbridge-cv-v1",
    exportedAt: "2026-07-11T00:00:00.000Z",
    ...resumeDocumentV1ToBuilderState(fresherDoc),
  };
}

/** Missing `$schema` and `projects` — must be rejected by the import validator. */
export function buildImportBackupInvalid(): Record<string, unknown> {
  return {
    exportedAt: "2026-07-11T00:00:00.000Z",
    education: [],
    experience: [],
  };
}
