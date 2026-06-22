// ─── CompanionShell ─────────────────────────────────────────────────
// Single floating, draggable dolphin mascot + speech-bubble.
// Mounted once at app root. Reads useCompanionStore for the active
// context + useCvBuilderStore for the mascot pose. Hosts CvBuilderSkill
// inside the bubble.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { MascotSticker, type MascotState } from "@/components/mascot/MascotSticker";
import { useCompanionStore, bubbleVisible } from "@/store/useCompanionStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { CvBuilderSkill } from "./skills/CvBuilderSkill";

const POSE: Record<string, MascotState> = {
  idle: "idle",
  asking: "tip",
  thinking: "video_laptop1",
  presenting: "tip",
};

const SUCCESS_DURATION = 1200; // ms

export function CompanionShell() {
  const activeId = useCompanionStore((s) => s.activeId);
  const contexts = useCompanionStore((s) => s.contexts);
  const bOpen = useCompanionStore((s) => s.bubbleOpen);
  const visible = useCompanionStore(bubbleVisible);
  const setDragging = useCompanionStore((s) => s.setDragging);
  const setPosition = useCompanionStore((s) => s.setPosition);
  const position = useCompanionStore((s) => s.position);
  const dismissActive = useCompanionStore((s) => s.dismissActive);
  const closeBubble = useCompanionStore((s) => s.closeBubble);
  const activateContext = useCompanionStore((s) => s.activateContext);

  const mascotState = useCvBuilderStore((s) => s.mascotState);
  const draftId = useCvBuilderStore((s) => s.draftId);

  const [showSuccess, setShowSuccess] = useState(false);

  const activeReg = activeId ? contexts[activeId] : null;
  const turn = activeReg?.getTurn();
  const showBubble = visible && !!turn;

  // Success pose after apply: flash for SUCCESS_DURATION, robustly cleaned up.
  const pose: MascotState = showSuccess ? "success" : (POSE[mascotState] ?? "idle");
  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), SUCCESS_DURATION);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  // Don't render if no contexts are registered
  if (Object.keys(contexts).length === 0) return null;

  const handleDolphinClick = () => {
    if (bOpen) {
      closeBubble();
    } else if (activeId) {
      // Re-open (user-initiated, bypasses dismiss memory)
      activateContext(activeId);
      // Force bubble open even if dismissed
      useCompanionStore.setState({ bubbleOpen: true });
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={() => setDragging(true)}
      onDragEnd={(_e, info) => {
        setDragging(false);
        setPosition(
          position.x + info.offset.x,
          position.y + info.offset.y,
        );
      }}
      className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2"
      style={{ touchAction: "none" }}
    >
      {/* Bubble */}
      <AnimatePresence>
        {showBubble && turn?.skill === "cv_builder" && (
          <motion.div
            key="companion-bubble"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-[360px] max-h-[70vh] overflow-auto rounded-2xl border border-primary/10 bg-white p-4 shadow-xl"
          >
            <button
              onClick={() => dismissActive()}
              className="float-right text-[#787774] hover:text-[#2F3437] transition-colors p-1 rounded"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <CvBuilderSkill
              key={turn.props.fieldPath as string}
              draftId={(turn.props.draftId as string) ?? draftId ?? ""}
              fieldPath={turn.props.fieldPath as string}
              section={turn.props.section as "projects" | "experience" | "summary"}
              currentValue={turn.props.currentValue as string}
              onApply={(after) => {
                (turn.props.onApply as (a: string) => void)(after);
                setShowSuccess(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dolphin mascot */}
      <button
        onClick={handleDolphinClick}
        className="cursor-pointer focus:outline-none"
        aria-label="Companion mascot"
      >
        <MascotSticker state={pose} size={96} />
      </button>
    </motion.div>
  );
}
