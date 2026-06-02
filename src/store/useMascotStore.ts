import { create } from "zustand";
import type { MascotState } from "@/components/mascot/MascotSticker";

/**
 * Global mascot overlay state. A single dolphin overlay is mounted once at the
 * app root (<MascotOverlay/>) and driven entirely from this store, so ANY
 * component can trigger the mascot via the useMascot* hooks without prop drilling.
 *
 * - blocking=true  → full-screen backdrop (loading): blocks interaction.
 * - blocking=false → floating non-blocking popup (success/love/tip): auto-dismiss.
 */
interface MascotOverlayStore {
  active: boolean;
  state: MascotState;
  message?: string;
  blocking: boolean;
  show: (opts: { state: MascotState; message?: string; blocking?: boolean }) => void;
  hide: () => void;
}

export const useMascotStore = create<MascotOverlayStore>()((set) => ({
  active: false,
  state: "loading",
  message: undefined,
  blocking: true,
  show: ({ state, message, blocking = false }) =>
    set({ active: true, state, message, blocking }),
  hide: () => set({ active: false }),
}));
