import { AnimatePresence, motion } from "framer-motion";
import { MascotSticker } from "./MascotSticker";
import { useMascotStore } from "@/store/useMascotStore";

/**
 * Global mascot overlay — mount ONCE at the app root (see App.tsx).
 * Renders whatever the useMascot* hooks push into useMascotStore:
 *   - blocking=true  → full-screen backdrop (loading): blocks interaction.
 *   - blocking=false → floating non-blocking popup (success/love/tip): auto-dismiss.
 */
export function MascotOverlay() {
  const active = useMascotStore((s) => s.active);
  const state = useMascotStore((s) => s.state);
  const message = useMascotStore((s) => s.message);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="mascot-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/15 backdrop-blur-[20px] pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="flex flex-col items-center gap-6 text-center p-6 max-w-lg w-full"
          >
            {/* Free-floating large mascot sticker */}
            <div className="relative drop-shadow-[0_20px_35px_rgba(14,165,233,0.25)]">
              <MascotSticker state={state} size={260} interactive={false} />
            </div>

            {/* Premium glassmorphic text capsule */}
            {message && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-8 py-3 bg-white/90 backdrop-blur-md border border-slate-200/50 rounded-full shadow-[0_10px_30px_rgba(15,23,42,0.06)] text-slate-800 font-semibold text-sm sm:text-base tracking-wide flex items-center gap-2"
              >
                {state === "success" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1" />
                )}
                <span>{message}</span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MascotOverlay;
