import { create } from "zustand";

interface AutosaveState {
  saveStatus: "idle" | "saving" | "saved" | "error" | "local";
  lastSavedTime: string | null;
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error" | "local") => void;
  setLastSavedTime: (time: string | null) => void;
  triggerSaveRef: { current: (() => void) | null };
}

export const useAutosaveStore = create<AutosaveState>((set) => ({
  saveStatus: "idle",
  lastSavedTime: null,
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setLastSavedTime: (lastSavedTime) => set({ lastSavedTime }),
  triggerSaveRef: { current: null },
}));
