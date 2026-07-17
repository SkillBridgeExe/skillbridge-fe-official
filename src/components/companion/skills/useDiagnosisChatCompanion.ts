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
import { useToast } from "@/hooks/use-toast";
import { isChatBusy, useCompanionStore } from "@/store/useCompanionStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { askDiagnosisChat, loadMatchForChat } from "@/services/diagnosis.service";
import { useChatThreadQuery, useDeleteChatThreadMutation, useGapReportQuery } from "@/hooks/use-diagnosis";
import { buildChatActionChips } from "./chat-action-chips";
import { getApiErrorCode } from "@/lib/api-error";
import type { CvReviewData, EvidenceItem, ProgressReportDto } from "@shared/api";
import type { DiagnosisChatFocus } from "@/types/companion";
import type { ChatActionChip } from "./chat-action-chips";
import { OPEN_ROADMAP_WIZARD_EVENT, OPEN_TAILOR_REWRITE_EVENT } from "./chat-action-events";
import { resolveDiagnosisFixAnchor } from "./diagnosis-fix-anchor";

export const CHAT_CONTEXT_ID = "diagnosis:chat";

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

function isExperiencePatchField(field: string): field is "description" | "responsibilities" | "achievements" {
  return field === "description" || field === "responsibilities" || field === "achievements";
}

function isProjectPatchField(field: string): field is "description" | "contribution" | "result" {
  return field === "description" || field === "contribution" || field === "result";
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
  proveIt?: EvidenceItem | null,
): { sendQuestion: (question: string) => void } {
  const { t, i18n } = useTranslation("diagnosis");
  const { toast } = useToast();
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
  const proveItChip = proveIt
    ? t("companion.chat.proveitChip", { skill: proveIt.display_name })
    : null;
  const suggestions = [
    ...(hasProgressToExplain ? [t("companion.chat.progressChip")] : []),
    ...(proveItChip ? [proveItChip] : []),
    ...focusSuggestions,
  ];

  // ── Chat send → BE (built separately). useMutation per convention (mirrors
  //    useCompareJdMutation). Graceful: any failure (incl. 404/501 not-built-yet)
  //    flips the last assistant slot to an error row — never crashes. ──
  const chatMutation = useMutation({
    mutationFn: (vars: { question: string }) => {
      if (!matchId && !cvId) {
        // Neither a JD match nor a CV id → no chat target server-side at all.
        // Reject → failLastAssistant → friendly "assistant being connected" row.
        return Promise.reject(new Error("NO_CHAT_TARGET"));
      }
      // The service picks the route: matchId → /cv-matches/:id/chat (gap-report
      // grounded); else cvId → /cvs/:cvId/diagnosis-chat (CV-only, review grounded).
      // No thread payload — the BE grounds on its own persisted history.
      return askDiagnosisChat({
        matchId,
        cvId,
        question: vars.question,
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
    onSuggestionTap: (q: string) => void;
    onRetry: (index: number) => void;
    onDeleteThread: () => void;
    onAction: (chip: ChatActionChip) => void;
    onConfirmAction: () => void;
    onCancelAction: () => void;
    revealCard?: RevealCard;
  }>({
    opener,
    suggestions,
    onSend: () => {},
    onSuggestionTap: () => {},
    onRetry: () => {},
    onDeleteThread: () => {},
    onAction: () => {},
    onConfirmAction: () => {},
    onCancelAction: () => {},
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
    (question: string, assistantIndex: number) => {
      // Thread identity at send time. matchId can change while this hook stays
      // mounted (a re-compare from the page) — the match-change effect clears +
      // reseeds the thread, and resolving `assistantIndex` after that would write
      // the OLD match's answer over a row of the new match's thread.
      const chatEpoch = useCompanionStore.getState().chatEpoch;
      chatMutation.mutate(
        { question },
        {
          onSuccess: (res) => {
            if (useCompanionStore.getState().chatEpoch !== chatEpoch) return; // stale thread — drop
            // Wave 1: the gate verdict drives the mascot pose (refusal → sheepish,
            // grounded → confident). Nullish for BEs that don't send answer_kind yet.
            useCompanionStore.getState().setChatAnswerTone(res.answer_kind ?? null);
            // F4: map the cited gap/match → deep-link chips (honest-empty on a join miss
            // or when the answer didn't cite anything).
            const actions = buildChatActionChips({
              citedGapId: res.cited_gap_id,
              citedMatch: res.cited_match,
              gapItems: gapReportQuery.data?.gap_items,
              actions: gapReportQuery.data?.recommended_actions,
            });
            useCompanionStore.getState().resolveAssistantAt(assistantIndex, res.answer, {
              actions,
              citedTool: res.cited_tool,
              suggestedNextStep: res.suggested_next_step ?? undefined,
              // Wave 2: per-row provenance + verdict for the "Dựa trên N dữ kiện" row.
              groundedFacts: res.grounded_facts,
              answerKind: res.answer_kind,
            });
            revealCited(res);
          },
          onError: (error) => {
            if (useCompanionStore.getState().chatEpoch !== chatEpoch) return; // stale thread — drop
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
      // Guard against a double-send race — read LIVE store state, never a closed-over
      // mutation flag. CompanionShell hands this callback out from a propsRef written on
      // the host's PREVIOUS render, so a closed-over isPending gets captured as
      // permanently-true once a turn settles and every later send dies silently.
      const store = useCompanionStore.getState();
      if (isChatBusy(store)) return;
      store.appendChatMessage({ role: "user", text });
      store.setChatPending(text);
      // A new turn has no verdict yet — the busy state carries the pose until resolve.
      store.setChatAnswerTone(null);
      // The pending placeholder is now the last message → its index.
      const assistantIndex = useCompanionStore.getState().chatMessages.length - 1;
      runChat(text, assistantIndex);
    },
    // runChat carries the send logic; the busy guard reads the store live, so this
    // callback deliberately closes over NO render-scoped pending flag.
    [runChat],
  );

  /**
   * Per-row retry: heal the SPECIFIC failed row at `index` in place (back to pending,
   * keeping its owning question) and re-send THAT question — never append a duplicate
   * user bubble.
   */
  const onRetry = useCallback(
    (index: number) => {
      // Same live-state guard as onSend (this callback is handed out the same stale way).
      const store = useCompanionStore.getState();
      if (isChatBusy(store)) return;
      const question = store.retryAssistantAt(index);
      if (!question) return;
      // A retry is a new in-flight turn — the previous verdict resets, same as onSend.
      store.setChatAnswerTone(null);
      runChat(question, index);
    },
    [runChat],
  );

  const onSuggestionTap = useCallback(
    (question: string) => {
      if (proveItChip && proveIt && question === proveItChip) {
        const store = useCompanionStore.getState();
        store.appendChatMessage({ role: "user", text: question, local: true });
        store.appendChatMessage({
          role: "assistant",
          local: true,
          text: t("companion.chat.proveitIntro", { skill: proveIt.display_name }),
          actions: [
            {
              kind: "prove_it",
              labelKey: "companion.chat.proveitCta",
              proveIt: { canonical: proveIt.skill_canonical, displayName: proveIt.display_name },
            },
          ],
        });
        return;
      }
      onSend(question);
    },
    [onSend, proveIt, proveItChip, t],
  );

  const onDeleteThread = useCallback(() => {
    useCompanionStore.getState().clearChat();
    if (!matchId) {
      return;
    }
    deleteThreadMutation.mutate(matchId);
  }, [deleteThreadMutation, matchId]);

  const onAction = useCallback(
    (chip: ChatActionChip) => {
      if (chip.kind === "jump") {
        if (chip.anchorId) jumpToAnchor(chip.anchorId);
        return;
      }
      if (chip.kind === "prove_it" && chip.proveIt) {
        useCompanionStore.getState().setChatPendingAction(null);
        const draftId = useCvBuilderStore.getState().draftId;

        if (!draftId) {
          useCvBuilderStore.getState().setPendingProveIt(chip.proveIt);
          useCvBuilderStore.getState().setActiveSection(4);
          useDiagnosisStore.getState().setStep("builder");
          return;
        }

        const doc = useCvBuilderStore.getState().getResumeDocumentV1();
        
        const anchor = resolveDiagnosisFixAnchor({
          document: doc,
          skill: chip.proveIt,
          evidenceText: chip.proveIt.evidenceText,
        });

        useDiagnosisStore.getState().setStep("builder");

        if (anchor.ok) {
          const sectionIdx = anchor.section === "summary" ? 2 : anchor.section === "projects" ? 5 : 4;
          useCvBuilderStore.getState().setActiveSection(sectionIdx);
          
          useCompanionStore.getState().registerContext({
            id: "diagnosis_anchor_fix",
            getTurn: () => ({
              skill: "cv_builder",
              props: {
                draftId,
                fieldPath: anchor.fieldPath,
                section: anchor.section,
                currentValue: anchor.currentValue,
                onApply: (after: string) => {
                  const store = useCvBuilderStore.getState();
                  if (anchor.section === "summary") {
                    store.setSummary(after);
                    store.clearSectionEvaluation("summary");
                    return;
                  }

                  if (anchor.section === "experience") {
                    const match = anchor.fieldPath.match(/^\/sections\/experience\/items\/([^/]+)\/([^/]+)$/);
                    if (match && isExperiencePatchField(match[2])) {
                      store.updateExperience(match[1], match[2], after);
                      store.clearSectionEvaluation("experience");
                    }
                    return;
                  }

                  const match = anchor.fieldPath.match(/^\/sections\/projects\/items\/([^/]+)\/([^/]+)$/);
                  if (match && isProjectPatchField(match[2])) {
                    store.updateProject(match[1], match[2], after);
                    store.clearSectionEvaluation("projects");
                  }
                },
              },
            }),
          });
          useCompanionStore.getState().activateContext("diagnosis_anchor_fix");
          useCompanionStore.setState({ bubbleOpen: true });
        } else {
          useCvBuilderStore.getState().setActiveSection(4);
          const msg = t("companion.chat.proveitNoAnchor");
          useCompanionStore.getState().appendChatMessage({ role: "assistant", local: true, text: msg });
          useCompanionStore.setState({ bubbleOpen: true });
        }
        return;
      }
      // rewrite/roadmap/copy/view_match are explicit user actions. MF6 wires the
      // execution; MF3 only stores the pending intent and shows the confirm strip.
      useCompanionStore.getState().setChatPendingAction(chip);
    },
    [jumpToAnchor, t],
  );

  const onConfirmAction = useCallback(() => {
    const pending = useCompanionStore.getState().chatPendingAction;
    if (!pending) return;

    const runAfterResultsMount = (run: () => void) => {
      useDiagnosisStore.getState().setStep("results");
      window.setTimeout(run, 0);
    };

    if (pending.kind === "rewrite") {
      const actionId = pending.rewrite?.action.action_id;
      if (actionId) {
        runAfterResultsMount(() => {
          jumpToAnchor(`tailor-${actionId}`);
          window.dispatchEvent(
            new CustomEvent(OPEN_TAILOR_REWRITE_EVENT, { detail: { actionId } }),
          );
        });
      }
    } else if (pending.kind === "roadmap") {
      runAfterResultsMount(() => {
        jumpToAnchor("roadmap-anchor");
        window.dispatchEvent(new CustomEvent(OPEN_ROADMAP_WIZARD_EVENT));
      });
    } else if (pending.kind === "copy" && pending.copyText && navigator.clipboard) {
      void navigator.clipboard.writeText(pending.copyText);
    } else if (pending.kind === "view_match" && pending.viewMatch) {
      // Guard a duplicate confirm while a previous view_match load is still in
      // flight (e.g. the user re-taps the chip and confirms again before the
      // first fetch settles) — skip the whole function so chatPendingAction
      // (the re-armed chip) stays visible/untouched instead of being cleared below.
      if (useCompanionStore.getState().chatActionPending) return;
      useCompanionStore.getState().setChatActionPending(true);
      // Cross-JD deep-link: load the cited match's OWN cv + review in place, then
      // switch to it — a different match_id (effect above) clears the local chat.
      const { cvId, matchId } = pending.viewMatch;
      loadMatchForChat({ cvId, matchId })
        .then((outcome) => {
          useDiagnosisStore.getState().setLastCvId(outcome.cvId);
          useDiagnosisStore.getState().setReviewData(outcome.review);
          useDiagnosisStore.getState().setStep("results");
        })
        // The only confirm-gated action with a real network call — never swallow
        // the failure (repo doctrine "không nuốt lỗi", PR#49). Current view stays
        // intact (no store mutation); the user just sees why nothing happened.
        .catch(() => {
          toast({ title: t("companion.chat.viewMatchError"), variant: "destructive" });
        })
        .finally(() => {
          useCompanionStore.getState().setChatActionPending(false);
        });
    }

    useCompanionStore.getState().setChatPendingAction(null);
  }, [jumpToAnchor, t, toast]);

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
  // a tab switch, latest onSend/onRetry) WITHOUT re-registering the context.
  // NOTE: no isPending here — CompanionShell derives the pending flag from the
  // store's chat thread (chatPending), never from this turn's props.
  propsRef.current = {
    opener,
    suggestions,
    onSend,
    onSuggestionTap,
    onRetry,
    onDeleteThread,
    onAction,
    onConfirmAction,
    onCancelAction,
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
      suppressAutoOpen: true,
      // NO anchorId → the dolphin sits at the corner fallback (calm, persistent).
      getTurn: () => ({
        skill: "diagnosis_chat",
        props: {
          // Live-read the thread at render time (same getState() pattern as
          // useElementIssuesCompanion) so new messages appear without re-register.
          messages: useCompanionStore.getState().chatMessages,
          // Live-read the rest from the props ref so opener/onSend/onRetry
          // stay fresh across tab switches and in-flight sends — WITHOUT re-registering.
          opener: propsRef.current.opener,
          suggestions: propsRef.current.suggestions,
          onSend: propsRef.current.onSend,
          onSuggestionTap: propsRef.current.onSuggestionTap,
          onRetry: propsRef.current.onRetry,
          onDeleteThread: propsRef.current.onDeleteThread,
          onAction: propsRef.current.onAction,
          onConfirmAction: propsRef.current.onConfirmAction,
          onCancelAction: propsRef.current.onCancelAction,
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
