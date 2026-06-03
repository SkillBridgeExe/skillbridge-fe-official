import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MascotSticker } from "./MascotSticker";
import { useMascotStore } from "@/store/useMascotStore";

/**
 * Global mascot overlay — mount ONCE at the app root (see App.tsx).
 * Renders whatever the useMascot* hooks push into useMascotStore:
 *   - loading  → full-screen blurred backdrop, blocks the UI
 *   - success/love/tip → floating card, non-blocking, auto-dismissed by the hook
 */
export function MascotOverlay() {
  const active = useMascotStore((s) => s.active);
  const state = useMascotStore((s) => s.state);
  const message = useMascotStore((s) => s.message);
  const blocking = useMascotStore((s) => s.blocking);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="mascot-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-white/75 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="flex flex-col items-center gap-2 text-center p-6"
          >
            <MascotSticker state={state} size={360} interactive={false} />
            {message && <p className="max-w-md text-xl font-bold text-slate-800">{message}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MascotOverlay;
