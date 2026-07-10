import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ensureBuilderDraft,
  evaluateSection,
  renderBuilderPdf,
  rewriteField,
  saveBuilderDraft,
  assistantAnalyze,
  assistantExplain,
  assistantSmartQuestions,
  assistantRewrite,
  assistantSkillsNudge,
  assistantExtract,
  intakeProjectFromStory,
  type BuilderSnapshot,
  type EvaluateSectionInput,
} from "@/services/cv-builder.service";
import { assessAiInput, getAiGateCode, type AiGateCode } from "@/lib/ai-input-gate";
import type { RewriteRequest, RewriteResponse, ProjectIntakeRequest } from "@shared/api";
import type { AssistantAnalyzeRequest, AssistantRewriteRequest, ExtractRequest } from "@/types/companion";

/** Tạo draft builder trên BE — gọi 1 lần khi vào builder (lưu id vào store.draftId). */
export function useEnsureBuilderDraftMutation() {
  return useMutation({ mutationFn: ensureBuilderDraft });
}

/** Autosave draft — UI debounce ~1.5s sau lần gõ cuối rồi mutate. */
export function useSaveBuilderDraftMutation() {
  return useMutation({
    mutationFn: ({
      draftId,
      snapshot,
      title,
      targetRole,
    }: {
      draftId: string;
      snapshot: BuilderSnapshot;
      title?: string;
      targetRole?: string | null;
    }) => saveBuilderDraft(draftId, snapshot, { title, targetRole }),
  });
}

/** Chấm live 1 section — kết quả lưu vào store.sectionEvaluations[section]. */
export function useEvaluateSectionMutation() {
  return useMutation({
    mutationFn: (input: EvaluateSectionInput) => evaluateSection(input),
  });
}

/** "AI đề xuất" 1 field — suggestion transient, [Sử dụng] mới ghi đè input. */
export function useRewriteFieldMutation() {
  return useMutation({
    mutationFn: ({ draftId, ...input }: { draftId: string } & RewriteRequest) =>
      rewriteField(draftId, input),
  });
}

export interface AiRewriteHandlers {
  onSuccess: (data: RewriteResponse) => void;
  /** Input bị chặn (FE pre-gate hoặc BE 400 code) — hiện hint i18n thân thiện. */
  onGateFail: (reason: AiGateCode) => void;
  /** Mọi lỗi còn lại (mạng/5xx) — giữ error pattern hiện có của UI. */
  onError: (error: Error) => void;
}

/**
 * Đường rewrite dùng chung cho "AI đề xuất" + "Tạo tóm tắt": chạy FE gate trước
 * (instant, không tốn request), rồi mới gọi BE; map mã 400 của BE gate
 * (INSUFFICIENT_CONTEXT/OFF_TOPIC) về onGateFail thay vì toast lỗi thô.
 */
export function useAiRewrite() {
  const mutation = useRewriteFieldMutation();

  const rewrite = (
    input: { draftId: string } & RewriteRequest,
    handlers: AiRewriteHandlers,
  ) => {
    const verdict = assessAiInput(input.text);
    if (!verdict.ok) {
      handlers.onGateFail(verdict.reason ?? "INSUFFICIENT_CONTEXT");
      return;
    }
    mutation.mutate(input, {
      onSuccess: handlers.onSuccess,
      onError: (error: Error) => {
        const code = getAiGateCode(error);
        if (code) handlers.onGateFail(code);
        else handlers.onError(error);
      },
    });
  };

  return { rewrite, isPending: mutation.isPending };
}

/** Render + tải PDF của draft. */
export function useRenderBuilderPdfMutation() {
  return useMutation({ mutationFn: renderBuilderPdf });
}

// ── Companion / CV Assistant ────────────────────────────────────────

/** Turn-1: phân tích field + hỏi — mutation vì user trigger thủ công (focus/click). */
export function useAssistantAnalyzeMutation() {
  return useMutation({
    mutationFn: ({ draftId, ...input }: { draftId: string } & AssistantAnalyzeRequest) =>
      assistantAnalyze(draftId, input),
  });
}

/** Read-only guidance explanation. */
export function useAssistantExplainMutation() {
  return useMutation({
    mutationFn: ({ draftId, ...input }: { draftId: string } & AssistantAnalyzeRequest) =>
      assistantExplain(draftId, input),
  });
}

/** Turn-1, LLM role-aware — mutation vì user trigger thủ công (mở companion). Rule fallback ở CvBuilderSkill. */
export function useAssistantSmartQuestionsMutation() {
  return useMutation({
    mutationFn: ({ draftId, ...input }: { draftId: string } & AssistantAnalyzeRequest) =>
      assistantSmartQuestions(draftId, input),
  });
}

/** Turn-2: viết lại từ answers — mutation (LLM, timeout dài). */
export function useAssistantRewriteMutation() {
  return useMutation({
    mutationFn: ({ draftId, ...input }: { draftId: string } & AssistantRewriteRequest) =>
      assistantRewrite(draftId, input),
  });
}

/** Skills nudge — query (deterministic GET, enabled khi có draftId). */
export function useSkillsNudgeQuery(draftId: string | null, lang: "vi" | "en" = "vi") {
  return useQuery({
    queryKey: ["skills-nudge", draftId, lang],
    queryFn: () => assistantSkillsNudge(draftId!, lang),
    enabled: !!draftId,
    staleTime: 60_000,
  });
}

/** Narrative extract — mutation (LLM, timeout dài). CvIntakeSkill. */
export function useAssistantExtractMutation() {
  return useMutation({
    mutationFn: ({ draftId, ...input }: { draftId: string } & ExtractRequest) =>
      assistantExtract(draftId, input),
  });
}

/** Project narrative extract — mutation (LLM, W34). CvProjectIntakeSkill. */
export function useProjectIntakeMutation() {
  return useMutation({
    mutationFn: ({ draftId, ...input }: { draftId: string } & ProjectIntakeRequest) =>
      intakeProjectFromStory(draftId, input),
  });
}
