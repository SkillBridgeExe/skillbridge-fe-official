// ─── CV Builder Service ─────────────────────────────────────────────
// Tầng nghiệp vụ builder — nối BE R1b thật (draft/evaluate/rewrite/render-pdf).
// Convention: Page → services → api/cv/* → httpClient.
//
// Nguyên tắc:
// - BE DTO evaluate khớp store FE field-for-field → pickSectionContent chỉ PICK,
//   không remap (evaluate-section.dto.ts: "FE posts its section state verbatim").
// - mapStoreToCanonical chỉ đổi FORMAT (store → CanonicalCvDocument cho autosave/
//   render) — tách dòng thành bullets, không thêm bớt nội dung.
// - "AI đề xuất" (rewrite) là transient: UI chỉ áp khi user bấm [Sử dụng].

import {
  createBuilderDraftApi,
  evaluateSectionApi,
  inferCareerTargetFromStoryApi,
  renderBuilderPdfApi,
  rewriteFieldApi,
  storyExtractApi,
  storyApplyPreviewApi,
  computeStoryReadinessApi,
  intakeProjectFromStoryApi,
  updateBuilderDraftApi,
  assistantAnalyzeApi,
  assistantRewriteApi,
  assistantSkillsNudgeApi,
  assistantExtractApi,
} from "@/api/cv/builder";
import { requireSession } from "@/services/diagnosis.service";
import type {
  AssistantAnalyzeRequest,
  AssistantRewriteRequest,
  AssistantRewriteResponse,
  CvAssistantTurn,
  SkillsNudgeItem,
  ExtractRequest,
  ExtractResponse,
} from "@/types/companion";
import type {
  Certification,
  CvLanguage,
  Education,
  Project,
  WorkExperience,
} from "@/store/useCvBuilderStore";
import type {
  BuilderSection,
  BuilderSectionContent,
  CanonicalCvDocument,
  CareerTargetFromStoryRequest,
  CareerTargetFromStoryResponse,
  CvDto,
  EvaluateSectionResponse,
  RewriteRequest,
  RewriteResponse,
  StoryApplyPreviewRequest,
  StoryApplyPreviewResponse,
  StoryExtractRequest,
  StoryExtractResponse,
  StoryReadinessRequest,
  StoryReadinessResponse,
  ProjectIntakeRequest,
  ProjectIntakeResponse,
} from "@shared/api";

// ── Snapshot của builder store (subset service cần) ────────────────

export interface BuilderSnapshot {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github: string;
  targetPosition: string;
  summary: string;
  education: Education[];
  experience: WorkExperience[];
  projects: Project[];
  technicalSkills: string[];
  softSkills: string[];
  tools: string[];
  languages: string[];
  certifications: Certification[];
  cvLanguage: CvLanguage;
}

export function shouldHydrateServerDraft(
  snapshotAtDraftRequest: BuilderSnapshot,
  currentSnapshot: BuilderSnapshot,
): boolean {
  return JSON.stringify(snapshotAtDraftRequest) === JSON.stringify(currentSnapshot);
}

export function shouldSaveClientSnapshotAfterDraftCreate({
  hasServerDocument,
  seededFromDiagnosis,
  snapshotChangedWhileCreating,
}: {
  hasServerDocument: boolean;
  seededFromDiagnosis: boolean;
  snapshotChangedWhileCreating: boolean;
}): boolean {
  return snapshotChangedWhileCreating || (!hasServerDocument && seededFromDiagnosis);
}

export type CvBuilderSavedSource = "diagnosis" | "uploaded_cv" | "builder";

export function resolveCvBuilderSavedSource({
  seededFromDiagnosis,
  seedSourceCvId,
}: {
  seededFromDiagnosis: boolean;
  seedSourceCvId?: string | null;
}): CvBuilderSavedSource {
  if (seededFromDiagnosis) return "diagnosis";
  if (seedSourceCvId) return "uploaded_cv";
  return "builder";
}

// ── Helpers (đổi format thuần, không thêm nội dung) ─────────────────

/** Tách textarea nhiều dòng thành bullets sạch. */
const splitLines = (value?: string): string[] =>
  value
    ? value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

/** Tách danh sách "React, Node; Docker" thành mảng tech. */
const splitList = (value?: string): string[] =>
  value
    ? value
        .split(/[,;]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const orNull = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Store builder → CanonicalCvDocument (hub BE) cho autosave + render PDF. */
export function mapStoreToCanonical(snapshot: BuilderSnapshot): CanonicalCvDocument {
  const links: CanonicalCvDocument["contact"]["links"] = [];
  if (snapshot.linkedin.trim()) links.push({ label: "LinkedIn", url: snapshot.linkedin.trim() });
  if (snapshot.github.trim()) links.push({ label: "GitHub", url: snapshot.github.trim() });
  if (snapshot.portfolio.trim()) links.push({ label: "Portfolio", url: snapshot.portfolio.trim() });

  return {
    language: snapshot.cvLanguage,
    contact: {
      name: orNull(snapshot.fullName),
      email: orNull(snapshot.email),
      phone: orNull(snapshot.phone),
      location: orNull(snapshot.location),
      links,
    },
    summary: snapshot.summary.trim(),
    education: snapshot.education
      .filter((entry) => entry.school.trim() || entry.major.trim())
      .map((entry) => ({
        school: entry.school.trim(),
        degree: orNull(entry.degree),
        field: orNull(entry.major),
        start: orNull(entry.startYear),
        end: orNull(entry.endYear),
        gpa: orNull(entry.gpa),
        highlights: [...splitLines(entry.coursework), ...splitLines(entry.achievements)],
      })),
    experience: snapshot.experience
      .filter((entry) => entry.company.trim() || entry.position.trim())
      .map((entry) => ({
        org: entry.company.trim(),
        role: orNull(entry.position),
        start: orNull(entry.startDate),
        end: orNull(entry.endDate),
        location: null,
        bullets: [
          ...splitLines(entry.description),
          ...splitLines(entry.responsibilities),
          ...splitLines(entry.achievements),
        ],
      })),
    projects: snapshot.projects
      .filter((entry) => entry.name.trim())
      .map((entry) => ({
        name: entry.name.trim(),
        role: orNull(entry.role),
        tech: splitList(entry.tools),
        bullets: [
          ...splitLines(entry.description),
          ...splitLines(entry.contribution),
          ...splitLines(entry.result),
        ],
        link: orNull(entry.link),
      })),
    skills: {
      technical: snapshot.technicalSkills,
      soft: snapshot.softSkills,
      languages: snapshot.languages,
      tools: snapshot.tools,
    },
    certifications: snapshot.certifications
      .filter((entry) => entry.name.trim())
      .map((entry) => ({
        name: entry.name.trim(),
        issuer: orNull(entry.organization),
        date: orNull(entry.issueDate),
      })),
    activities: [],
  };
}

/** Lấy content section đúng shape BE DTO — pick verbatim từ store, không remap. */
export function pickSectionContent(
  section: BuilderSection,
  snapshot: BuilderSnapshot,
): BuilderSectionContent {
  switch (section) {
    case "basic":
      return {
        fullName: snapshot.fullName,
        email: snapshot.email,
        phone: snapshot.phone,
        location: snapshot.location,
        linkedin: snapshot.linkedin,
        github: snapshot.github,
        portfolio: snapshot.portfolio,
      };
    case "summary":
      return { summary: snapshot.summary };
    case "experience":
      return {
        entries: snapshot.experience.map(({ id: _id, aiRewrite: _ai, ...entry }) => entry),
      };
    case "education":
      return { entries: snapshot.education.map(({ id: _id, ...entry }) => entry) };
    case "projects":
      return { entries: snapshot.projects.map(({ id: _id, ...entry }) => entry) };
    case "skills":
      return {
        technicalSkills: snapshot.technicalSkills,
        softSkills: snapshot.softSkills,
        tools: snapshot.tools,
        languages: snapshot.languages,
      };
    case "certifications":
      return { entries: snapshot.certifications.map(({ id: _id, ...entry }) => entry) };
  }
}

// ── Nghiệp vụ ───────────────────────────────────────────────────────

export interface EnsureDraftInput {
  /** Prefill từ CV đã chấm (store.lastCvId của diagnosis) — optional. */
  sourceCvId?: string | null;
  title?: string;
  targetRole?: string | null;
  language?: CvLanguage;
}

/** Tạo draft builder trên BE (gọi 1 lần khi vào builder; id lưu vào store.draftId). */
export async function ensureBuilderDraft({
  sourceCvId,
  title,
  targetRole,
  language,
}: EnsureDraftInput = {}): Promise<CvDto> {
  requireSession();
  return createBuilderDraftApi({
    sourceCvId: sourceCvId ?? undefined,
    title,
    targetRole: targetRole ?? undefined,
    language,
  });
}

/** Autosave: đẩy toàn bộ form lên draft (UI debounce ~1.5s sau lần gõ cuối). */
export async function saveBuilderDraft(
  draftId: string,
  snapshot: BuilderSnapshot,
  extra: { title?: string; targetRole?: string | null } = {},
): Promise<CvDto> {
  requireSession();
  return updateBuilderDraftApi(draftId, {
    parsedJson: mapStoreToCanonical(snapshot),
    title: extra.title,
    targetRole: extra.targetRole ?? undefined,
    language: snapshot.cvLanguage,
  });
}

export interface EvaluateSectionInput {
  draftId: string;
  section: BuilderSection;
  snapshot: BuilderSnapshot;
  /** 1 trong 8 role code IT — truyền từ diagnosis store nếu builder mở từ đó. */
  roleCode?: string | null;
}

/** Chấm live 1 section (deterministic phía BE — điểm/label/checklist là của BE). */
export async function evaluateSection({
  draftId,
  section,
  snapshot,
  roleCode,
}: EvaluateSectionInput): Promise<EvaluateSectionResponse> {
  requireSession();
  return evaluateSectionApi(draftId, {
    section,
    role_code: roleCode ?? undefined,
    language: snapshot.cvLanguage,
    content: pickSectionContent(section, snapshot),
  });
}

/** "AI đề xuất" cho 1 field — trả suggestion transient, UI quyết [Sử dụng]/[Viết lại]. */
export async function rewriteField(
  draftId: string,
  input: RewriteRequest,
): Promise<RewriteResponse> {
  requireSession();
  return rewriteFieldApi(draftId, input);
}

/**
 * Story → Career Target (cold-start): 1 đoạn kể tự do → vai trò gợi ý.
 * Deterministic phía BE (weighted skill coverage, KHÔNG LLM, KHÔNG quota). Slice 1c.
 */
export async function inferCareerTargetFromStory(
  draftId: string,
  input: CareerTargetFromStoryRequest,
): Promise<CareerTargetFromStoryResponse> {
  requireSession();
  return inferCareerTargetFromStoryApi(draftId, input);
}

/**
 * Story → Extract projects + certifications (slice 2).
 * Deterministic (NO LLM, no quota).
 */
export async function storyExtract(
  draftId: string,
  input: StoryExtractRequest,
): Promise<StoryExtractResponse> {
  requireSession();
  return storyExtractApi(draftId, input);
}

/**
 * Story → Apply Preview (slice 3): merge selected items into CV doc.
 * Does NOT persist — FE must PUT the merged doc via autosave.
 */
export async function storyApplyPreview(
  draftId: string,
  input: StoryApplyPreviewRequest,
): Promise<StoryApplyPreviewResponse> {
  requireSession();
  return storyApplyPreviewApi(draftId, input);
}

/**
 * Story → Compute Readiness & Gap (slice 4).
 * Deterministic (NO LLM, no quota).
 */
export async function computeStoryReadiness(
  draftId: string,
  input: StoryReadinessRequest,
): Promise<StoryReadinessResponse> {
  requireSession();
  return computeStoryReadinessApi(draftId, input);
}

/**
 * Story → Project Intake (W34).
 * Anti-fabrication.
 */
export async function intakeProjectFromStory(
  draftId: string,
  input: ProjectIntakeRequest,
): Promise<ProjectIntakeResponse> {
  requireSession();
  return intakeProjectFromStoryApi(draftId, input);
}

/** Render PDF của draft — trả Blob để UI tải xuống. */
export async function renderBuilderPdf(draftId: string): Promise<Blob> {
  requireSession();
  return renderBuilderPdfApi(draftId);
}

// ── Companion / CV Assistant ────────────────────────────────────────

/** Turn-1: phân tích field + hỏi (deterministic, KHÔNG quota). */
export async function assistantAnalyze(
  draftId: string,
  input: AssistantAnalyzeRequest,
): Promise<CvAssistantTurn> {
  requireSession();
  return assistantAnalyzeApi(draftId, input);
}

/** Turn-2: viết lại từ câu trả lời (LLM, tốn quota CHỈ khi ok). */
export async function assistantRewrite(
  draftId: string,
  input: AssistantRewriteRequest,
): Promise<AssistantRewriteResponse> {
  requireSession();
  return assistantRewriteApi(draftId, input);
}

/** Gợi ý hoàn thiện skills (deterministic, KHÔNG quota). */
export async function assistantSkillsNudge(
  draftId: string,
  lang: "vi" | "en" = "vi",
): Promise<SkillsNudgeItem[]> {
  requireSession();
  return assistantSkillsNudgeApi(draftId, lang);
}

/** Narrative extraction: user kể chuyện → AI trích field (LLM). */
export async function assistantExtract(
  draftId: string,
  input: ExtractRequest,
): Promise<ExtractResponse> {
  requireSession();
  return assistantExtractApi(draftId, input);
}
