import { useMutation } from "@tanstack/react-query";
import {
  ensureBuilderDraft,
  evaluateSection,
  renderBuilderPdf,
  rewriteField,
  saveBuilderDraft,
  type BuilderSnapshot,
  type EvaluateSectionInput,
} from "@/services/cv-builder.service";
import type { RewriteRequest } from "@shared/api";

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

/** Render + tải PDF của draft. */
export function useRenderBuilderPdfMutation() {
  return useMutation({ mutationFn: renderBuilderPdf });
}
