// ─── useCompanionStore ──────────────────────────────────────────────
// Shell store: registry of companion contexts, single active context,
// auto-open-once + dismiss memory, position/drag state.
// Pure logic — unit-tested in useCompanionStore.spec.ts.

import { create } from "zustand";

export type CompanionSkill =
  | "cv_builder"
  | "cv_intake"
  | "diagnosis_results"
  | "diagnosis_proveit"
  | "diagnosis_review"
  | "diagnosis_upload"
  | "diagnosis_progress";
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
  registerContext: (reg: CompanionContextReg) => void;
  unregisterContext: (id: string) => void;
  activateContext: (id: string) => void;
  closeBubble: () => void;
  dismissActive: () => void;
  setPosition: (x: number, y: number) => void;
  setDragging: (b: boolean) => void;
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
};

export const useCompanionStore = create<CompanionState>()((set) => ({
  ...initial,
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
  setPosition: (x, y) => set({ position: { x, y }, positionMode: "manual" }),
  setDragging: (isDragging) => set({ isDragging }),
  resetCompanion: () => set({ ...initial, contexts: {}, dismissed: {} }),
}));

export const bubbleVisible = (s: CompanionState): boolean =>
  s.bubbleOpen && !s.isDragging && s.activeId !== null;
