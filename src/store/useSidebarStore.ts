import { create } from "zustand";
import { persist } from "zustand/middleware";

/** UI state for the authenticated left sidebar (Teal-style app shell). */
interface SidebarState {
  /** Desktop rail collapsed to icon-only width. Persisted. */
  collapsed: boolean;
  /** Temporarily lock the desktop rail in icon-only mode for focus screens. */
  forceCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  setForceCollapsed: (forceCollapsed: boolean) => void;
  toggleCollapsed: () => void;
  /** Mobile drawer visibility. Not persisted. */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      forceCollapsed: false,
      setCollapsed: (collapsed) =>
        set((state) => ({ collapsed: state.forceCollapsed ? true : collapsed })),
      setForceCollapsed: (forceCollapsed) =>
        set((state) => ({
          forceCollapsed,
          collapsed: forceCollapsed ? true : state.collapsed,
        })),
      toggleCollapsed: () =>
        set((state) =>
          state.forceCollapsed ? {} : { collapsed: !state.collapsed },
        ),
      mobileOpen: false,
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
    }),
    {
      name: "skillbridge-sidebar",
      partialize: (s) => ({ collapsed: s.collapsed }),
    },
  ),
);
