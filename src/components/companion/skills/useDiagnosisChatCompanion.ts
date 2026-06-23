// ─── useDiagnosisChatCompanion ──────────────────────────────────────
// The calm corner advisor (owner decision 06-23). On the diagnosis Step 2 (CV
// Review) + Step 3 (Skill Gap Results) views, the dolphin sits idle at the home
// corner (bottom-right) and INVITES the user to chat — it never auto-jumps to a
// card or auto-pops an issue/commentary bubble (that auto-surfacing is gated off
// in useElementIssuesCompanion).
//
// This hook registers exactly ONE context `id="diagnosis:chat"` (priority 5, NO
// anchorId → corner fallback) WHILE MOUNTED, and unregisters on unmount (so the
// dolphin disappears off the diagnosis tab — no site-wide dolphin). The turn
// carries a grounded opener (built from the REAL overall score band + a STATIC
// enum-keyed i18n template — no LLM, no fabrication), suggested-question chips,
// the live chat thread, and an onSend that calls the (separately-built) BE chat
// endpoint and degrades gracefully when it isn't there yet.

import { useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useCompanionStore } from "@/store/useCompanionStore";
import { askDiagnosisChat } from "@/services/diagnosis.service";
import type { CvReviewData } from "@shared/api";
import type { DiagnosisChatFocus, DiagnosisChatTurn } from "@/types/companion";

export const CHAT_CONTEXT_ID = "diagnosis:chat";

/** Trim the thread we send back as grounding context (recent turns, content only). */
const THREAD_LIMIT = 8;

/**
 * Score → opener band key. Mirrors DiagnosisStep2Review's `scoreMessage` thresholds
 * EXACTLY (70 / 55 / 40) so the verb matches what the hero already says. The opener
 * sentence itself is a STATIC i18n template that only interpolates the REAL score.
 */
export function openerBandKey(score: number): "excellent" | "good" | "fair" | "low" {
  if (score >= 70) return "excellent";
  if (score >= 55) return "good";
  if (score >= 40) return "fair";
  return "low";
}

/**
 * Pick the focus-aware opener i18n key. Only `cv_audit` keys further by the REAL
 * overall-score band (so the verb still matches what the hero says); the other
 * sections use a flat per-focus opener. ALL openers are STATIC enum-keyed templates
 * — the only dynamic value is the REAL `{{score}}` interpolation. NO LLM, NO fabrication.
 */
function openerKeyForFocus(focus: DiagnosisChatFocus, score: number): string {
  if (focus === "cv_audit") {
    return `companion.chat.opener.cv_audit.${openerBandKey(score)}`;
  }
  return `companion.chat.opener.${focus}`;
}

/**
 * Mount on a diagnosis step to register the calm corner chat advisor.
 * @param reviewData  the loaded review (overall score + jdMatch for the chat target).
 * @param focus       the section the user is currently viewing (TAB-level). Drives the
 *                    focus-aware opener and is sent to the BE so it emphasizes that
 *                    section. Switching focus only swaps the opener text — same single
 *                    `diagnosis:chat` context, no aggressive re-pop.
 */
export function useDiagnosisChatCompanion(
  reviewData: CvReviewData | null | undefined,
  focus: DiagnosisChatFocus,
): void {
  const { t, i18n } = useTranslation("diagnosis");
  const language = i18n.language?.startsWith("vi") ? "vi" : "en";

  // matchId source: the JD match id when a JD has been compared; else CV-only fallback.
  const matchId = reviewData?.jdMatch?.matchId ?? null;

  // Opener: REAL score + STATIC focus-keyed template. null until reviewData is ready.
  const hasReview = typeof reviewData?.overallScore === "number";
  const score = reviewData?.overallScore ?? 0;
  const opener = hasReview
    ? t(openerKeyForFocus(focus, score), { score })
    : null;

  // Suggested-question chips (static seed; i18n array).
  const suggestions = t("companion.chat.suggestions", { returnObjects: true }) as string[];

  // ── Chat send → BE (built separately). useMutation per convention (mirrors
  //    useCompareJdMutation). Graceful: any failure (incl. 404/501 not-built-yet)
  //    flips the last assistant slot to an error row — never crashes. ──
  const chatMutation = useMutation({
    mutationFn: (vars: { question: string; thread: DiagnosisChatTurn[] }) => {
      if (!matchId) {
        // No match id (CV-only, no compared JD yet) → no chat target server-side.
        // Reject → failLastAssistant → friendly "assistant being connected" row.
        return Promise.reject(new Error("NO_CHAT_TARGET"));
      }
      return askDiagnosisChat({
        matchId,
        question: vars.question,
        thread: vars.thread,
        focus,
        language,
      });
    },
  });

  const onSend = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return;
      const store = useCompanionStore.getState();
      // Build the grounding thread from what's already on screen (before appending).
      const thread: DiagnosisChatTurn[] = store.chatMessages
        .filter((m) => !m.pending && !m.error && m.text)
        .slice(-THREAD_LIMIT)
        .map((m) => ({ role: m.role, text: m.text }));
      store.appendChatMessage({ role: "user", text });
      store.setChatPending();

      chatMutation.mutate(
        { question: text, thread },
        {
          onSuccess: (res) => {
            useCompanionStore.getState().resolveLastAssistant(res.answer);
            // If the answer cites a card, swim the user's eye there (no auto-jump of
            // the dolphin — just a gentle scroll of the page to the cited card).
            if (typeof document !== "undefined") {
              const el = res.cited_dimension
                ? document.getElementById(`dim-${res.cited_dimension}`)
                : res.cited_gap_id
                  ? document.getElementById(`gap-${res.cited_gap_id}`)
                  : null;
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          },
          onError: () => {
            useCompanionStore.getState().failLastAssistant();
          },
        },
      );
    },
    [chatMutation],
  );

  // ── Register the corner advisor while mounted; unregister on unmount. ──
  // Re-register on opener/suggestions/handler change so the turn reads fresh values.
  useEffect(() => {
    const store = useCompanionStore.getState();
    store.registerContext({
      id: CHAT_CONTEXT_ID,
      priority: 5,
      // NO anchorId → the dolphin sits at the corner fallback (calm, persistent).
      getTurn: () => ({
        skill: "diagnosis_chat",
        props: {
          // Live-read the thread at render time (same getState() pattern as
          // useElementIssuesCompanion) so new messages appear without re-register.
          messages: useCompanionStore.getState().chatMessages,
          opener,
          suggestions,
          onSend,
        },
      }),
    });
    // Activate so the inviting opener bubble appears once (auto-open-once honored by
    // the store's dismiss memory); the dolphin click-to-open works thereafter.
    store.activateContext(CHAT_CONTEXT_ID);

    return () => {
      const s = useCompanionStore.getState();
      s.unregisterContext(CHAT_CONTEXT_ID);
      s.clearChat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opener, onSend]);
}
