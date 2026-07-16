// ─── useLearningChatCompanion ───────────────────────────────────────
// Task M3: the mascot's corner-advisor chat on a Learning session page. Mirrors
// useDiagnosisChatCompanion's anti-Clippy shape exactly (register ONCE on mount,
// getTurn reads propsRef refreshed every render, store-back opener/suggestions so
// CompanionShell repaints) — see that file's header comment for the full rationale.
//
// FE-only: reuses the EXISTING learning chat endpoint (sendLearningChatMessage /
// getLearningChatHistory, already used by AIChatbot + AIChatPanel) — no new BE
// route. Continuity: the SAME localStorage conversationId key scheme AIChatPanel
// uses (`skillbridge_chat_conv_id_${sessionId}`) so the mascot and the old
// session panel share one server-side thread instead of forking it.
//
// Simpler than the diagnosis hook in two ways:
//  - No react-query `useMutation` — sendLearningChatMessage is called directly
//    (mirrors how AIChatbot/AIChatPanel already call it), so this hook has no
//    QueryClientProvider dependency. "Pending" is derived from the shared store's
//    chatMessages (a pending assistant row) — same as how CompanionShell already
//    computes `chatPending` for the diagnosis chat skill — so no separate
//    isPending bookkeeping is needed here either.
//  - No gap/action citation chips — the learning chat answer has no gap_id to
//    join against, so there is nothing honest to deep-link to.

import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { useCompanionStore } from "@/store/useCompanionStore";
import { sendLearningChatMessage, getLearningChatHistory } from "@/services/learning-roadmap.service";
import { getApiErrorCode } from "@/lib/api-error";

export const LEARNING_CHAT_CONTEXT_ID = "learning:chat";

function storageKey(sessionId: string): string {
  return `skillbridge_chat_conv_id_${sessionId}`;
}

/** Is this axios/Api error the BE's daily-cap 429? Mirrors the diagnosis hook's check. */
function isDailyLimitError(error: unknown): boolean {
  if (isAxiosError(error) && error.response?.status === 429) return true;
  if (typeof error === "object" && error !== null && (error as { status?: number }).status === 429) {
    return true;
  }
  return getApiErrorCode(error) === "FEATURE_USAGE_LIMIT_REACHED";
}

/** Is there already an in-flight assistant row? Same double-send guard as the diagnosis hook. */
function hasPendingAssistant(): boolean {
  return useCompanionStore
    .getState()
    .chatMessages.some((m) => m.role === "assistant" && !!m.pending);
}

/**
 * Mount on a learning session page to register the corner-advisor chat.
 * @param sessionId        the session being viewed — scopes the persisted conversationId
 *                          (same key scheme as AIChatPanel) and the BE `session_id` field.
 * @param sessionTitle     REAL session title interpolated into the static opener template.
 * @param skillCanonical   forwarded as `skill_canonical` (mirrors AIChatPanel).
 */
export function useLearningChatCompanion(
  sessionId: string,
  sessionTitle: string,
  skillCanonical: string,
): { sendQuestion: (question: string) => void } {
  const { t, i18n } = useTranslation("diagnosis");
  const language = i18n.language?.startsWith("vi") ? "vi" : "en";

  const opener = t("companion.learningChat.opener", { session: sessionTitle });
  const suggestions = t("companion.learningChat.suggestions", { returnObjects: true }) as string[];

  // Client-tracked conversation id (BE-issued, persisted per session — same scheme
  // AIChatPanel already uses). Not store state: it doesn't drive any render.
  const conversationIdRef = useRef<string | undefined>(undefined);
  const previousSessionIdRef = useRef<string | undefined>(undefined);

  // A different session is a different persisted mascot memory. Clear local chat so
  // switching sessions (without a remount — /learning/session/:id reuses the page
  // instance across next/prev navigation) never mixes two sessions' threads.
  useEffect(() => {
    const previous = previousSessionIdRef.current;
    if (previous !== undefined && previous !== sessionId) {
      useCompanionStore.getState().clearChat();
    }
    previousSessionIdRef.current = sessionId;
  }, [sessionId]);

  // Restore the persisted thread for THIS session (client-tracked conversationId →
  // BE history), same mechanism as AIChatPanel. Only seeds if the local thread is
  // still empty, so a live draft is never clobbered by a late-resolving fetch.
  useEffect(() => {
    const savedId = localStorage.getItem(storageKey(sessionId));
    conversationIdRef.current = savedId ?? undefined;
    if (!savedId) return;
    let cancelled = false;
    getLearningChatHistory(savedId)
      .then((res) => {
        if (cancelled || !res.history?.length) return;
        const store = useCompanionStore.getState();
        if (store.chatMessages.length > 0) return;
        store.seedChatMessages(
          res.history.map((m) => ({ role: m.role, text: m.text || m.message || "" })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const runChat = useCallback(
    (question: string, assistantIndex: number) => {
      // Thread identity at send time. If the user swaps sessions mid-flight (the page
      // instance is reused, so the hook never unmounts) the session-change effect
      // clears + reseeds the thread — resolving `assistantIndex` then would write
      // THIS session's answer over a row of the OTHER session's thread.
      const chatEpoch = useCompanionStore.getState().chatEpoch;
      sendLearningChatMessage({
        message: question,
        conversationId: conversationIdRef.current,
        language,
        session_id: sessionId,
        skill_canonical: skillCanonical,
      })
        .then((res) => {
          // Keyed to the session this question was SENT to — correct even if the
          // user has navigated away, so the BE thread is not forked on return.
          localStorage.setItem(storageKey(sessionId), res.conversationId);
          if (useCompanionStore.getState().chatEpoch !== chatEpoch) return; // stale thread — drop
          conversationIdRef.current = res.conversationId;
          useCompanionStore.getState().resolveAssistantAt(assistantIndex, res.message);
        })
        .catch((error) => {
          if (useCompanionStore.getState().chatEpoch !== chatEpoch) return; // stale thread — drop
          // Daily-cap 429 → distinct "limit reached" row with NO retry; everything
          // else keeps the friendly retryable error row (mirrors the diagnosis hook).
          useCompanionStore
            .getState()
            .failAssistantAt(assistantIndex, isDailyLimitError(error) ? "limit" : "retry");
        });
    },
    [language, sessionId, skillCanonical],
  );

  const onSend = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return;
      if (hasPendingAssistant()) return; // double-send guard
      const store = useCompanionStore.getState();
      store.appendChatMessage({ role: "user", text });
      store.setChatPending(text);
      const assistantIndex = useCompanionStore.getState().chatMessages.length - 1;
      runChat(text, assistantIndex);
    },
    [runChat],
  );

  const onRetry = useCallback(
    (index: number) => {
      if (hasPendingAssistant()) return;
      const store = useCompanionStore.getState();
      const question = store.retryAssistantAt(index);
      if (!question) return;
      runChat(question, index);
    },
    [runChat],
  );

  // Latest props for getTurn — refreshed every render (anti-Clippy: the registered
  // context stays fresh WITHOUT re-registering / re-activating).
  const propsRef = useRef<{ onSend: (q: string) => void; onRetry: (index: number) => void }>({
    onSend: () => {},
    onRetry: () => {},
  });
  propsRef.current = { onSend, onRetry };

  // Store-back the opener + chips so CompanionShell (which subscribes to
  // chatOpener/chatSuggestions) repaints — same reason as the diagnosis hook: a
  // session switch (no remount) does NOT re-render the shell on its own.
  useEffect(() => {
    useCompanionStore.getState().setChatDisplay({ opener, suggestions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opener, suggestions.join("")]);

  // ── Register + activate the corner advisor ONCE on mount; unregister on unmount. ──
  useEffect(() => {
    const store = useCompanionStore.getState();
    store.registerContext({
      id: LEARNING_CHAT_CONTEXT_ID,
      priority: 5,
      // NO anchorId → the dolphin sits at the corner fallback.
      getTurn: () => ({
        skill: "learning_chat",
        props: {
          onSend: propsRef.current.onSend,
          onRetry: propsRef.current.onRetry,
        },
      }),
    });
    store.activateContext(LEARNING_CHAT_CONTEXT_ID);

    return () => {
      const s = useCompanionStore.getState();
      s.unregisterContext(LEARNING_CHAT_CONTEXT_ID);
      s.clearChat();
    };
    // Mount-only: NEVER re-run (re-running would re-pop a closed bubble = Clippy).
  }, []);

  return { sendQuestion: onSend };
}
