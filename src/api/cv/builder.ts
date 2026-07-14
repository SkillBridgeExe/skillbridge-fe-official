import { isAxiosError } from "axios";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { AiGateError, extractAiGateCode } from "@/lib/ai-input-gate";
import type {
  CareerTargetFromStoryRequest,
  CareerTargetFromStoryResponse,
  CreateBuilderDraftInput,
  CvDto,
  EvaluateSectionRequest,
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
  UpdateBuilderDraftInput,
} from "@shared/api";
import type {
  AssistantAnalyzeRequest,
  AssistantExplanation,
  AssistantRewriteRequest,
  AssistantRewriteResponse,
  CvAssistantTurn,
  SkillsNudgeItem,
  ExtractRequest,
  ExtractResponse,
} from "@/types/companion";
import { CV_AI_TIMEOUT_MS } from "./upload";

/** POST /api/cvs/builder — tạo draft builder trên BE (cvKind=BUILT, review=null). */
export async function createBuilderDraftApi(
  input: CreateBuilderDraftInput = {},
): Promise<CvDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvDto>>(
    httpClient.post(API_ROUTES.CV.BUILDER_CREATE, input),
    "Failed to create the CV draft.",
  );
  return envelope.data;
}

/** PUT /api/cvs/:id/builder — autosave toàn bộ canonical document của draft. */
export async function updateBuilderDraftApi(
  draftId: string,
  input: UpdateBuilderDraftInput,
): Promise<CvDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvDto>>(
    httpClient.put(API_ROUTES.CV.BUILDER_UPDATE(draftId), input),
    "Failed to save the CV draft.",
  );
  return envelope.data;
}

/**
 * POST /api/cvs/:id/builder/evaluate — chấm 1 section (deterministic, KHÔNG LLM).
 * Nhanh, nhưng vẫn nới timeout nhẹ cho cold-start Cloud Run.
 */
export async function evaluateSectionApi(
  draftId: string,
  input: EvaluateSectionRequest,
): Promise<EvaluateSectionResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<EvaluateSectionResponse>>(
    httpClient.post(API_ROUTES.CV.BUILDER_EVALUATE(draftId), input, {
      timeout: 30_000,
    }),
    "Failed to evaluate the section.",
  );
  return envelope.data;
}

/** POST /api/cvs/:id/builder/rewrite — "AI đề xuất" 1 field (LLM → timeout dài). */
export async function rewriteFieldApi(
  draftId: string,
  input: RewriteRequest,
): Promise<RewriteResponse> {
  // BE input gate (W14): HTTP 400 + machine code (INSUFFICIENT_CONTEXT/OFF_TOPIC).
  // Preserve BE gate machine codes before unwrapping so UI can render friendly copy.
  // AiGateError FIRST — the UI maps it to a friendly i18n hint, not a raw toast.
  const request = httpClient
    .post(API_ROUTES.CV.BUILDER_REWRITE(draftId), input, {
      timeout: CV_AI_TIMEOUT_MS,
    })
    .catch((error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 400) {
        const code = extractAiGateCode(error.response.data);
        if (code) {
          const message = (error.response.data as { message?: unknown })?.message;
          throw new AiGateError(code, typeof message === "string" ? message : code);
        }
      }
      throw error;
    });

  const envelope = await unwrapEnvelope<ApiEnvelope<RewriteResponse>>(
    request,
    "Failed to generate a suggestion.",
  );
  return envelope.data;
}

/**
 * POST /api/cvs/:id/builder/story — Story → Career Target (deterministic role inference).
 * NO LLM, no quota; nới timeout nhẹ cho cold-start Cloud Run.
 */
export async function inferCareerTargetFromStoryApi(
  draftId: string,
  input: CareerTargetFromStoryRequest,
): Promise<CareerTargetFromStoryResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CareerTargetFromStoryResponse>>(
    httpClient.post(API_ROUTES.CV.BUILDER_STORY(draftId), input, { timeout: 30_000 }),
    "Failed to infer a career target from the story.",
  );
  return envelope.data;
}

/**
 * POST /api/cvs/:id/builder/story/extract — Story → extract projects + certifications.
 * Deterministic (NO LLM, no quota).
 */
export async function storyExtractApi(
  draftId: string,
  input: StoryExtractRequest,
): Promise<StoryExtractResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<StoryExtractResponse>>(
    httpClient.post(API_ROUTES.CV.BUILDER_STORY_EXTRACT(draftId), input, { timeout: 30_000 }),
    "Failed to extract projects from the story.",
  );
  return envelope.data;
}

/**
 * POST /api/cvs/:id/builder/story/apply-preview — merge selected items into CV doc.
 * Does NOT persist — FE must PUT the merged doc via autosave route.
 */
export async function storyApplyPreviewApi(
  draftId: string,
  input: StoryApplyPreviewRequest,
): Promise<StoryApplyPreviewResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<StoryApplyPreviewResponse>>(
    httpClient.post(API_ROUTES.CV.BUILDER_STORY_APPLY(draftId), input, { timeout: 30_000 }),
    "Failed to preview story apply.",
  );
  return envelope.data;
}

/**
 * POST /api/cvs/:id/builder/story/readiness — Compute Story -> CV readiness and gaps.
 * Deterministic (NO LLM, no quota).
 */
export async function computeStoryReadinessApi(
  draftId: string,
  input: StoryReadinessRequest,
): Promise<StoryReadinessResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<StoryReadinessResponse>>(
    httpClient.post(API_ROUTES.CV.BUILDER_STORY_READINESS(draftId), input, { timeout: 30_000 }),
    "Failed to compute story readiness.",
  );
  return envelope.data;
}

/**
 * POST /api/cvs/:id/builder/project/intake — Project intake from story.
 * Anti-fabrication.
 */
export async function intakeProjectFromStoryApi(
  draftId: string,
  input: ProjectIntakeRequest,
): Promise<ProjectIntakeResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<ProjectIntakeResponse>>(
    httpClient.post(API_ROUTES.CV.BUILDER_PROJECT_INTAKE(draftId), input, { timeout: 30_000 }),
    "Failed to extract project fields from the story.",
  );
  return envelope.data;
}

/** POST /api/cvs/:id/render-pdf — PDF bytes (KHÔNG envelope). */
export async function renderBuilderPdfApi(draftId: string): Promise<Blob> {
  const response = await httpClient.post(API_ROUTES.CV.RENDER_PDF(draftId), undefined, {
    responseType: "blob",
    timeout: CV_AI_TIMEOUT_MS,
  });
  return response.data as Blob;
}

// ── Companion / CV Assistant (PR #126) ──────────────────────────────

/**
 * POST /api/cvs/:id/builder/assistant/analyze — Turn-1: phân tích + hỏi.
 * Deterministic (KHÔNG LLM, KHÔNG quota) nhưng nới timeout cho cold-start.
 */
export async function assistantAnalyzeApi(
  draftId: string,
  input: AssistantAnalyzeRequest,
): Promise<CvAssistantTurn> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvAssistantTurn>>(
    httpClient.post(API_ROUTES.CV.ASSISTANT_ANALYZE(draftId), input, {
      timeout: 30_000,
    }),
    "Failed to analyze the field.",
  );
  return envelope.data;
}

/**
 * POST /api/cvs/:id/builder/assistant/smart-questions — Turn-1, LLM role-aware sibling
 * of analyze. Same request/response shape; BE reads the real role server-side (never
 * a client-sent role). LLM → nới timeout dài (KHÔNG phải 30s như analyze rule).
 */
export async function assistantSmartQuestionsApi(
  draftId: string,
  input: AssistantAnalyzeRequest,
): Promise<CvAssistantTurn> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvAssistantTurn>>(
    httpClient.post(API_ROUTES.CV.ASSISTANT_SMART_QUESTIONS(draftId), input, {
      timeout: CV_AI_TIMEOUT_MS,
    }),
    "Failed to fetch smart questions.",
  );
  return envelope.data;
}

/**
 * POST /api/cvs/:id/builder/assistant/rewrite — Turn-2: viết lại (LLM → timeout dài).
 * Tốn quota CV_BUILDER_REWRITE CHỈ khi trả patch (ok=true).
 */
export async function assistantRewriteApi(
  draftId: string,
  input: AssistantRewriteRequest,
): Promise<AssistantRewriteResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AssistantRewriteResponse>>(
    httpClient.post(API_ROUTES.CV.ASSISTANT_REWRITE(draftId), input, {
      timeout: CV_AI_TIMEOUT_MS,
    }),
    "Failed to generate a rewrite.",
  );
  return envelope.data;
}

/**
 * GET /api/cvs/:id/builder/assistant/skills-nudge — gợi ý hoàn thiện skills.
 * Deterministic (KHÔNG LLM, KHÔNG quota). Mảng rỗng = đã đủ.
 */
export async function assistantSkillsNudgeApi(
  draftId: string,
  lang: "vi" | "en" = "vi",
): Promise<SkillsNudgeItem[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<SkillsNudgeItem[]>>(
    httpClient.get(API_ROUTES.CV.ASSISTANT_SKILLS_NUDGE(draftId), {
      params: { lang },
      timeout: 15_000,
    }),
    "Failed to fetch skills nudge.",
  );
  return envelope.data;
}

/**
 * POST /api/cvs/:id/builder/assistant/extract — narrative → field extraction (LLM → timeout dài).
 * CvIntakeSkill: user kể chuyện → AI trích field.
 */
export async function assistantExtractApi(
  draftId: string,
  input: ExtractRequest,
): Promise<ExtractResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<ExtractResponse>>(
    httpClient.post(API_ROUTES.CV.ASSISTANT_EXTRACT(draftId), input, {
      timeout: CV_AI_TIMEOUT_MS,
    }),
    "Failed to extract fields from narrative.",
  );
  return envelope.data;
}

/**
 * POST /api/cvs/:id/builder/assistant/explain — read-only guidance (no LLM, no quota).
 */
export async function assistantExplainApi(
  draftId: string,
  input: AssistantAnalyzeRequest,
): Promise<AssistantExplanation> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AssistantExplanation>>(
    httpClient.post(API_ROUTES.CV.ASSISTANT_EXPLAIN(draftId), input, {
      timeout: 30_000,
    }),
    "Failed to explain the field.",
  );
  return envelope.data;
}
