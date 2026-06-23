import { isAxiosError } from "axios";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { AiGateError, extractAiGateCode } from "@/lib/ai-input-gate";
import type {
  CreateBuilderDraftInput,
  CvDto,
  EvaluateSectionRequest,
  EvaluateSectionResponse,
  RewriteRequest,
  RewriteResponse,
  UpdateBuilderDraftInput,
} from "@shared/api";
import type {
  AssistantAnalyzeRequest,
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
