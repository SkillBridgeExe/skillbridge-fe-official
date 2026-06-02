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
          className={cn(
            "fixed inset-0 z-[200] flex items-center justify-center",
            blocking ? "bg-white/75 backdrop-blur-sm" : "pointer-events-none",
          )}
        >
          <motion.div
            initial={{ scale: 0.85, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className={cn(
              "flex flex-col items-center gap-3 text-center",
              !blocking && "rounded-3xl bg-white/95 px-8 py-6 shadow-xl ring-1 ring-slate-100",
            )}
          >
            <MascotSticker state={state} size={blocking ? 180 : 140} interactive={false} />
            {message && <p className="max-w-xs text-sm font-medium text-slate-600">{message}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MascotOverlay;
