import { create } from "zustand";

interface AutosaveState {
  saveStatus: "idle" | "saving" | "saved" | "error" | "local";
  lastSavedTime: string | null;
  isDirty: boolean;
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error" | "local") => void;
  setLastSavedTime: (time: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
  triggerSaveRef: { current: (() => Promise<void>) | null };
}

export const useAutosaveStore = create<AutosaveState>((set) => ({
  saveStatus: "idle",
  lastSavedTime: null,
  isDirty: false,
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setLastSavedTime: (lastSavedTime) => set({ lastSavedTime }),
  setIsDirty: (isDirty) => set({ isDirty }),
  triggerSaveRef: { current: null },
}));
