// ─── useCvBuilderChatCompanion ──────────────────────────────────────
// Slice 5: the mascot's corner-advisor chat on the CV builder page. Mirrors
// useLearningChatCompanion's anti-Clippy shape exactly (register ONCE on mount,
// getTurn reads propsRef refreshed every render, store-back opener/suggestions so
// CompanionShell repaints) — see that file's header comment for the full rationale.
//
// Wires to the merged BE endpoint: POST /api/cvs/:cvId/builder/chat.
// Restores thread via GET, clears via DELETE.
// Sends focused_field (the field the user is currently editing) read from the
// live useCvBuilderStore state (NOT the stale autosaved version).
// Maps proposed_edit to an Apply chip that writes into the draft via the shipped
// patch machine (buildCvBuilderPatchProposal).
// Maps grounded_facts and known_state to the store-backed provenance/memory.
//
// clearChat on unmount — single global chat thread, MANDATORY or the thread leaks.
// Keep the register-once / propsRef discipline: read isChatBusy LIVE from the
// store via getState, never closed over.

import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCompanionStore, isChatBusy } from "@/store/useCompanionStore";
import {
  postBuilderChatApi,
  getBuilderChatThreadApi,
  deleteBuilderChatThreadApi,
  isDailyLimitError,
  type CvBuilderChatResponse,
  type CvBuilderChatProposedEdit,
} from "@/services/cv-builder-chat.service";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import type { WorkExperience, Project } from "@/store/useCvBuilderStore";
import type { ChatActionChip } from "@/components/companion/skills/chat-action-chips";
import type { GroundedFact, ChatKnownState } from "@/types/companion";

export const CV_BUILDER_CHAT_CONTEXT_ID = "cvbuilder:chat";

// ── Helpers ─────────────────────────────────────────────────────────

/** Is there already an in-flight assistant row? Same double-send guard as the diagnosis hook. */
function hasPendingAssistant(): boolean {
  return isChatBusy(useCompanionStore.getState());
}

/**
 * Derive the section prefix from a BE field_path.
 * e.g. "cvbuilder:projects[0].description" → "projects"
 *      "experience[1].achievements"       → "experience"
 *      "summary"                          → "summary"
 */
function sectionFromFieldPath(fieldPath: string): "projects" | "experience" | "summary" | null {
  const stripped = fieldPath.startsWith("cvbuilder:")
    ? fieldPath.slice("cvbuilder:".length)
    : fieldPath;
  const prefix = stripped.split(/[.[]/)[0];
  if (prefix === "projects") return "projects";
  if (prefix === "experience") return "experience";
  if (prefix === "summary") return "summary";
  return null;
}

/** Map BE grounded_facts to the store's GroundedFact shape. */
function mapGroundedFacts(
  facts: CvBuilderChatResponse["grounded_facts"],
): GroundedFact[] | undefined {
  if (!facts || facts.length === 0) return undefined;
  // The builder page has no dim/gap jump anchors, so every fact renders as a plain
  // non-clickable info span ("conversation") — a clickable chip whose jump the builder
  // ignores is a dead affordance.
  return facts.map((f) => ({
    kind: "conversation" as const,
    id: f.field_path ?? f.text.slice(0, 40),
    label: f.text,
  }));
}

/** Map BE known_state to the store's ChatKnownState shape. */
function mapKnownState(
  ks: CvBuilderChatResponse["known_state"],
): ChatKnownState | null {
  if (!ks) return null;
  return {
    target_role: ks.target_role,
    // No natural slot for active_field_path (an opaque FE field id, not user-meaningful)
    // — omit it rather than mislabel it as a "deadline".
    deadline: null,
    covered_gaps: ks.answered_gaps ?? [],
  };
}

/** The Apply chip — carries its OWN proposed edit so tapping an old row applies THAT row's edit. */
function buildApplyActions(edit: CvBuilderChatProposedEdit): ChatActionChip[] {
  return [{ kind: "rewrite", labelKey: "companion.cvChat.applyButton", cvEdit: edit }];
}

// ── Main hook ───────────────────────────────────────────────────────

/**
 * Mount on the CV builder page to register the corner-advisor chat.
 * @param cvId  the draft CV id — scopes the BE thread.
 */
export function useCvBuilderChatCompanion(
  cvId: string | null,
): { sendQuestion: (question: string) => void } {
  const { t, i18n } = useTranslation("diagnosis");
  // Optional-chain i18n — a test host may mock useTranslation with only `t`, and the
  // hook must not crash the page it mounts on (jsdom-safety, same as window.matchMedia?.()).
  const language = i18n?.language?.startsWith("vi") ? "vi" : "en";

  const opener = t("companion.cvChat.opener");
  // returnObjects yields an array in prod, but a minimal test mock (or a missing key)
  // returns the key string — guard so `.join` below never throws on the host page.
  const suggestionsRaw = t("companion.cvChat.suggestions", { returnObjects: true });
  const suggestions = Array.isArray(suggestionsRaw) ? (suggestionsRaw as string[]) : [];

  const previousCvIdRef = useRef<string | null | undefined>(undefined);

  // A different cvId is a different thread. Clear local chat so switching
  // drafts never mixes two CVs' threads.
  useEffect(() => {
    const previous = previousCvIdRef.current;
    if (previous !== undefined && previous !== cvId) {
      useCompanionStore.getState().clearChat();
    }
    previousCvIdRef.current = cvId;
  }, [cvId]);

  // Restore the persisted thread for THIS cvId on mount.
  useEffect(() => {
    if (!cvId) return;
    let cancelled = false;
    getBuilderChatThreadApi(cvId)
      .then((res) => {
        if (cancelled || !res.turns?.length) return;
        const store = useCompanionStore.getState();
        if (store.chatMessages.length > 0) return; // live draft not clobbered
        store.seedChatMessages(
          res.turns.map((m) => ({ role: m.role, text: m.text })),
        );
        if (res.known_state) {
          store.setChatKnownState(mapKnownState({ ...res.known_state } as CvBuilderChatResponse["known_state"]));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cvId]);

  // ── Read focused field from the live builder store ──
  // The builder tracks the currently active companion field via companionField/
  // companionSection (set by CvBuilderSkill on focus). Read the LIVE buffer value
  // so the BE grounds against what the user is typing, not the ~1.5s-stale autosave.
  function getFocusedField(): { field_path: string; current_value: string } | undefined {
    const state = useCvBuilderStore.getState();
    const fieldPath = state.companionField;
    const section = state.companionSection;
    if (!fieldPath || !section) return undefined;
    const currentValue = getFieldValue(state, section, fieldPath);
    if (!currentValue) return undefined;
    return { field_path: fieldPath, current_value: currentValue };
  }

  const runChat = useCallback(
    (question: string, assistantIndex: number) => {
      if (!cvId) {
        // No draft id (local/offline, or draftId permanently null after a 402) → fail the
        // pending row so it degrades to a friendly retry row instead of hanging isChatBusy
        // true forever (dead composer). Mirrors the diagnosis hook's NO_CHAT_TARGET path.
        useCompanionStore.getState().failAssistantAt(assistantIndex, "retry");
        return;
      }
      const chatEpoch = useCompanionStore.getState().chatEpoch;
      const focusedField = getFocusedField();
      // The diagnosed CV this draft was seeded from (Phase A). A POINTER so the BE can read the
      // parent CV's scan findings when this fresh draft has none of its own — undefined when this
      // draft did not come from a diagnosis (the BE then just has no diagnosis block).
      const sourceCvId = useCvBuilderStore.getState().diagnosisSourceCvId ?? undefined;

      postBuilderChatApi(cvId, {
        question,
        focused_field: focusedField,
        language,
        source_cv_id: sourceCvId,
      })
        .then((res) => {
          if (useCompanionStore.getState().chatEpoch !== chatEpoch) return;
          const store = useCompanionStore.getState();

          // Map extras
          const groundedFacts = mapGroundedFacts(res.grounded_facts);
          const applyActions = res.proposed_edit ? buildApplyActions(res.proposed_edit) : undefined;

          store.resolveAssistantAt(assistantIndex, res.answer, {
            actions: applyActions,
            suggestedNextStep: res.suggested_next_step ?? undefined,
            groundedFacts,
            answerKind: res.answer_kind,
          });

          // Store-back answer tone + known state
          store.setChatAnswerTone(res.answer_kind ?? null);
          store.setChatKnownState(mapKnownState(res.known_state));
        })
        .catch((error) => {
          if (useCompanionStore.getState().chatEpoch !== chatEpoch) return;
          useCompanionStore
            .getState()
            .failAssistantAt(assistantIndex, isDailyLimitError(error) ? "limit" : "retry");
        });
    },
    [cvId, language],
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

  const onDeleteThread = useCallback(() => {
    // Clear the LOCAL thread regardless of cvId so a stuck thread can always be
    // cleared; only the server DELETE needs a real draft id.
    useCompanionStore.getState().clearChat();
    if (cvId) deleteBuilderChatThreadApi(cvId).catch(() => undefined);
  }, [cvId]);

  const onAction = useCallback(
    (chip: ChatActionChip) => {
      if (chip.kind !== "rewrite" || !cvId) return;
      // The Apply flow: apply THIS chip's own proposed_edit (carried on the chip so
      // tapping an old row never applies a newer row's edit).
      const proposedEdit = chip.cvEdit;
      if (!proposedEdit) return;

      try {
        const store = useCvBuilderStore.getState();
        const section = sectionFromFieldPath(proposedEdit.field_path);
        if (!section) return; // out-of-contract prefix → never clobber the summary
        const stripped = proposedEdit.field_path.startsWith("cvbuilder:")
          ? proposedEdit.field_path.slice("cvbuilder:".length)
          : proposedEdit.field_path;

        if (section === "summary") {
          store.setSummary(proposedEdit.after);
          store.clearSectionEvaluation("summary");
          return;
        }

        // Parse "experience[0].description" → index + field
        const bracketMatch = stripped.match(/^(?:experience|projects)\[(\d+)\]\.(.+)$/);
        if (!bracketMatch) return;
        const idx = parseInt(bracketMatch[1], 10);
        const field = bracketMatch[2];

        if (section === "experience") {
          const item = store.experience[idx];
          if (item) {
            store.updateExperience(item.id, field as keyof typeof item, proposedEdit.after);
            store.clearSectionEvaluation("experience");
          }
        } else if (section === "projects") {
          const item = store.projects[idx];
          if (item) {
            store.updateProject(item.id, field as keyof typeof item, proposedEdit.after);
            store.clearSectionEvaluation("projects");
          }
        }
      } catch {
        // Patch failed — the user should edit manually
      }
    },
    [cvId],
  );

  // Latest props for getTurn — refreshed every render.
  const propsRef = useRef<{
    onSend: (q: string) => void;
    onRetry: (index: number) => void;
    onDeleteThread: () => void;
    onAction: (chip: ChatActionChip) => void;
  }>({
    onSend: () => {},
    onRetry: () => {},
    onDeleteThread: () => {},
    onAction: () => {},
  });
  propsRef.current = { onSend, onRetry, onDeleteThread, onAction };

  // Store-back the opener + chips so CompanionShell repaints on tab switch.
  useEffect(() => {
    useCompanionStore.getState().setChatDisplay({ opener, suggestions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opener, suggestions.join("")]);

  // ── Register + activate ONCE on mount; unregister + clearChat on unmount. ──
  useEffect(() => {
    const store = useCompanionStore.getState();
    store.registerContext({
      id: CV_BUILDER_CHAT_CONTEXT_ID,
      priority: 5,
      // NO anchorId → the dolphin sits at the corner fallback.
      getTurn: () => ({
        skill: "cv_builder_chat",
        props: {
          onSend: propsRef.current.onSend,
          // Tapping a suggestion chip sends it as a question (same handler as typing).
          onSuggestionTap: propsRef.current.onSend,
          onRetry: propsRef.current.onRetry,
          onDeleteThread: propsRef.current.onDeleteThread,
          onAction: propsRef.current.onAction,
        },
      }),
    });
    store.activateContext(CV_BUILDER_CHAT_CONTEXT_ID);

    return () => {
      const s = useCompanionStore.getState();
      s.unregisterContext(CV_BUILDER_CHAT_CONTEXT_ID);
      // MANDATORY: clearChat on unmount — single global chat thread
      s.clearChat();
    };
    // Mount-only: NEVER re-run (re-running would re-pop a closed bubble = Clippy).
  }, []);

  return { sendQuestion: onSend };
}

// ── Helpers for reading the live field value from builder state ──────

function getFieldValue(
  state: ReturnType<typeof useCvBuilderStore.getState>,
  section: string,
  fieldPath: string,
): string | undefined {
  try {
    if (section === "summary" || fieldPath.includes("summary")) {
      return state.summary || undefined;
    }
    // Parse index from fieldPath like "experience[0].description"
    const bracketMatch = fieldPath.match(/\[(\d+)\]\.(.*)$/);
    if (!bracketMatch) return undefined;
    const idx = parseInt(bracketMatch[1], 10);
    const field = bracketMatch[2];
    if (section === "experience" && state.experience[idx]) {
      const value = state.experience[idx][field as keyof WorkExperience];
      return typeof value === "string" ? value : undefined;
    }
    if (section === "projects" && state.projects[idx]) {
      const value = state.projects[idx][field as keyof Project];
      return typeof value === "string" ? value : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
