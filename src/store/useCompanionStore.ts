// ─── useCompanionStore ──────────────────────────────────────────────
// Shell store: registry of companion contexts, single active context,
// auto-open-once + dismiss memory, position/drag state.
// Pure logic — unit-tested in useCompanionStore.spec.ts.

import { create } from "zustand";
import type { ElementIssue } from "@/components/companion/skills/element-issues";
import type { ChatActionChip } from "@/components/companion/skills/chat-action-chips";

export type CompanionSkill =
  | "cv_builder"
  | "cv_intake"
  | "cv_project_intake"
  | "diagnosis_results"
  | "diagnosis_review"
  | "diagnosis_upload"
  | "diagnosis_progress"
  | "diagnosis_element_issue"
  | "diagnosis_commentary"
  | "diagnosis_chat"
  | "learning_chat";

/** One message in the calm corner-advisor chat thread (ephemeral, NOT persisted). */
export interface CompanionChatMessage {
  role: "user" | "assistant";
  text: string;
  /** UI-only prompt/opener restored from local context; never sent back to the LLM. */
  local?: boolean;
  /** Assistant placeholder while the answer is in flight. */
  pending?: boolean;
  /** Assistant slot that failed (e.g. endpoint not built / network) → retry row. */
  error?: boolean;
  /**
   * Why the slot failed → drives the error row's affordance:
   *  - "retry" (default): transient → friendly error + retry button
   *  - "limit": BE 429 daily cap → distinct "limit reached" copy, NO retry
   */
  errorKind?: "retry" | "limit";
  /** The user question that produced this assistant slot (so retry heals THIS row in place). */
  question?: string;
  /** Deep-link chips (F4) built from the cited gap — honest-empty: absent/[] on a join miss. */
  actions?: ChatActionChip[];
  /** Tool provenance from BE grounding, e.g. github.enrich/resource.validate. */
  citedTool?: string;
  /** BE-suggested follow-up question — absent when the answer had no follow-up (honest-empty). */
  suggestedNextStep?: string;
}

/** Sticky dismiss/snooze modes for an element issue (persisted cross-session). */
export type IssueDismissMode = "once" | "snooze" | "intentional";

// ── Persisted dismissed-issues set (localStorage, key `companion-dismissed`) ──
// "once" = quiet for THIS session only (not persisted); "snooze"/"intentional"
// = sticky across sessions (persisted). Anti-Clippy: a dismissed/snoozed issue
// never re-pops.
const DISMISSED_KEY = "companion-dismissed";

function loadDismissedIssues(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissedIssues(ids: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable — keep in-memory only */
  }
}
export type CompanionTurn = { skill: CompanionSkill; props: Record<string, unknown> };
export interface CompanionContextReg {
  id: string;
  priority?: number;
  /** DOM element id to anchor the mascot to (e.g. "gap-anchor"). Omit = fixed bottom-right. */
  anchorId?: string;
  getTurn: () => CompanionTurn;
  suppressAutoOpen?: boolean;
}

interface CompanionState {
  contexts: Record<string, CompanionContextReg>;
  activeId: string | null;
  bubbleOpen: boolean;
  dismissed: Record<string, true>;
  position: { x: number; y: number };
  positionMode: "auto" | "manual";
  isDragging: boolean;
  /** Temporarily hide the companion during blocking page states (e.g. diagnosis scan overlay). */
  suspended: boolean;
  // ── Issue-queue slice (Pillar 1+2: anchored per-element analysis) ──
  /** Full severity-sorted queue from collectElementIssues (incl. dismissed). */
  issues: ElementIssue[];
  /** Index into the VISIBLE (non-dismissed) queue. */
  activeIssueIndex: number;
  /** Sticky dismissed/snoozed issue ids (persisted cross-session). */
  dismissedIssues: Set<string>;
  // ── Corner-advisor chat slice (ephemeral — NOT persisted) ──
  /** Two-way chat thread for the calm corner advisor (user asks, assistant answers). */
  chatMessages: CompanionChatMessage[];
  /**
   * Monotonic identity of the CURRENT thread. Bumped whenever the thread is replaced
   * (clearChat / seedChatMessages / resetCompanion) — never reset. Contract for
   * in-flight sends: capture it when the request leaves, compare before resolving;
   * a mismatch means the user swapped session/match mid-flight and this answer
   * belongs to a thread that no longer exists — drop it, or resolve-by-index will
   * write one conversation's answer over another's row.
   */
  chatEpoch: number;
  /**
   * Gate verdict of the LATEST resolved answer (Wave 1) — drives the mascot pose
   * (refusal → sheepish, grounded → confident). Null while nothing resolved yet,
   * on a fresh thread, or for answers from BEs that don't send answer_kind.
   */
  chatAnswerTone: 'grounded' | 'refusal' | 'canned' | null;
  /** Focus-aware opener for the corner advisor — store-backed so the shell repaints on tab switch. */
  chatOpener: string | null;
  /** Focus-aware suggestion chips — store-backed (same reason as chatOpener). */
  chatSuggestions: string[];
  /** Action selected from a chat chip, waiting for explicit user confirmation. */
  chatPendingAction: ChatActionChip | null;
  /**
   * True while a CONFIRMED chip action is running a real network call (e.g.
   * view_match's loadMatchForChat) — OR'd into CompanionShell's composer-disable
   * flag so the bubble shows visible pending feedback + a double-fire guard, same
   * as the chat-send pending row, without faking a chat message for a non-chat action.
   */
  chatActionPending: boolean;
  registerContext: (reg: CompanionContextReg) => void;
  unregisterContext: (id: string) => void;
  activateContext: (id: string) => void;
  closeBubble: () => void;
  openBubble: () => void;
  dismissActive: () => void;
  /** Clear the session dismiss flag for one context so activateContext re-opens it. */
  clearDismissed: (id: string) => void;
  setPosition: (x: number, y: number) => void;
  /** Re-enable anchoring after a manual drag (advancing the queue → re-anchor). */
  resetPositionMode: () => void;
  setDragging: (b: boolean) => void;
  setSuspended: (b: boolean) => void;
  setIssues: (issues: ElementIssue[]) => void;
  nextIssue: () => void;
  prevIssue: () => void;
  dismissIssue: (id: string, mode: IssueDismissMode) => void;
  // ── Chat actions ──
  /** Append a user or assistant message to the corner-advisor thread. */
  appendChatMessage: (msg: CompanionChatMessage) => void;
  /** Replace the chat thread with a server-restored seed (persisted history). */
  seedChatMessages: (msgs: CompanionChatMessage[]) => void;
  /**
   * Append a pending (in-flight) assistant placeholder message. The owning
   * `question` is stored on the placeholder so a later retry can re-send THIS
   * specific question (heal-in-place) rather than the newest user message.
   */
  setChatPending: (question: string) => void;
  /** Resolve the last assistant message (the pending placeholder) with the answer text. */
  resolveLastAssistant: (text: string) => void;
  /**
   * Mark the last assistant message as failed (graceful error row). `kind="limit"`
   * (BE 429 daily cap) shows a distinct no-retry row; otherwise a retryable row.
   */
  failLastAssistant: (kind?: "retry" | "limit") => void;
  /** Resolve a SPECIFIC assistant row (by index) — used by per-row retry so a
   *  concurrent send appended at the end never clobbers the retried row. `actions`
   *  (F4) is optional — omit/[] when there's nothing honest to deep-link to.
   *  `suggestedNextStep` is optional — omit/undefined when the BE had no follow-up. */
  resolveAssistantAt: (
    index: number,
    text: string,
    actions?: ChatActionChip[],
    citedTool?: string,
    suggestedNextStep?: string,
  ) => void;
  /** Fail a SPECIFIC assistant row (by index) — used by per-row retry. */
  failAssistantAt: (index: number, kind?: "retry" | "limit") => void;
  /**
   * Heal a specific failed assistant row IN PLACE: set it back to pending (keeping
   * its owning `question`). Used by per-row retry so we never append a duplicate
   * user bubble. Returns the owning question so the caller can re-send it, or null.
   */
  retryAssistantAt: (index: number) => string | null;
  /** Clear the whole chat thread (e.g. on leaving the diagnosis tab / reset). */
  clearChat: () => void;
  /** Store a chip action that needs explicit confirmation before spending quota. */
  setChatPendingAction: (action: ChatActionChip | null) => void;
  /** Record the gate verdict of the answer that just resolved (Wave 1 mascot pose). */
  setChatAnswerTone: (tone: 'grounded' | 'refusal' | 'canned' | null) => void;
  /** Flip while a confirmed chip action's real network call is in flight. */
  setChatActionPending: (pending: boolean) => void;
  /** Push the focus-aware opener + chips so CompanionShell (subscribed) repaints on tab switch. */
  setChatDisplay: (d: { opener: string | null; suggestions: string[] }) => void;
  resetCompanion: () => void;
}

const initial = {
  contexts: {} as Record<string, CompanionContextReg>,
  activeId: null as string | null,
  bubbleOpen: false,
  dismissed: {} as Record<string, true>,
  position: { x: 0, y: 0 },
  positionMode: "auto" as "auto" | "manual",
  isDragging: false,
  suspended: false,
  issues: [] as ElementIssue[],
  activeIssueIndex: 0,
  chatMessages: [] as CompanionChatMessage[],
  chatEpoch: 0,
  chatAnswerTone: null as 'grounded' | 'refusal' | 'canned' | null,
  chatOpener: null as string | null,
  chatSuggestions: [] as string[],
  chatPendingAction: null as ChatActionChip | null,
  chatActionPending: false,
};

export const useCompanionStore = create<CompanionState>()((set) => ({
  ...initial,
  dismissedIssues: loadDismissedIssues(),
  registerContext: (reg) =>
    set((s) => ({ contexts: { ...s.contexts, [reg.id]: reg } })),
  unregisterContext: (id) =>
    set((s) => {
      const contexts = { ...s.contexts };
      delete contexts[id];
      return { contexts, activeId: s.activeId === id ? null : s.activeId };
    }),
  // Activating selects the context; auto-open the bubble the FIRST time only (until dismissed).
  activateContext: (id) =>
    set((s) => {
      const reg = s.contexts[id];
      const shouldAutoOpen = reg?.suppressAutoOpen ? s.bubbleOpen : (s.dismissed[id] ? false : true);
      return {
        activeId: id,
        bubbleOpen: shouldAutoOpen,
      };
    }),
  closeBubble: () => set({ bubbleOpen: false }),
  openBubble: () => set({ bubbleOpen: true }),
  dismissActive: () =>
    set((s) => ({
      bubbleOpen: false,
      dismissed: s.activeId
        ? { ...s.dismissed, [s.activeId]: true }
        : s.dismissed,
    })),
  // Fix F: drop the session dismiss flag for one context so a subsequent
  // activateContext re-opens the bubble (used when the queue advances to a
  // genuinely NEW card = new advice the user hasn't dismissed).
  clearDismissed: (id) =>
    set((s) => {
      if (!s.dismissed[id]) return {};
      const dismissed = { ...s.dismissed };
      delete dismissed[id];
      return { dismissed };
    }),
  setPosition: (x, y) => set({ position: { x, y }, positionMode: "manual" }),
  // Fix A: advancing the issue queue reuses ONE context id, so the shell's
  // activeId-change reset never fires — the queue re-points but stays latched
  // to "manual" after a drag. This action lets the wiring re-enable anchoring
  // when the active anchor changes.
  resetPositionMode: () => set({ positionMode: "auto" }),
  setDragging: (isDragging) => set({ isDragging }),
  setSuspended: (suspended) => set({ suspended }),
  // ── Issue-queue actions ──
  // Reset the active index to the start of the (re-filtered) visible queue so a
  // re-scan always lands on the worst non-dismissed issue.
  setIssues: (issues) => set({ issues, activeIssueIndex: 0 }),
  nextIssue: () =>
    set((s) => {
      const visible = visibleIssues(s);
      if (visible.length === 0) return {};
      return { activeIssueIndex: Math.min(s.activeIssueIndex + 1, visible.length - 1) };
    }),
  prevIssue: () =>
    set((s) => ({ activeIssueIndex: Math.max(s.activeIssueIndex - 1, 0) })),
  dismissIssue: (id, mode) =>
    set((s) => {
      // "once" = session-only quiet (kept in `dismissed`); "snooze"/"intentional"
      // = sticky cross-session (persisted to localStorage).
      let dismissedIssues = s.dismissedIssues;
      if (mode === "snooze" || mode === "intentional") {
        dismissedIssues = new Set(s.dismissedIssues);
        dismissedIssues.add(id);
        persistDismissedIssues(dismissedIssues);
      }
      const dismissed = mode === "once" ? { ...s.dismissed, [id]: true as const } : s.dismissed;
      // Re-clamp the active index against the new visible queue.
      const nextVisibleLen = s.issues.filter(
        (iss) => !dismissedIssues.has(iss.id) && !dismissed[iss.id],
      ).length;
      const activeIssueIndex = Math.min(s.activeIssueIndex, Math.max(nextVisibleLen - 1, 0));
      return { dismissedIssues, dismissed, activeIssueIndex };
    }),
  // ── Chat actions (ephemeral corner-advisor thread) ──
  appendChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  // Replacing the thread is a NEW thread identity — bump the epoch so any send
  // still in flight against the old thread drops instead of resolving into this one.
  seedChatMessages: (msgs) => set((s) => ({ chatMessages: msgs, chatEpoch: s.chatEpoch + 1 })),
  // Append an in-flight assistant placeholder (drives the "thinking" row). The
  // owning question rides along so a later retry heals THIS row in place.
  setChatPending: (question) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, { role: "assistant" as const, text: "", pending: true, question }],
    })),
  // Resolve the LAST assistant message (the pending placeholder) with the real answer.
  resolveLastAssistant: (text) =>
    set((s) => {
      const idx = lastAssistantIndex(s.chatMessages);
      if (idx < 0) return {};
      const chatMessages = s.chatMessages.slice();
      chatMessages[idx] = { role: "assistant", text, pending: false, error: false };
      return { chatMessages };
    }),
  // Mark the LAST assistant message as failed → renderer shows the error row.
  // Preserve the owning `question` so per-row retry can re-send it.
  failLastAssistant: (kind = "retry") =>
    set((s) => {
      const idx = lastAssistantIndex(s.chatMessages);
      if (idx < 0) return {};
      const chatMessages = s.chatMessages.slice();
      chatMessages[idx] = {
        role: "assistant",
        text: "",
        pending: false,
        error: true,
        errorKind: kind,
        question: chatMessages[idx].question,
      };
      return { chatMessages };
    }),
  // Resolve a SPECIFIC assistant row (by index) with the answer. Used by per-row
  // retry where the retried slot is NOT necessarily the last assistant.
  resolveAssistantAt: (index, text, actions, citedTool, suggestedNextStep) =>
    set((s) => {
      const target = s.chatMessages[index];
      if (!target || target.role !== "assistant") return {};
      const chatMessages = s.chatMessages.slice();
      chatMessages[index] = {
        role: "assistant",
        text,
        pending: false,
        error: false,
        question: target.question,
        actions,
        citedTool,
        suggestedNextStep,
      };
      return { chatMessages };
    }),
  // Fail a SPECIFIC assistant row (by index). Used by per-row retry.
  failAssistantAt: (index, kind = "retry") =>
    set((s) => {
      const target = s.chatMessages[index];
      if (!target || target.role !== "assistant") return {};
      const chatMessages = s.chatMessages.slice();
      chatMessages[index] = {
        role: "assistant",
        text: "",
        pending: false,
        error: true,
        errorKind: kind,
        question: target.question,
      };
      return { chatMessages };
    }),
  // Heal a SPECIFIC failed row in place: flip it back to pending (keep its question)
  // and hand the question back so the caller re-sends exactly that one. No new bubbles.
  retryAssistantAt: (index) => {
    let question: string | null = null;
    set((s) => {
      const target = s.chatMessages[index];
      if (!target || target.role !== "assistant" || !target.error) return {};
      question = target.question ?? null;
      const chatMessages = s.chatMessages.slice();
      chatMessages[index] = {
        role: "assistant",
        text: "",
        pending: true,
        error: false,
        question: target.question,
      };
      return { chatMessages };
    });
    return question;
  },
  clearChat: () =>
    set((s) => ({
      chatMessages: [],
      chatEpoch: s.chatEpoch + 1,
      chatAnswerTone: null,
      chatOpener: null,
      chatSuggestions: [],
      chatPendingAction: null,
      chatActionPending: false,
    })),
  setChatPendingAction: (chatPendingAction) => set({ chatPendingAction }),
  setChatAnswerTone: (chatAnswerTone) => set({ chatAnswerTone }),
  setChatActionPending: (chatActionPending) => set({ chatActionPending }),
  setChatDisplay: ({ opener, suggestions }) => set({ chatOpener: opener, chatSuggestions: suggestions }),
  resetCompanion: () =>
    set((s) => ({
      ...initial,
      contexts: {},
      dismissed: {},
      chatMessages: [],
      // Epoch stays monotonic across resets — restoring `initial`'s 0 could collide
      // with an epoch captured by a send that is still in flight.
      chatEpoch: s.chatEpoch + 1,
      chatAnswerTone: null,
      chatOpener: null,
      chatSuggestions: [],
      chatPendingAction: null,
      chatActionPending: false,
      dismissedIssues: loadDismissedIssues(),
    })),
}));

/** Index of the last assistant message in the thread, or -1 if there is none. */
function lastAssistantIndex(messages: CompanionChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return i;
  }
  return -1;
}

export const bubbleVisible = (s: CompanionState): boolean =>
  s.bubbleOpen && !s.isDragging && !s.suspended && s.activeId !== null;

/**
 * The SINGLE definition of "a chat turn is in flight": a pending assistant row in the thread, or a
 * confirmed chip action running its own network call. CompanionShell disables the composer with it;
 * the send/retry guards read it LIVE via getState().
 *
 * Both callers MUST use this, and the guards must read it live rather than close over it. The shell
 * is a sibling rendered BEFORE the router (App.tsx:60 vs :63), so its getTurn() always reads a
 * propsRef written during the hook host's PREVIOUS render: a guard that closed over the mutation's
 * isPending got captured as permanently-true the moment a turn settled, silently dropping every
 * later send while the composer still looked enabled (two sources of truth for "busy" → dead chat).
 */
export const isChatBusy = (
  s: Pick<CompanionState, "chatMessages" | "chatActionPending">,
): boolean =>
  s.chatMessages.some((m) => m.role === "assistant" && !!m.pending) || s.chatActionPending;

/**
 * The visible issue queue: severity-sorted issues minus any that are dismissed
 * (sticky cross-session OR session-only "once"). Anti-Clippy: dismissed issues
 * never reappear. Honest-empty: a clean scan → [] → no context registered.
 */
export const visibleIssues = (s: CompanionState): ElementIssue[] =>
  s.issues.filter((iss) => !s.dismissedIssues.has(iss.id) && !s.dismissed[iss.id]);

/** The currently-active element issue (the one the dolphin points at), or null. */
export const activeIssue = (s: CompanionState): ElementIssue | null => {
  const visible = visibleIssues(s);
  if (visible.length === 0) return null;
  const idx = Math.min(s.activeIssueIndex, visible.length - 1);
  return visible[idx] ?? null;
};
