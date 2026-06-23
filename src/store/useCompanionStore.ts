// ─── useCompanionStore ──────────────────────────────────────────────
// Shell store: registry of companion contexts, single active context,
// auto-open-once + dismiss memory, position/drag state.
// Pure logic — unit-tested in useCompanionStore.spec.ts.

import { create } from "zustand";
import type { ElementIssue } from "@/components/companion/skills/element-issues";

export type CompanionSkill =
  | "cv_builder"
  | "cv_intake"
  | "diagnosis_results"
  | "diagnosis_proveit"
  | "diagnosis_review"
  | "diagnosis_upload"
  | "diagnosis_progress"
  | "diagnosis_element_issue"
  | "diagnosis_commentary"
  | "diagnosis_chat";

/** One message in the calm corner-advisor chat thread (ephemeral, NOT persisted). */
export interface CompanionChatMessage {
  role: "user" | "assistant";
  text: string;
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
}

interface CompanionState {
  contexts: Record<string, CompanionContextReg>;
  activeId: string | null;
  bubbleOpen: boolean;
  dismissed: Record<string, true>;
  position: { x: number; y: number };
  positionMode: "auto" | "manual";
  isDragging: boolean;
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
  registerContext: (reg: CompanionContextReg) => void;
  unregisterContext: (id: string) => void;
  activateContext: (id: string) => void;
  closeBubble: () => void;
  dismissActive: () => void;
  /** Clear the session dismiss flag for one context so activateContext re-opens it. */
  clearDismissed: (id: string) => void;
  setPosition: (x: number, y: number) => void;
  /** Re-enable anchoring after a manual drag (advancing the queue → re-anchor). */
  resetPositionMode: () => void;
  setDragging: (b: boolean) => void;
  setIssues: (issues: ElementIssue[]) => void;
  nextIssue: () => void;
  prevIssue: () => void;
  dismissIssue: (id: string, mode: IssueDismissMode) => void;
  // ── Chat actions ──
  /** Append a user or assistant message to the corner-advisor thread. */
  appendChatMessage: (msg: CompanionChatMessage) => void;
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
   *  concurrent send appended at the end never clobbers the retried row. */
  resolveAssistantAt: (index: number, text: string) => void;
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
  issues: [] as ElementIssue[],
  activeIssueIndex: 0,
  chatMessages: [] as CompanionChatMessage[],
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
    set((s) => ({
      activeId: id,
      bubbleOpen: s.dismissed[id] ? false : true,
    })),
  closeBubble: () => set({ bubbleOpen: false }),
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
  resolveAssistantAt: (index, text) =>
    set((s) => {
      const target = s.chatMessages[index];
      if (!target || target.role !== "assistant") return {};
      const chatMessages = s.chatMessages.slice();
      chatMessages[index] = { role: "assistant", text, pending: false, error: false, question: target.question };
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
  clearChat: () => set({ chatMessages: [] }),
  resetCompanion: () =>
    set({
      ...initial,
      contexts: {},
      dismissed: {},
      chatMessages: [],
      dismissedIssues: loadDismissedIssues(),
    }),
}));

/** Index of the last assistant message in the thread, or -1 if there is none. */
function lastAssistantIndex(messages: CompanionChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return i;
  }
  return -1;
}

export const bubbleVisible = (s: CompanionState): boolean =>
  s.bubbleOpen && !s.isDragging && s.activeId !== null;

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
