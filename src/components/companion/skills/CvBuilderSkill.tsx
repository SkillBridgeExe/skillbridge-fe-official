// ─── CvBuilderSkill ─────────────────────────────────────────────────
// Grounded CV rewrite flow — the bubble interior for the companion shell.
// Logic lifted verbatim from CompanionPanel.tsx (asking → thinking → presenting).
// The shell owns the mascot + bubble chrome; this renders the skill body.

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Send, Check, X, MessageCircle, Loader2, ArrowRight,
  Lightbulb, PenLine, Wand2
} from "lucide-react";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useCompanionStore } from "@/store/useCompanionStore";
import {
  useAssistantAnalyzeMutation,
  useAssistantSmartQuestionsMutation,
  useAssistantRewriteMutation,
  useAssistantExplainMutation,
} from "@/hooks/use-cv-builder";
import { useTranslation } from "react-i18next";
import type { AssistantAnswer, AssistantQuestion, AssistantExplanation } from "@/types/companion";
import { assistantLocales } from "./assistant-locale";
import { ThinkingDots } from "../ThinkingDots";
import { openIntakeCoach } from "./open-intake-coach";
import { CV_BUILDER_CHAT_CONTEXT_ID } from "./useCvBuilderChatCompanion";
import { buildCvBuilderPatchProposal } from "./cv-builder-patch";

const MAX_REASK = 2;

// The prove-it flow registers the transient "diagnosis_anchor_fix" context and
// activates it; nothing else ever tears it down. When the user finishes the
// anchored fix (apply→Close or Discard), unregister it and hand the dolphin
// back to the builder writing chat — otherwise cvbuilder:chat stays permanently
// unreachable for the session (bug hunt R2 07-22).
function handoffFromAnchorFix(): void {
  const store = useCompanionStore.getState();
  if (store.activeId !== "diagnosis_anchor_fix") return;
  store.unregisterContext("diagnosis_anchor_fix");
  store.activateContext(CV_BUILDER_CHAT_CONTEXT_ID); // no-op if chat isn't registered
}

// Synthetic gap key for the user-initiated "Hỏi thêm để rõ hơn" free-text answer — never
// sent by BE's Turn-1 analyze, so it can't collide with a real gap code.
const EXTRA_CLARIFY_GAP = "user_clarify";

const EMPTY_ENTRY = {
  company: "", position: "", startDate: "", endDate: "",
  description: "", achievements: "",
} as const;

type RewriteIntent = "improve" | "shorten" | "make_ats_friendly" | "turn_into_impact" | "add_evidence";
type QuestionIntent = "analyze" | "add_evidence" | "make_ats_friendly" | "turn_into_impact";

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
          maxLength={200}
          placeholder={t("companion.freeTextPlaceholder")}
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
            {t("companion.before")}
          </p>
          <p className="text-xs text-[#2F3437] leading-relaxed line-through decoration-red-300">
            {before}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">
            {t("companion.after")}
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
  const smartQuestionsMutation = useAssistantSmartQuestionsMutation();
  const rewriteMutation = useAssistantRewriteMutation();
  const explainMutation = useAssistantExplainMutation();

  // Per-question answers: { [gap]: { optionId, freeText } }
  const [answers, setAnswers] = useState<
    Record<string, { optionId: string | null; freeText: string }>
  >({});

  const [isApplied, setIsApplied] = useState(false);

  // ── "Hỏi thêm để rõ hơn" (user-initiated re-ask, Task M4) ──
  // Local-only: a transient sub-mode of mascotState==='asking' showing ONE generic
  // free-text question instead of the original chip set.
  const [askMoreActive, setAskMoreActive] = useState(false);
  const [askMoreText, setAskMoreText] = useState("");
  const [activeIntent, setActiveIntent] = useState<RewriteIntent | null>(null);

  // W98: Explanation state for Batch B
  const [companionExplanation, setCompanionExplanation] = useState<AssistantExplanation | null>(null);

  // W98: Intake coach offer state for experience dead ends
  const [offeredIntakeGap, setOfferedIntakeGap] = useState<string | null>(null);

  // ── Direct transform rewrite (no questions) — improve/shorten chips fire this straight
  // away; evidence/ats/impact land here when Turn-1 finds nothing to ask (P3-4: an intent
  // with no missing facts owes the user a SAFE transform, never an "already strong" no-op).
  const fireDirectIntentRewrite = useCallback((intentKey: RewriteIntent) => {
    if (!draftId || rewriteMutation.isPending) return;

    setCompanionField(fieldPath, section);
    setMascotState("thinking");
    setCompanionTurn(null);
    setCompanionPatch(null);
    setCompanionMessage(null);
    clearCompanionAnswers();
    setAnswers({});
    setActiveIntent(intentKey);
    setIsApplied(false);
    setOfferedIntakeGap(null);
    setCompanionExplanation(null);

    rewriteMutation.mutate(
        {
          draftId,
          before: currentValue,
          answers: [],
          target: fieldPath ?? "",
          kind: section === "summary" ? "summary" : "bullet",
          locale: askLocale,
          output_lang: outputLocale,
          intent: intentKey,
        },
      {
        onSuccess: (res) => {
          if (res.ok && res.field_patch) {
            setCompanionPatch(res.field_patch);
            setCompanionMessage(null);
            setMascotState("presenting");
          } else if (res.reason === "NEEDS_DETAIL") {
            setCompanionTurn({
              message: res.message ?? t("companion.needMoreInfo"),
              questions: [
                {
                  gap: res.gap ?? "result",
                  prompt: res.message ?? t("companion.needMoreInfo"),
                  options: [],
                  allows_free_text: true,
                }
              ],
              requires_user_confirmation: false,
              field_patch: null,
            });
            setCompanionMessage(res.message ?? t("companion.needMoreInfo"));
            setMascotState("asking");
          } else {
            setCompanionMessage(
              res.message ?? t("companion.error.unknown"),
            );
            setMascotState("presenting");
          }
        },
        onError: () => {
          setCompanionMessage(t("companion.error.unknown"));
          setMascotState("presenting");
        },
      }
    );
  }, [
    draftId, rewriteMutation, currentValue, fieldPath, section, askLocale, outputLocale,
    setCompanionField, setMascotState, setCompanionPatch, setCompanionMessage, setCompanionTurn, clearCompanionAnswers, t
  ]);

  // ── Trigger analyze (Turn-1) ── Also the deterministic fallback for smart-questions:
  // it accepts the SAME requested_action so a chip's intent survives an LLM outage.
  const handleAnalyze = useCallback((requestedAction: QuestionIntent = "analyze") => {
    if (!draftId || !currentValue.trim() || !fieldPath) return;

    // Claim this field as THE active companion session.
    setCompanionField(fieldPath, section);
    setMascotState("idle");
    setCompanionTurn(null);
    setCompanionPatch(null);
    setCompanionMessage(null);
    clearCompanionAnswers();
    setAnswers({});
    setActiveIntent(requestedAction === "analyze" ? null : requestedAction);
    setIsApplied(false);
    setOfferedIntakeGap(null);
    setCompanionExplanation(null);

    analyzeMutation.mutate(
      {
        draftId,
        current_value: currentValue,
        section,
        field_path: fieldPath,
        locale: askLocale,
        ...(requestedAction === "analyze" ? {} : { requested_action: requestedAction }),
      },
      {
        onSuccess: (turn) => {
          if (turn.questions.length === 0 && requestedAction !== "analyze") {
            // Nothing to ask — the chip still owes the user a safe transform.
            fireDirectIntentRewrite(requestedAction);
            return;
          }
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
    setCompanionMessage, clearCompanionAnswers, fireDirectIntentRewrite,
  ]);

  // ── Trigger smart-questions (Turn-1, LLM role-aware) — rule analyze fallback on error ──
  // Same request shape as analyze (current_value/section/field_path/locale) — no target_role,
  // BE reads the real role server-side from the owned CV record.
  const handleSmartQuestions = useCallback((requestedAction: QuestionIntent = "analyze") => {
    if (!draftId || !currentValue.trim() || !fieldPath) return;

    // Claim this field as THE active companion session.
    setCompanionField(fieldPath, section);
    setMascotState("idle");
    setCompanionTurn(null);
    setCompanionPatch(null);
    setCompanionMessage(null);
    clearCompanionAnswers();
    setAnswers({});
    setActiveIntent(requestedAction === "analyze" ? null : requestedAction);
    setIsApplied(false);
    setOfferedIntakeGap(null);
    setCompanionExplanation(null);

    const request = {
      draftId,
      current_value: currentValue,
      section,
      field_path: fieldPath,
      locale: askLocale,
      ...(requestedAction === "analyze" ? {} : { requested_action: requestedAction }),
    };

    smartQuestionsMutation.mutate(
      request,
      {
        onSuccess: (turn) => {
          if (turn.questions.length === 0 && requestedAction !== "analyze") {
            // Nothing to ask — evidence/ats/impact must still deliver a safe transform.
            fireDirectIntentRewrite(requestedAction);
            return;
          }
          setCompanionTurn(turn);
          setCompanionMessage(turn.message);
          setMascotState(turn.questions.length === 0 ? "presenting" : "asking");
        },
        onError: () => {
          // LLM path failed (network/timeout/rate-limit) — fall back to the rule
          // analyze WITH the same requested_action so the chip's intent survives.
          handleAnalyze(requestedAction);
        },
      },
    );
  }, [
    draftId, currentValue, section, fieldPath, askLocale,
    smartQuestionsMutation, setMascotState, setCompanionField, setCompanionTurn, setCompanionPatch,
    setCompanionMessage, clearCompanionAnswers, handleAnalyze, fireDirectIntentRewrite,
  ]);

  // ── Trigger Explain ──
  const handleExplain = useCallback(() => {
    if (!draftId || !currentValue.trim() || !fieldPath) return;

    setCompanionField(fieldPath, section);
    setMascotState("thinking");
    setCompanionTurn(null);
    setCompanionPatch(null);
    setCompanionMessage(null);
    clearCompanionAnswers();
    setAnswers({});
    setActiveIntent(null);
    setIsApplied(false);
    setOfferedIntakeGap(null);
    setCompanionExplanation(null);

    explainMutation.mutate(
      {
        draftId,
        current_value: currentValue,
        section,
        field_path: fieldPath,
        locale: askLocale,
      },
      {
        onSuccess: (explanation) => {
          setCompanionExplanation(explanation);
          setMascotState("idle");
        },
        onError: () => {
          setCompanionMessage(t("companion.error.unknown"));
          setMascotState("idle");
        },
      }
    );
  }, [
    draftId, currentValue, section, fieldPath, askLocale,
    explainMutation, setMascotState, setCompanionField, setCompanionTurn, setCompanionPatch,
    setCompanionMessage, clearCompanionAnswers, t
  ]);

  // Auto-trigger smart-questions on mount when this is a fresh field (the shell only mounts
  // the skill for the active context, so the fetch runs when the bubble opens/"tap").
  const hasTriggered = useRef(false);
  useEffect(() => {
    if (hasTriggered.current) return;
    if (!isActiveField && fieldPath && draftId && currentValue.trim()) {
      hasTriggered.current = true;
      setCompanionField(fieldPath, section);
      setMascotState("idle");
    } else if (isActiveField && mascotState === "idle" && !companionTurn && !analyzeMutation.isPending) {
      hasTriggered.current = true;
    }
  }, [isActiveField, fieldPath, draftId, currentValue, mascotState, companionTurn, analyzeMutation.isPending, setCompanionField, setMascotState, section]);

  // ── Route a re-ask dead-end INTO the intake coaching loop (no dead-end) ──
  // The current bullet seeds the narrative; the discarded res.gap selects the
  // coaching funnel. The intake applies grounded fields back to THIS single
  // builder field (achievements field → achievements text, else description).
  const routeToIntakeCoach = useCallback(
    (gap: string | null) => {
      if (!draftId) return;
      const isAchievements = section === "experience" && /achievements/i.test(fieldPath ?? "");
      const id = `intake-coach:${fieldPath || section}`;
      openIntakeCoach({
        id,
        draftId,
        entryIndex: 0,
        // Seed the field being coached so the diff has a real `before`.
        currentEntry: isAchievements
          ? { ...EMPTY_ENTRY, achievements: currentValue }
          : { ...EMPTY_ENTRY, description: currentValue },
        coachTrigger: "needs_detail",
        coachGap: gap,
        seedNarrative: currentValue,
        onApply: (fields) => {
          // Map the grounded extracted field back to this single builder field.
          const next = isAchievements
            ? fields.achievements ?? fields.description
            : fields.description ?? fields.achievements;
          if (next && next.trim()) onApply(next);
        },
      });
      // Hand off to the intake bubble; this builder session is done.
      resetCompanion();
    },
    [draftId, section, fieldPath, currentValue, onApply, resetCompanion],
  );

  // ── Build the wire answer list from a { [gap]: {optionId, freeText} } snapshot ──
  // Shared by the initial Turn-2 submit AND the Task M4 follow-ups (softer / ask-more)
  // so every rewrite call sees the SAME per-question shape, plus the synthetic
  // EXTRA_CLARIFY_GAP entry when the user has answered the "ask more" free-text box.
  const buildAnswerList = useCallback(
    (answersSnapshot: typeof answers): AssistantAnswer[] => {
      if (!companionTurn) return [];
      const list: AssistantAnswer[] = companionTurn.questions.map((q) => {
        const a = answersSnapshot[q.gap];
        return {
          gap: q.gap,
          option_id: a?.optionId ?? "other",
          detail: a?.freeText?.trim() || undefined,
        };
      });
      const clarify = answersSnapshot[EXTRA_CLARIFY_GAP];
      // Skip when a synthesized dead-end question already carries the clarify gap —
      // the map above has emitted this answer and BE must not see it twice.
      if (
        clarify?.freeText?.trim() &&
        !companionTurn.questions.some((q) => q.gap === EXTRA_CLARIFY_GAP)
      ) {
        list.push({ gap: EXTRA_CLARIFY_GAP, option_id: "other", detail: clarify.freeText.trim() });
      }
      return list;
    },
    [companionTurn],
  );

  // ── Submit answers (Turn-2) ──
  const handleSubmitAnswers = useCallback(() => {
    if (!draftId || !companionTurn) return;

    const answerList = buildAnswerList(answers);

    setMascotState("thinking");

    rewriteMutation.mutate(
      {
        draftId,
        before: currentValue,
        answers: answerList,
        target: fieldPath ?? "",
        kind: section === "summary" ? "summary" : "bullet",
        locale: askLocale,
        output_lang: outputLocale,
        ...(activeIntent ? { intent: activeIntent } : {}),
      },
      {
        onSuccess: (res) => {
          if (res.ok && res.field_patch) {
            setCompanionPatch(res.field_patch);
            setCompanionMessage(null);
            setMascotState("presenting");
          } else if (res.reason === "NEEDS_DETAIL") {
            incrementReask();
            // Read the count back from the store — the closure value is stale after increment.
            if (useCvBuilderStore.getState().companionReaskCount >= MAX_REASK) {
              if (section === "experience") {
                setCompanionMessage(res.message ?? t("companion.deadEnd.experienceMessage"));
                setOfferedIntakeGap(res.gap ?? "result");
                setMascotState("asking");
              } else {
                setCompanionTurn({
                  message: res.message ?? t("companion.deadEnd.summaryMessage"),
                  questions: [
                    {
                      // BE's generic NEEDS_DETAIL carries no gap — fall back to the synthetic
                      // clarify gap, the only free-text gap the BE whitelist accepts.
                      gap: res.gap ?? EXTRA_CLARIFY_GAP,
                      prompt: t("companion.needMoreInfo"),
                      options: [],
                      allows_free_text: true,
                    }
                  ],
                  requires_user_confirmation: false,
                  field_patch: null,
                });
                setCompanionMessage(res.message ?? t("companion.deadEnd.summaryMessage"));
                setMascotState("asking");
              }
            } else {
              setCompanionMessage(res.message ?? null);
              setMascotState("asking");
            }
          } else {
            setCompanionMessage(res.message ?? t("companion.error.unknown"));
            setCompanionPatch(null);
            setMascotState("presenting");
          }
        },
        onError: () => {
          setCompanionMessage(t("companion.error.unknown"));
          setMascotState("presenting");
        },
      },
    );
  }, [
    draftId, companionTurn, answers, buildAnswerList, currentValue, fieldPath, section, outputLocale, askLocale,
    rewriteMutation, setMascotState, setCompanionPatch, setCompanionTurn,
    setCompanionMessage, incrementReask, t, activeIntent,
  ]);

  // ── Follow-up rewrites from the PRESENTING state (Task M4) ──
  // Re-fires Turn-2 with the SAME target/answers (+ optional tone or an extra
  // clarify answer). Deliberately does NOT touch companionReaskCount/MAX_REASK:
  // that budget guards the AUTO re-ask loop inside handleSubmitAnswers; these are
  // user-initiated, already-presented-a-patch actions, so they're gated only by
  // "one in flight at a time" (rewriteMutation.isPending) — no separate FE cap.
  // A failed follow-up keeps the last good companionPatch (don't erase progress),
  // it only surfaces the error message.
  const fireFollowupRewrite = useCallback(
    (opts: { tone?: "softer"; answersSnapshot?: typeof answers } = {}) => {
      if (!draftId || !companionTurn || rewriteMutation.isPending) return;

      const answerList = buildAnswerList(opts.answersSnapshot ?? answers);
      setMascotState("thinking");

      rewriteMutation.mutate(
        {
          draftId,
          before: currentValue,
          answers: answerList,
          target: fieldPath ?? "",
          kind: section === "summary" ? "summary" : "bullet",
          locale: askLocale,
          output_lang: outputLocale,
          ...(activeIntent ? { intent: activeIntent } : {}),
          ...(opts.tone ? { tone: opts.tone } : {}),
        },
        {
          onSuccess: (res) => {
            if (res.ok && res.field_patch) {
              setCompanionPatch(res.field_patch);
              setCompanionMessage(null);
            } else {
              setCompanionMessage(
                res.message ?? t("companion.error.unknown"),
              );
            }
            setMascotState("presenting");
          },
          onError: () => {
            setCompanionMessage(t("companion.error.unknown"));
            setMascotState("presenting");
          },
        },
      );
    },
    [
      draftId, companionTurn, rewriteMutation, buildAnswerList, answers, currentValue, fieldPath,
      section, askLocale, outputLocale, activeIntent, setMascotState, setCompanionPatch, setCompanionMessage, t,
    ],
  );

  // ── "Viết lại nhẹ hơn" ──
  const handleRewriteSofter = useCallback(() => {
    fireFollowupRewrite({ tone: "softer" });
  }, [fireFollowupRewrite]);

  // ── "Hỏi thêm để rõ hơn" — open the single free-text ask ──
  const handleAskMore = useCallback(() => {
    setAskMoreText("");
    setAskMoreActive(true);
    setCompanionMessage(null);
    setMascotState("asking");
  }, [setMascotState, setCompanionMessage]);

  // ── "Hỏi thêm để rõ hơn" — submit the free-text answer, append + re-fire ──
  const handleSubmitAskMore = useCallback(() => {
    const text = askMoreText.trim();
    if (!text) return;
    const nextAnswers = {
      ...answers,
      [EXTRA_CLARIFY_GAP]: { optionId: "other", freeText: text },
    };
    setAnswers(nextAnswers);
    setAskMoreActive(false);
    fireFollowupRewrite({ answersSnapshot: nextAnswers });
  }, [askMoreText, answers, fireFollowupRewrite]);

  // ── Apply patch ──
  const handleApply = useCallback(() => {
    if (!companionPatch) return;

    try {
      const document = useCvBuilderStore.getState().getResumeDocumentV1();
      buildCvBuilderPatchProposal(document, {
        section,
        fieldPath,
        after: companionPatch.after,
      });

      onApply(companionPatch.after);
      setIsApplied(true);
    } catch {
      setCompanionMessage(
        t("companion.patchRejected")
      );
      setMascotState("presenting");
    }
  }, [
    companionPatch,
    section,
    fieldPath,
    onApply,
    setCompanionMessage,
    setMascotState,
    t,
  ]);


  // ── Discard ──
  const handleDiscard = useCallback(() => {
    setAskMoreActive(false);
    setAskMoreText("");
    setOfferedIntakeGap(null);
    setCompanionExplanation(null);
    resetCompanion();
    useCompanionStore.getState().dismissActive();
    handoffFromAnchorFix();
    setActiveIntent(null);
  }, [resetCompanion]);

  // ── Loading state for analyze / smart-questions ──
  if (analyzeMutation.isPending || smartQuestionsMutation.isPending || explainMutation.isPending) {
    return (
      <div className="py-2">
        <ThinkingDots label={t("companion.analyzing")} />
      </div>
    );
  }

  // If no session is active for this field yet, wait for shell to handle idle state
  // But wait, the skill IS active if we are here.
  if (!isActiveField) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            {mascotState === "idle" && <Wand2 className="w-3.5 h-3.5 text-primary" />}
            {mascotState === "asking" && <MessageCircle className="w-3.5 h-3.5 text-primary" />}
            {mascotState === "thinking" && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
            {mascotState === "presenting" && <PenLine className="w-3.5 h-3.5 text-primary" />}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
            {mascotState === "idle" && t("companion.stateIdle")}
            {mascotState === "asking" && t("companion.stateAsking")}
            {mascotState === "thinking" && t("companion.stateThinking")}
            {mascotState === "presenting" && t("companion.statePresenting")}
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

      {/* ── STATE: IDLE (Action Chips) ── */}
      {mascotState === "idle" && !companionTurn && (
        <div className="space-y-3">
          <p className="text-[13px] font-medium text-[#2F3437] leading-relaxed">
            {t("companion.idlePrompt")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "analyze", label: t("companion.intent.analyze") },
              { id: "improve", label: t("companion.intent.improve") },
              { id: "evidence", label: t("companion.intent.evidence") },
              { id: "ats", label: t("companion.intent.ats") },
              { id: "shorten", label: t("companion.intent.shorten") },
              { id: "impact", label: t("companion.intent.impact") },
              { id: "explain", label: t("companion.intent.explain") },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => {
                  const rewriteIntent = {
                    improve: "improve",
                    shorten: "shorten",
                  }[chip.id] as Extract<RewriteIntent, "improve" | "shorten"> | undefined;
                  const questionIntent = {
                    evidence: "add_evidence",
                    ats: "make_ats_friendly",
                    impact: "turn_into_impact",
                  }[chip.id] as Exclude<QuestionIntent, "analyze"> | undefined;
                  if (chip.id === "analyze") {
                    handleSmartQuestions("analyze");
                  } else if (questionIntent) {
                    handleSmartQuestions(questionIntent);
                  } else if (chip.id === "explain") {
                    handleExplain();
                  } else if (rewriteIntent) {
                    fireDirectIntentRewrite(rewriteIntent);
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all bg-[#FBFBFA] text-[#2F3437] border-[#EAEAEA] hover:border-primary/20 hover:bg-primary/5"
              >
                {chip.label}
              </button>
            ))}
          </div>
          
          {/* Explanation Read-Only UI */}
          {companionExplanation && (
            <div className="mt-4 p-3 bg-[#FBFBFA] border border-[#EAEAEA] rounded-lg">
              <h4 className="text-xs font-semibold text-[#2F3437] mb-2">{t("companion.explanation.assessment")}</h4>
              <p className="text-xs text-[#2F3437] mb-3">{companionExplanation.message}</p>
              
              {companionExplanation.citedSignals.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <h4 className="text-[10px] w-full font-bold uppercase tracking-wider text-red-500 mb-1">{t("companion.explanation.weakSignals")}</h4>
                  {companionExplanation.citedSignals.map((s, idx) => (
                    <span key={idx} className="px-2 py-1 rounded bg-red-50 text-red-600 text-[11px] font-medium border border-red-100">
                      {t(`companion.signals.${s}`)}
                    </span>
                  ))}
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setCompanionExplanation(null)}
                className="w-full mt-3 h-7 text-[11px]"
              >
                {t("companion.explanation.back")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── STATE: ASKING (original chip questions) ── */}
      {mascotState === "asking" && !askMoreActive && companionTurn && companionTurn.questions.length > 0 && (
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
            {t("companion.send")}
          </Button>
        </div>
      )}

      {/* ── STATE: ASKING (intake coach offer) ── */}
      {mascotState === "asking" && offeredIntakeGap !== null && (
        <div className="space-y-3">
          <Button
            size="sm"
            onClick={() => {
              routeToIntakeCoach(offeredIntakeGap);
              setOfferedIntakeGap(null);
            }}
            className="w-full h-8 text-xs bg-primary hover:bg-primary/90 text-white gap-1.5"
          >
            {t("companion.deadEnd.tellStoryButton")}
          </Button>
        </div>
      )}

      {/* ── STATE: ASKING (user-initiated "Hỏi thêm để rõ hơn" — ONE free-text question) ── */}
      {mascotState === "asking" && askMoreActive && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-[#2F3437] leading-relaxed">
            {t("companion.askMorePrompt")}
          </p>
          <input
            type="text"
            autoFocus
            value={askMoreText}
            onChange={(e) => setAskMoreText(e.target.value)}
            maxLength={200}
            placeholder={t("companion.freeTextPlaceholder")}
            className="w-full px-3 py-2 text-xs border border-[#EAEAEA] rounded-lg bg-white focus:border-primary/40 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
          />
          <Button
            size="sm"
            onClick={handleSubmitAskMore}
            disabled={!askMoreText.trim() || rewriteMutation.isPending}
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-white gap-1.5"
          >
            <Send className="w-3 h-3" />
            {t("companion.send")}
          </Button>
        </div>
      )}

      {/* ── STATE: THINKING ── */}
      {mascotState === "thinking" && (
        <div className="space-y-2 py-2">
          <ThinkingDots label={t("companion.thinking")} />
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
          {isApplied && (
            <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.15)] mt-3">
              <p className="text-[#059669] text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                {t("builder.review.applySuccess")}
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => {
                    if (companionPatch) {
                      onApply(companionPatch.before);
                      setIsApplied(false);
                    }
                  }}
                  variant="outline"
                  className="flex-1 h-8 text-[11px] border-[#10B981] text-[#059669] hover:bg-[#D1FAE5]"
                >
                  {t("companion.undo")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    resetCompanion();
                    handoffFromAnchorFix();
                    useCompanionStore.getState().closeBubble();
                  }}
                  className="flex-1 h-8 text-[11px] bg-[#10B981] hover:bg-[#059669] text-white"
                >
                  {t("builder.review.close")}
                </Button>
              </div>
            </div>
          )}

          {!isApplied && companionPatch && (
            <>
              <DiffView
                before={companionPatch.before}
                after={companionPatch.after}
                why={companionPatch.why}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="h-8 text-xs bg-primary hover:bg-primary/90 text-white gap-1.5"
                >
                  <Check className="w-3 h-3" />
                  {t("companion.apply")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRewriteSofter}
                  disabled={rewriteMutation.isPending}
                  className="h-8 text-xs gap-1.5"
                >
                  <PenLine className="w-3 h-3" />
                  {t("companion.rewriteSofter")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAskMore}
                  disabled={rewriteMutation.isPending}
                  className="h-8 text-xs gap-1.5"
                >
                  <MessageCircle className="w-3 h-3" />
                  {t("companion.askMore")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDiscard}
                  className="h-8 text-xs text-[#787774] hover:text-[#2F3437]"
                >
                  {t("companion.discard")}
                </Button>
              </div>
            </>
          )}

          {/* Field already strong (questions: []) OR error message */}
          {!isApplied && !companionPatch && companionMessage && (
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
                  onClick={() => handleAnalyze()}
                  className="h-8 text-xs gap-1.5"
                >
                  <ArrowRight className="w-3 h-3" />
                  {t("companion.retry")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
