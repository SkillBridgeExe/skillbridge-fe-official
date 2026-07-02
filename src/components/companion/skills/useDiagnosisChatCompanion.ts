// ─── useDiagnosisChatCompanion ──────────────────────────────────────
// The calm corner advisor (owner decision 06-23). On the diagnosis Step 2 (CV
// Review) + Step 3 (Skill Gap Results) views, the dolphin sits idle at the home
// corner (bottom-right) and INVITES the user to chat — it never auto-jumps to a
// card or auto-pops an issue/commentary bubble (that auto-surfacing is gated off
// in useElementIssuesCompanion).
//
// This hook registers exactly ONE context `id="diagnosis:chat"` (priority 5, NO
// anchorId → corner fallback) ONCE on mount, and unregisters on unmount (so the
// dolphin disappears off the diagnosis tab — no site-wide dolphin). The turn
// carries a grounded opener (built from the REAL overall score band + a STATIC
// enum-keyed i18n template — no LLM, no fabrication), suggested-question chips,
// the live chat thread, and an onSend that calls the (separately-built) BE chat
// endpoint and degrades gracefully when it isn't there yet.
//
// ── Why register ONCE (anti-Clippy) ──────────────────────────────────
// `getTurn` reads the LATEST props from a ref (`propsRef`) that we refresh on
// every render. So the context stays fresh (new messages, swapped opener on a
// tab switch, the current onSend) WITHOUT re-registering or re-activating. If we
// re-ran the register+activate effect on every render (the old bug), the bubble
// would re-open after the user closed it — `closeBubble` doesn't set `dismissed`,
// so the next `activateContext` re-opens it (Clippy). Registering+activating only
// once on mount means a closed bubble STAYS closed.

import { useCallback, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { useCompanionStore } from "@/store/useCompanionStore";
import { askDiagnosisChat } from "@/services/diagnosis.service";
import { useChatThreadQuery, useDeleteChatThreadMutation, useGapReportQuery } from "@/hooks/use-diagnosis";
import { buildChatActionChips } from "./chat-action-chips";
import { getApiErrorCode } from "@/lib/api-error";
import type { CvReviewData, ProgressReportDto } from "@shared/api";
import type { DiagnosisChatFocus, DiagnosisChatTurn } from "@/types/companion";
import type { ChatActionChip } from "./chat-action-chips";

export const CHAT_CONTEXT_ID = "diagnosis:chat";

/** Trim the thread we send back as grounding context (recent turns, content only). */
const THREAD_LIMIT = 8;

/**
 * Reveal a cited card by anchor id. Step 2 passes a tab-aware reveal (switches to
 * the CV Audit tab when the `dim-*` anchor isn't mounted yet); Step 3 passes a
 * plain scroll. The hook calls this instead of scrolling directly so a cite that
 * lives on a different tab still lands.
 */
export type RevealCard = (anchorId: string) => void;

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

/** Is this axios/Api error the BE's daily-cap 429? Status preserved by the API client; errorCode as fallback. */
function isDailyLimitError(error: unknown): boolean {
  if (isAxiosError(error) && error.response?.status === 429) return true;
  // unwrapEnvelope re-throws an ApiError (loses status) but the client re-attaches
  // `status`; also accept the BE feature-usage code as a robust fallback.
  if (typeof error === "object" && error !== null && (error as { status?: number }).status === 429) {
    return true;
  }
  return getApiErrorCode(error) === "FEATURE_USAGE_LIMIT_REACHED";
}

/**
 * Mount on a diagnosis step to register the calm corner chat advisor.
 * @param reviewData  the loaded review (overall score + jdMatch for the chat target).
 * @param focus       the section the user is currently viewing (TAB-level). Drives the
 *                    focus-aware opener and is sent to the BE so it emphasizes that
 *                    section. Switching focus only swaps the opener text (via the props
 *                    ref, on the next bubble render) — same single `diagnosis:chat`
 *                    context, NO re-register / NO re-pop.
 * @param revealCard  scrolls (and, on Step 2, tab-switches) a cited card into view.
 * @param cvId        CV-only chat target. When there is no JD match id, the advisor
 *                    still works by posting to the CV-only route with this cvId. Pass
 *                    the diagnosis store's `lastCvId`. Step 3 can omit it (matchId works).
 * @param progress    optional progress report (GET .../progress). When it's a real
 *                    non-baseline report with at least one closed/improved transition,
 *                    a grounded "what did I improve" chip is prepended to the chip list
 *                    — real data only (baseline/empty → no chip, no fabrication).
 * @returns           `sendQuestion` so a caller (e.g. the ProgressBanner "explain" button)
 *                    can prefill + send a question through the same chat pipeline.
 */
export function useDiagnosisChatCompanion(
  reviewData: CvReviewData | null | undefined,
  focus: DiagnosisChatFocus,
  revealCard?: RevealCard,
  cvId?: string | null,
  progress?: ProgressReportDto | null,
): { sendQuestion: (question: string) => void } {
  const { t, i18n } = useTranslation("diagnosis");
  const language = i18n.language?.startsWith("vi") ? "vi" : "en";

  // Chat target: prefer the JD match id (gap-report grounded). When a JD has NOT been
  // compared, the CV-only route (cvId) is the fallback target so the advisor still works.
  const matchId = reviewData?.jdMatch?.matchId ?? null;
  const previousMatchIdRef = useRef<string | null | undefined>(undefined);

  // F4: same query key (matchId + lang) as GapReportCard/TailorChecklist already on
  // the page → this is a cache read, not an extra network call. Used to map a chat
  // answer's `cited_gap_id` to deep-link chips (view-gap / rewrite / roadmap).
  const gapReportQuery = useGapReportQuery(matchId, language);
  const chatThreadQuery = useChatThreadQuery(matchId);
  const deleteThreadMutation = useDeleteChatThreadMutation();

  const restoredMessages = (chatThreadQuery.data?.turns ?? []).map((turn) => ({
    role: turn.role,
    text: turn.text,
  }));
  const lastRestoredUserTopic =
    [...restoredMessages].reverse().find((msg) => msg.role === "user")?.text.trim().slice(0, 60) ?? null;

  // Opener: REAL score + STATIC focus-keyed template. null until reviewData is ready.
  const hasReview = typeof reviewData?.overallScore === "number";
  const score = reviewData?.overallScore ?? 0;
  const opener = lastRestoredUserTopic
    ? t("companion.chat.continuity", { topic: lastRestoredUserTopic })
    : hasReview
      ? t(openerKeyForFocus(focus, score), { score })
      : null;

  // Suggested-question chips. The base set is a static i18n array; when the real
  // scored dimensions are present we swap the generic first chip for a GROUNDED one
  // naming the WEAKEST dimension (lowest score20). Same anti-fab rule as the opener:
  // it only interpolates a REAL dimension label, never invents a topic — so the chips
  // vary per CV (different weakest dimension → different lead chip) without fabricating.
  // The base set is now FOCUS-AWARE (per-tab) so the chips match the section the user
  // is viewing (cv_audit / skills_analysis / market_careers / gap_results). For cv_audit
  // we still swap the first chip for a GROUNDED one naming the WEAKEST dimension (anti-fab:
  // only interpolates a REAL dimension label). Other focuses use the focus set verbatim.
  const baseSuggestions = t(`companion.chat.suggestionsByFocus.${focus}`, {
    returnObjects: true,
  }) as string[];
  const weakestDim = reviewData?.dimensions?.length
    ? reviewData.dimensions.reduce((lo, d) => (d.score20 < lo.score20 ? d : lo))
    : null;
  const focusSuggestions = focus === "cv_audit" && weakestDim
    ? [t("companion.chat.suggestDim", { dim: t(`review.dims.${weakestDim.key}`) }), ...baseSuggestions.slice(1)]
    : baseSuggestions;

  // Progress chip: prepend ONE grounded chip when there's a REAL non-baseline report
  // with at least one closed/improved transition since last scan. Anti-fab: never
  // shown for a baseline (nothing to compare) or a report with no closed/improved
  // transitions (nothing to celebrate) — real data only.
  const hasProgressToExplain = Boolean(
    progress && !progress.baseline &&
    progress.transitions.some((tr) => tr.kind === "closed" || tr.kind === "improved"),
  );
  const suggestions = hasProgressToExplain
    ? [t("companion.chat.progressChip"), ...focusSuggestions]
    : focusSuggestions;

  // ── Chat send → BE (built separately). useMutation per convention (mirrors
  //    useCompareJdMutation). Graceful: any failure (incl. 404/501 not-built-yet)
  //    flips the last assistant slot to an error row — never crashes. ──
  const chatMutation = useMutation({
    mutationFn: (vars: { question: string; thread: DiagnosisChatTurn[] }) => {
      if (!matchId && !cvId) {
        // Neither a JD match nor a CV id → no chat target server-side at all.
        // Reject → failLastAssistant → friendly "assistant being connected" row.
        return Promise.reject(new Error("NO_CHAT_TARGET"));
      }
      // The service picks the route: matchId → /cv-matches/:id/chat (gap-report
      // grounded); else cvId → /cvs/:cvId/diagnosis-chat (CV-only, review grounded).
      return askDiagnosisChat({
        matchId,
        cvId,
        question: vars.question,
        thread: vars.thread,
        focus,
        language,
      });
    },
  });

  // Latest props for getTurn — refreshed every render (at the end of the hook) so
  // the registered context reads fresh values WITHOUT re-registering (anti-Clippy).
  // Declared up here so the callbacks below can read propsRef.current.revealCard.
  const propsRef = useRef<{
    opener: string | null;
    suggestions: string[];
    onSend: (q: string) => void;
    onRetry: (index: number) => void;
    onDeleteThread: () => void;
    onAction: (chip: ChatActionChip) => void;
    onConfirmAction: () => void;
    onCancelAction: () => void;
    isPending: boolean;
    revealCard?: RevealCard;
  }>({
    opener,
    suggestions,
    onSend: () => {},
    onRetry: () => {},
    onDeleteThread: () => {},
    onAction: () => {},
    onConfirmAction: () => {},
    onCancelAction: () => {},
    isPending: false,
    revealCard,
  });

  // Jump to an anchor id (no-op-safe). revealCard handles the wrong-tab case for
  // `dim-*`/`gap-*` anchors; fall back to a direct scroll. Shared by the auto-reveal
  // after a cited answer (revealCited) and the F4 chip click (onJump).
  const jumpToAnchor = useCallback((anchorId: string) => {
    const reveal = propsRef.current.revealCard;
    if (reveal) reveal(anchorId);
    else if (typeof document !== "undefined") {
      document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Reveal a cited card after a successful answer (no-op-safe).
  const revealCited = useCallback(
    (res: { cited_dimension?: string; cited_gap_id?: string }) => {
      const anchorId = res.cited_dimension
        ? `dim-${res.cited_dimension}`
        : res.cited_gap_id
          ? `gap-${res.cited_gap_id}`
          : null;
      if (anchorId) jumpToAnchor(anchorId);
    },
    [jumpToAnchor],
  );

  /**
   * Send `question` and resolve/fail the assistant row at `assistantIndex`. Used by
   * both a fresh send (new pending row appended at the end) and a per-row retry
   * (the failed row flipped back to pending in place). Resolving BY INDEX means a
   * concurrent send appended later never clobbers the row this call owns.
   */
  const runChat = useCallback(
    (question: string, thread: DiagnosisChatTurn[], assistantIndex: number) => {
      chatMutation.mutate(
        { question, thread },
        {
          onSuccess: (res) => {
            // F4: map the cited gap → deep-link chips (honest-empty on a join miss).
            const actions = buildChatActionChips({
              citedGapId: res.cited_gap_id,
              gapItems: gapReportQuery.data?.gap_items,
              actions: gapReportQuery.data?.recommended_actions,
            });
            useCompanionStore.getState().resolveAssistantAt(assistantIndex, res.answer, actions);
            revealCited(res);
          },
          onError: (error) => {
            // Daily-cap 429 → distinct "limit reached" row with NO retry affordance.
            // Everything else keeps the friendly retryable error row.
            useCompanionStore
              .getState()
              .failAssistantAt(assistantIndex, isDailyLimitError(error) ? "limit" : "retry");
          },
        },
      );
    },
    [chatMutation, revealCited, gapReportQuery.data],
  );

  const onSend = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return;
      // Guard against a double-send race: ignore while a request is in flight.
      if (chatMutation.isPending) return;
      const store = useCompanionStore.getState();
      // Build the grounding thread from what's already on screen (before appending).
      const thread: DiagnosisChatTurn[] = store.chatMessages
        .filter((m) => !m.local && !m.pending && !m.error && m.text)
        .slice(-THREAD_LIMIT)
        .map((m) => ({ role: m.role, text: m.text }));
      store.appendChatMessage({ role: "user", text });
      store.setChatPending(text);
      // The pending placeholder is now the last message → its index.
      const assistantIndex = useCompanionStore.getState().chatMessages.length - 1;
      runChat(text, thread, assistantIndex);
    },
    // chatMutation drives the pending guard; runChat carries the send logic. onSend
    // identity changing per render no longer re-registers the context (register is
    // mount-only), so this is safe.
    [chatMutation, runChat],
  );

  /**
   * Per-row retry: heal the SPECIFIC failed row at `index` in place (back to pending,
   * keeping its owning question) and re-send THAT question — never append a duplicate
   * user bubble. The grounding thread is rebuilt from the turns BEFORE this row.
   */
  const onRetry = useCallback(
    (index: number) => {
      if (chatMutation.isPending) return;
      const store = useCompanionStore.getState();
      const question = store.retryAssistantAt(index);
      if (!question) return;
      const thread: DiagnosisChatTurn[] = store.chatMessages
        .slice(0, index)
        .filter((m) => !m.local && !m.pending && !m.error && m.text)
        .slice(-THREAD_LIMIT)
        .map((m) => ({ role: m.role, text: m.text }));
      runChat(question, thread, index);
    },
    [chatMutation, runChat],
  );

  const onDeleteThread = useCallback(() => {
    if (!matchId) {
      useCompanionStore.getState().clearChat();
      return;
    }
    deleteThreadMutation.mutate(matchId, {
      onSuccess: () => {
        useCompanionStore.getState().clearChat();
      },
    });
  }, [deleteThreadMutation, matchId]);

  const onAction = useCallback(
    (chip: ChatActionChip) => {
      if (chip.kind === "jump") {
        if (chip.anchorId) jumpToAnchor(chip.anchorId);
        return;
      }
      // rewrite/roadmap/prove_it/copy are explicit user actions. MF6 wires the
      // execution; MF3 only stores the pending intent and shows the confirm strip.
      useCompanionStore.getState().setChatPendingAction(chip);
    },
    [jumpToAnchor],
  );

  const onConfirmAction = useCallback(() => {
    // MF6 executes rewrite/roadmap/copy. Until then this is an explicit no-op that
    // closes the confirmation affordance rather than spending quota accidentally.
    useCompanionStore.getState().setChatPendingAction(null);
  }, []);

  const onCancelAction = useCallback(() => {
    useCompanionStore.getState().setChatPendingAction(null);
  }, []);

  // A different match is a different persisted mascot memory. Clear local chat so
  // the next seed cannot mix two CV/JD conversations.
  useEffect(() => {
    const previous = previousMatchIdRef.current;
    if (previous !== undefined && previous !== matchId) {
      useCompanionStore.getState().clearChat();
    }
    previousMatchIdRef.current = matchId;
  }, [matchId]);

  // Restore persisted turns once when the local thread is still empty. This keeps
  // a live user draft/chat intact if the query resolves late.
  useEffect(() => {
    if (restoredMessages.length === 0) return;
    const store = useCompanionStore.getState();
    if (store.chatMessages.length > 0) return;
    store.seedChatMessages(restoredMessages);
  }, [matchId, restoredMessages]);

  // Store-back the focus-aware opener + chips so CompanionShell (which subscribes to
  // chatOpener/chatSuggestions) REPAINTS on a tab switch. Without this, opener/chips flow
  // only through propsRef → getTurn(), which re-runs solely on a shell re-render — and a
  // tab switch does NOT re-render the shell, so the bubble showed stale content.
  useEffect(() => {
    useCompanionStore.getState().setChatDisplay({ opener, suggestions });
    // suggestions is a fresh array each render → join to a stable string dep. opener is
    // ALSO in the deps and always changes per focus, so a tab switch re-fires this even
    // if two focuses' chip arrays happened to join to the same string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opener, suggestions.join("")]);

  // Refresh the props ref every render so getTurn reads fresh values (new opener on
  // a tab switch, latest onSend/onRetry/isPending) WITHOUT re-registering the context.
  propsRef.current = {
    opener,
    suggestions,
    onSend,
    onRetry,
    onDeleteThread,
    onAction,
    onConfirmAction,
    onCancelAction,
    isPending: chatMutation.isPending,
    revealCard,
  };

  // ── Register + activate the corner advisor ONCE on mount; unregister on unmount. ──
  // getTurn reads propsRef.current (always fresh) + the live thread from the store,
  // so the turn stays current without re-running this effect. Registering+activating
  // only once means a bubble the user closed (closeBubble) STAYS closed.
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
          // Live-read the rest from the props ref so opener/onSend/onRetry/isPending
          // stay fresh across tab switches and in-flight sends — WITHOUT re-registering.
          opener: propsRef.current.opener,
          suggestions: propsRef.current.suggestions,
          onSend: propsRef.current.onSend,
          onRetry: propsRef.current.onRetry,
          onDeleteThread: propsRef.current.onDeleteThread,
          onAction: propsRef.current.onAction,
          onConfirmAction: propsRef.current.onConfirmAction,
          onCancelAction: propsRef.current.onCancelAction,
          isPending: propsRef.current.isPending,
        },
      }),
    });
    // Activate ONCE so the inviting opener bubble appears (auto-open-once honored by
    // the store's dismiss memory); the dolphin click-to-open works thereafter.
    store.activateContext(CHAT_CONTEXT_ID);

    return () => {
      const s = useCompanionStore.getState();
      s.unregisterContext(CHAT_CONTEXT_ID);
      s.clearChat();
    };
    // Mount-only: NEVER re-run (re-running would re-pop a closed bubble = Clippy).
    // All referenced values (store getState, propsRef) are stable, so [] is correct.
  }, []);

  return { sendQuestion: onSend };
}
