// ─── CvBuilderSkill ─────────────────────────────────────────────────
// Grounded CV rewrite flow — the bubble interior for the companion shell.
// Logic lifted verbatim from CompanionPanel.tsx (asking → thinking → presenting).
// The shell owns the mascot + bubble chrome; this renders the skill body.

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Send, Check, X, MessageCircle, Loader2, ArrowRight,
  Lightbulb, PenLine,
} from "lucide-react";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useCompanionStore } from "@/store/useCompanionStore";
import {
  useAssistantAnalyzeMutation,
  useAssistantRewriteMutation,
} from "@/hooks/use-cv-builder";
import { useTranslation } from "react-i18next";
import type { AssistantAnswer, AssistantQuestion } from "@/types/companion";
import { assistantLocales } from "./assistant-locale";

const MAX_REASK = 2;

/* ── Sub-components ── */

/** Chip picker for a single question. */
function QuestionChips({
  question,
  selected,
  freeText,
  onSelect,
  onFreeTextChange,
}: {
  question: AssistantQuestion;
  selected: string | null;
  freeText: string;
  onSelect: (optionId: string) => void;
  onFreeTextChange: (value: string) => void;
}) {
  const { t } = useTranslation("diagnosis");
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-[#2F3437] leading-relaxed">
        {question.prompt}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {question.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              selected === opt.id
                ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                : "bg-[#FBFBFA] text-[#2F3437] border-[#EAEAEA] hover:border-primary/20 hover:bg-primary/5",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {question.allows_free_text && (
        <input
          type="text"
          value={freeText}
          onChange={(e) => onFreeTextChange(e.target.value)}
          placeholder={t("companion.freeTextPlaceholder", { defaultValue: "Hoặc nhập chi tiết..." })}
          className="w-full px-3 py-2 text-xs border border-[#EAEAEA] rounded-lg bg-white focus:border-primary/40 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
        />
      )}
    </div>
  );
}

/** Diff view: before → after */
function DiffView({
  before,
  after,
  why,
}: {
  before: string;
  after: string;
  why: string;
}) {
  const { t } = useTranslation("diagnosis");
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="rounded-lg border border-red-100 bg-red-50/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">
            {t("companion.before", { defaultValue: "Trước" })}
          </p>
          <p className="text-xs text-[#2F3437] leading-relaxed line-through decoration-red-300">
            {before}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">
            {t("companion.after", { defaultValue: "Sau" })}
          </p>
          <p className="text-xs text-[#2F3437] leading-relaxed font-medium">
            {after}
          </p>
        </div>
      </div>
      {why && (
        <p className="text-[11px] text-[#787774] leading-relaxed italic">
          <Lightbulb className="w-3 h-3 inline mr-1 text-amber-500" />
          {why}
        </p>
      )}
    </div>
  );
}

/* ── Main skill renderer ── */

export interface CvBuilderSkillProps {
  draftId: string;
  fieldPath: string;
  section: "projects" | "experience" | "summary";
  currentValue: string;
  onApply: (after: string) => void;
}

export function CvBuilderSkill({
  draftId,
  fieldPath,
  section,
  currentValue,
  onApply,
}: CvBuilderSkillProps) {
  const { t, i18n } = useTranslation("diagnosis");

  const {
    cvLanguage,
    mascotState,
    companionField,
    companionTurn,
    companionPatch,
    companionMessage,
    companionReaskCount,
    setMascotState,
    setCompanionField,
    setCompanionTurn,
    setCompanionPatch,
    setCompanionMessage,
    clearCompanionAnswers,
    incrementReask,
    resetCompanion,
  } = useCvBuilderStore();

  // The assistant CONVERSES in the UI language but WRITES CV text in the CV's language: the user is asked
  // in their UI language, yet the rewritten bullet matches the CV (a VN user with an EN CV is asked in VN
  // and gets EN bullets). askLocale → analyze (questions); outputLocale → rewrite (the patch text).
  const { conversation: askLocale, output: outputLocale } = assistantLocales({
    uiLanguage: i18n.language,
    cvLanguage,
  });

  const isActiveField = !!fieldPath && companionField === fieldPath;

  const analyzeMutation = useAssistantAnalyzeMutation();
  const rewriteMutation = useAssistantRewriteMutation();

  // Per-question answers: { [gap]: { optionId, freeText } }
  const [answers, setAnswers] = useState<
    Record<string, { optionId: string | null; freeText: string }>
  >({});

  // ── Trigger analyze (Turn-1) ──
  const handleAnalyze = useCallback(() => {
    if (!draftId || !currentValue.trim() || !fieldPath) return;

    // Claim this field as THE active companion session.
    setCompanionField(fieldPath, section);
    setMascotState("idle");
    setCompanionTurn(null);
    setCompanionPatch(null);
    setCompanionMessage(null);
    clearCompanionAnswers();
    setAnswers({});

    analyzeMutation.mutate(
      {
        draftId,
        current_value: currentValue,
        section,
        field_path: fieldPath,
        locale: askLocale,
      },
      {
        onSuccess: (turn) => {
          setCompanionTurn(turn);
          if (turn.questions.length === 0) {
            setCompanionMessage(turn.message);
            setMascotState("presenting");
          } else {
            setCompanionMessage(turn.message);
            setMascotState("asking");
          }
        },
        onError: () => {
          setMascotState("idle");
        },
      },
    );
  }, [
    draftId, currentValue, section, fieldPath, askLocale,
    analyzeMutation, setMascotState, setCompanionField, setCompanionTurn, setCompanionPatch,
    setCompanionMessage, clearCompanionAnswers,
  ]);

  // Auto-trigger analyze on mount when this is a fresh field (the shell only mounts
  // the skill for the active context, so analyze runs when the bubble opens).
  const hasTriggered = useRef(false);
  useEffect(() => {
    if (hasTriggered.current) return;
    if (!isActiveField && fieldPath && draftId && currentValue.trim()) {
      hasTriggered.current = true;
      handleAnalyze();
    } else if (isActiveField && mascotState === "idle" && !companionTurn && !analyzeMutation.isPending) {
      hasTriggered.current = true;
      handleAnalyze();
    }
  }, [isActiveField, fieldPath, draftId, currentValue, mascotState, companionTurn, analyzeMutation.isPending, handleAnalyze]);

  // ── Submit answers (Turn-2) ──
  const handleSubmitAnswers = useCallback(() => {
    if (!draftId || !companionTurn) return;

    const answerList: AssistantAnswer[] = companionTurn.questions.map((q) => {
      const a = answers[q.gap];
      return {
        gap: q.gap,
        option_id: a?.optionId ?? "other",
        detail: a?.freeText?.trim() || undefined,
      };
    });

    setMascotState("thinking");

    rewriteMutation.mutate(
      {
        draftId,
        before: currentValue,
        answers: answerList,
        target: fieldPath ?? "",
        kind: section === "summary" ? "summary" : "bullet",
        locale: outputLocale,
      },
      {
        onSuccess: (res) => {
          if (res.ok && res.field_patch) {
            setCompanionPatch(res.field_patch);
            setCompanionMessage(null);
            setMascotState("presenting");
          } else if (res.reason === "NEEDS_DETAIL") {
            incrementReask();
            if (companionReaskCount + 1 >= MAX_REASK) {
              setCompanionMessage(
                t("companion.reaskLimit", {
                  defaultValue: "Hãy thử sửa tay phần này — trợ lý chưa thu thập đủ chi tiết.",
                }),
              );
              setMascotState("presenting");
            } else {
              setCompanionMessage(res.message ?? null);
              setMascotState("asking");
            }
          } else {
            setCompanionMessage(res.message ?? t("companion.error.unknown", { defaultValue: "Đã xảy ra lỗi. Thử lại sau." }));
            setCompanionPatch(null);
            setMascotState("presenting");
          }
        },
        onError: () => {
          setCompanionMessage(t("companion.error.unknown", { defaultValue: "Đã xảy ra lỗi. Thử lại sau." }));
          setMascotState("presenting");
        },
      },
    );
  }, [
    draftId, companionTurn, answers, currentValue, fieldPath, section, outputLocale,
    rewriteMutation, setMascotState, setCompanionPatch,
    setCompanionMessage, incrementReask, companionReaskCount, t,
  ]);

  // ── Apply patch ──
  const handleApply = useCallback(() => {
    if (!companionPatch) return;
    onApply(companionPatch.after);
    resetCompanion();
    useCompanionStore.getState().closeBubble();
  }, [companionPatch, onApply, resetCompanion]);

  // ── Discard ──
  const handleDiscard = useCallback(() => {
    resetCompanion();
    useCompanionStore.getState().dismissActive();
  }, [resetCompanion]);

  // ── Loading state for analyze ──
  if (analyzeMutation.isPending) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#787774] py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span>{t("companion.analyzing", { defaultValue: "Đang phân tích..." })}</span>
      </div>
    );
  }

  // If no session is active for this field yet, show nothing (the shell handles the idle state).
  if (!isActiveField || (mascotState === "idle" && !companionTurn)) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            {mascotState === "asking" && <MessageCircle className="w-3.5 h-3.5 text-primary" />}
            {mascotState === "thinking" && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
            {mascotState === "presenting" && <PenLine className="w-3.5 h-3.5 text-primary" />}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
            {mascotState === "asking" && t("companion.stateAsking", { defaultValue: "Trợ lý hỏi" })}
            {mascotState === "thinking" && t("companion.stateThinking", { defaultValue: "Đang suy nghĩ..." })}
            {mascotState === "presenting" && t("companion.statePresenting", { defaultValue: "Đề xuất" })}
          </span>
        </div>
        <button
          onClick={handleDiscard}
          className="text-[#787774] hover:text-[#2F3437] transition-colors p-1 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Message */}
      {companionMessage && mascotState !== "thinking" && (
        <p className="text-[13px] text-[#2F3437] leading-relaxed">
          {companionMessage}
        </p>
      )}

      {/* ── STATE: ASKING ── */}
      {mascotState === "asking" && companionTurn && companionTurn.questions.length > 0 && (
        <div className="space-y-3">
          {companionTurn.questions.map((q) => (
            <QuestionChips
              key={q.gap}
              question={q}
              selected={answers[q.gap]?.optionId ?? null}
              freeText={answers[q.gap]?.freeText ?? ""}
              onSelect={(optionId) =>
                setAnswers((prev) => ({
                  ...prev,
                  [q.gap]: { ...prev[q.gap], optionId, freeText: prev[q.gap]?.freeText ?? "" },
                }))
              }
              onFreeTextChange={(freeText) =>
                setAnswers((prev) => ({
                  ...prev,
                  [q.gap]: { ...prev[q.gap], optionId: prev[q.gap]?.optionId ?? null, freeText },
                }))
              }
            />
          ))}
          <Button
            size="sm"
            onClick={handleSubmitAnswers}
            disabled={
              companionTurn.questions.every(
                (q) => !answers[q.gap]?.optionId && !answers[q.gap]?.freeText?.trim(),
              )
            }
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-white gap-1.5"
          >
            <Send className="w-3 h-3" />
            {t("companion.send", { defaultValue: "Gửi" })}
          </Button>
        </div>
      )}

      {/* ── STATE: THINKING ── */}
      {mascotState === "thinking" && (
        <div className="space-y-2 py-2">
          <div className="flex items-center gap-2 text-xs text-[#787774]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>{t("companion.thinking", { defaultValue: "Đang viết lại... (có thể mất vài giây)" })}</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-3 bg-slate-100 rounded-full w-full animate-pulse" />
            <div className="h-3 bg-slate-100 rounded-full w-5/6 animate-pulse" style={{ animationDelay: "100ms" }} />
            <div className="h-3 bg-slate-100 rounded-full w-4/6 animate-pulse" style={{ animationDelay: "200ms" }} />
          </div>
        </div>
      )}

      {/* ── STATE: PRESENTING ── */}
      {mascotState === "presenting" && (
        <div className="space-y-3">
          {companionPatch && (
            <>
              <DiffView
                before={companionPatch.before}
                after={companionPatch.after}
                why={companionPatch.why}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="h-8 text-xs bg-primary hover:bg-primary/90 text-white gap-1.5"
                >
                  <Check className="w-3 h-3" />
                  {t("companion.apply", { defaultValue: "Áp dụng" })}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDiscard}
                  className="h-8 text-xs text-[#787774] hover:text-[#2F3437]"
                >
                  {t("companion.discard", { defaultValue: "Bỏ" })}
                </Button>
              </div>
            </>
          )}

          {/* Field already strong (questions: []) OR error message */}
          {!companionPatch && companionMessage && (
            <div className="flex items-center gap-2">
              {companionTurn?.questions.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-[#346538]">
                  <Check className="w-3.5 h-3.5" />
                  <span className="font-medium">{companionMessage}</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAnalyze}
                  className="h-8 text-xs gap-1.5"
                >
                  <ArrowRight className="w-3 h-3" />
                  {t("companion.retry", { defaultValue: "Thử lại" })}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
