import { create } from "zustand";
import { persist } from "zustand/middleware";

/** UI state for the authenticated left sidebar (Teal-style app shell). */
interface SidebarState {
  /** Desktop rail collapsed to icon-only width. Persisted. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Mobile drawer visibility. Not persisted. */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      mobileOpen: false,
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
    }),
    {
      name: "skillbridge-sidebar",
      partialize: (s) => ({ collapsed: s.collapsed }),
    },
  ),
);
