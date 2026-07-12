import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MascotSticker } from "./MascotSticker";
import { useMascotStore } from "@/store/useMascotStore";

const getKickerText = (state: string, lang: string) => {
  const isVi = lang.startsWith("vi");
  if (state === "success") return isVi ? "Thành công" : "Success";
  if (state === "tip") return isVi ? "Gợi ý từ AI" : "AI Suggestion";
  return isVi ? "Thông báo" : "Notification";
};

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
  const { i18n } = useTranslation();

  const kicker = getKickerText(state, i18n.language);

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
              className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/20 backdrop-blur-sm pointer-events-auto"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-white/95 border border-slate-100 shadow-2xl rounded-2xl p-8 max-w-sm mx-4 flex flex-col items-center gap-4 text-center"
              >
                <MascotSticker state={state} size={180} interactive={false} />
                {message && (
                  <p className="text-lg font-bold text-slate-800 tracking-tight leading-snug">
                    {message}
                  </p>
                )}
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mt-2" />
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
                className="pointer-events-auto relative overflow-hidden bg-white/95 border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-4 pr-10 flex items-center gap-4 max-w-sm w-full"
              >
                <div className="flex-shrink-0">
                  <MascotSticker state={state} size={64} interactive={false} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-1">
                    {kicker}
                  </p>
                  {message && (
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => useMascotStore.getState().hide()}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: state === "tip" ? 3.2 : 2.2, ease: "linear" }}
                  className="absolute bottom-0 left-0 h-1 bg-primary"
                />
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

export default MascotOverlay;
