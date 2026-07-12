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
  const blocking = useMascotStore((s) => s.blocking);

  return (
    <AnimatePresence>
      {active && (
        <>
          {blocking ? (
            /* Blocking mode: Full screen loading/scanning */
            <motion.div
              key="mascot-blocking-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm pointer-events-auto"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-white/95 border border-slate-200/50 shadow-2xl rounded-2xl p-8 max-w-sm mx-4 flex flex-col items-center gap-4 text-center"
              >
                <MascotSticker state={state} size={200} interactive={false} />
                {message && (
                  <p className="text-lg font-bold text-slate-800 tracking-tight leading-snug">
                    {message}
                  </p>
                )}
              </motion.div>
            </motion.div>
          ) : (
            /* Non-blocking mode: Floating toast at bottom-right */
            <div className="fixed bottom-6 right-6 z-[200] pointer-events-none px-4 w-full sm:max-w-md flex justify-end">
              <motion.div
                key="mascot-toast"
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="pointer-events-auto bg-white/95 border border-slate-200/60 shadow-[0_10px_30px_rgba(15,23,42,0.15)] rounded-2xl p-4 flex items-center gap-4 max-w-sm w-full"
              >
                <div className="flex-shrink-0 bg-primary/5 rounded-xl p-1">
                  <MascotSticker state={state} size={80} interactive={false} />
                </div>
                <div className="flex-1 min-w-0">
                  {message && (
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {message}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

export default MascotOverlay;
