// ─── CompanionShell ─────────────────────────────────────────────────
// Single floating, draggable dolphin mascot + speech-bubble.
// Mounted once at app root. Reads useCompanionStore for the active
// context + useCvBuilderStore for the mascot pose. Hosts skill
// renderers inside the bubble: CvBuilderSkill, CvIntakeSkill,
// DiagnosisResultsSkill.
//
// Phase 1b: when the active context supplies an `anchorId`, the mascot
// anchors next to that DOM section via Floating UI (flip + shift).
// Fallback: no anchor / drag → fixed bottom-right (Phase 1 behavior).

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import { MascotSticker, type MascotState } from "@/components/mascot/MascotSticker";
import { useCompanionStore, bubbleVisible } from "@/store/useCompanionStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { CvBuilderSkill } from "./skills/CvBuilderSkill";
import { CvIntakeSkill } from "./skills/CvIntakeSkill";
import { DiagnosisResultsSkill } from "./skills/DiagnosisResultsSkill";
import { DiagnosisProveItSkill } from "./skills/DiagnosisProveItSkill";
import { DiagnosisReviewSkill } from "./skills/DiagnosisReviewSkill";
import { ElementIssueSkill } from "./skills/ElementIssueSkill";
import type { ElementIssue } from "./skills/element-issues";

const POSE: Record<string, MascotState> = {
  idle: "idle",
  asking: "tip",
  thinking: "thinking",
  presenting: "tip",
};

const SUCCESS_DURATION = 1200; // ms

export function CompanionShell() {
  const activeId = useCompanionStore((s) => s.activeId);
  const contexts = useCompanionStore((s) => s.contexts);
  const bOpen = useCompanionStore((s) => s.bubbleOpen);
  const visible = useCompanionStore(bubbleVisible);
  const isDragging = useCompanionStore((s) => s.isDragging);
  const setDragging = useCompanionStore((s) => s.setDragging);
  const setPosition = useCompanionStore((s) => s.setPosition);
  const position = useCompanionStore((s) => s.position);
  const positionMode = useCompanionStore((s) => s.positionMode);
  const dismissActive = useCompanionStore((s) => s.dismissActive);
  const closeBubble = useCompanionStore((s) => s.closeBubble);
  const activateContext = useCompanionStore((s) => s.activateContext);

  const mascotState = useCvBuilderStore((s) => s.mascotState);
  const draftId = useCvBuilderStore((s) => s.draftId);

  const [showSuccess, setShowSuccess] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const activeReg = activeId ? contexts[activeId] : null;
  const turn = activeReg?.getTurn();
  const showBubble = visible && !!turn;

  // ── Anchor resolution (Phase 1b) ──
  // Re-resolve every render: the DOM element may mount after the context registers.
  const anchorId = activeReg?.anchorId;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!anchorId) { setAnchorEl(null); return; }
    // Resolve immediately + set up a MutationObserver to catch late-mounting elements
    setAnchorEl(document.getElementById(anchorId));
    // Scope observer to the diagnosis container when possible (perf)
    const scopeEl = document.getElementById("diagnosis-root") ?? document.body;
    const obs = new MutationObserver(() => {
      setAnchorEl(document.getElementById(anchorId));
    });
    obs.observe(scopeEl, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [anchorId]);

  // Anchored when: anchor exists + not dragging + position hasn't been manually set
  const anchored = !!anchorEl && !isDragging && positionMode !== "manual";

  // Floating UI: only active when anchored
  const { refs, floatingStyles } = useFloating({
    placement: "left-start",
    middleware: [offset(12), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  // Sync the reference element with the anchor
  useEffect(() => {
    if (anchored && anchorEl) {
      refs.setReference(anchorEl);
    } else {
      refs.setReference(null);
    }
  }, [anchored, anchorEl, refs]);

  // Pose: dragging → "swimming"; success flash → "success";
  // diagnosis advisory skills → "tip"; otherwise cv_intake/cv_builder follow mascotState.
  const isAdvisorySkill = turn?.skill === "diagnosis_results"
    || turn?.skill === "diagnosis_proveit"
    || turn?.skill === "diagnosis_review"
    || turn?.skill === "diagnosis_upload"
    || turn?.skill === "diagnosis_progress"
    || turn?.skill === "diagnosis_element_issue";
  const pose: MascotState = isDragging
    ? "swimming"
    : showSuccess
      ? "success"
      : isAdvisorySkill
        ? "tip"
        : (POSE[mascotState] ?? "idle");

  // Success pose after apply: flash for SUCCESS_DURATION, robustly cleaned up.
  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), SUCCESS_DURATION);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  // Reset position mode to "auto" when a NEW context becomes active (re-anchor).
  useEffect(() => {
    if (activeId) {
      useCompanionStore.setState({ positionMode: "auto" });
    }
  }, [activeId]);

  // ── Keyboard: Esc → dismiss bubble ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && bOpen) { dismissActive(); }
    },
    [bOpen, dismissActive],
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Focus trap: when bubble opens, focus the bubble ──
  useEffect(() => {
    if (showBubble && bubbleRef.current) {
      bubbleRef.current.focus();
    }
  }, [showBubble]);

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
      ref={anchored ? refs.setFloating : undefined}
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
      style={
        anchored
          ? { ...floatingStyles, zIndex: 60, touchAction: "none" }
          : { touchAction: "none" }
      }
      className={
        anchored
          ? "flex flex-col items-end gap-2"
          : "fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2"
      }
    >
      {/* Bubble */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            key="companion-bubble"
            ref={bubbleRef}
            role="dialog"
            aria-live="polite"
            aria-label="Companion assistant"
            tabIndex={-1}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-[min(360px,90vw)] max-h-[70vh] overflow-auto rounded-2xl border border-primary/10 bg-white p-4 shadow-xl focus:outline-none"
          >
            <button
              onClick={() => dismissActive()}
              className="float-right text-[#787774] hover:text-[#2F3437] transition-colors p-1 rounded"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* ── cv_builder ── */}
            {turn?.skill === "cv_builder" && (
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
            )}

            {/* ── cv_intake ── */}
            {turn?.skill === "cv_intake" && (
              <CvIntakeSkill
                key={`intake-${turn.props.entryIndex}`}
                draftId={(turn.props.draftId as string) ?? draftId ?? ""}
                entryIndex={turn.props.entryIndex as number}
                currentEntry={turn.props.currentEntry as {
                  company: string; position: string; startDate: string;
                  endDate: string; description: string; achievements: string;
                }}
                coachTrigger={turn.props.coachTrigger as
                  | "degraded" | "needs_detail" | "gate" | undefined}
                coachGap={turn.props.coachGap as string | null | undefined}
                seedNarrative={turn.props.seedNarrative as string | undefined}
                onApply={(fields) => {
                  (turn.props.onApply as (f: Record<string, string>) => void)(fields);
                  setShowSuccess(true);
                }}
              />
            )}

            {/* ── diagnosis_results ── */}
            {turn?.skill === "diagnosis_results" && (
              <DiagnosisResultsSkill
                action={turn.props.action as string}
                ctaKind={turn.props.ctaKind as "roadmap" | "builder"}
                onCta={turn.props.onCta as () => void}
              />
            )}

            {/* ── diagnosis_proveit ── */}
            {turn?.skill === "diagnosis_proveit" && (
              <DiagnosisProveItSkill
                displayName={turn.props.displayName as string}
                onCta={turn.props.onCta as () => void}
              />
            )}

            {/* ── diagnosis_review / diagnosis_upload ── */}
            {(turn?.skill === "diagnosis_review" || turn?.skill === "diagnosis_upload") && (
              <DiagnosisReviewSkill
                message={turn.props.message as string}
                ctaLabel={turn.props.ctaLabel as string | undefined}
                onCta={turn.props.onCta as (() => void) | undefined}
              />
            )}

            {/* ── diagnosis_element_issue (Pillar 1+2) ── */}
            {turn?.skill === "diagnosis_element_issue" && (
              <ElementIssueSkill
                issue={turn.props.issue as ElementIssue}
                index={turn.props.index as number}
                total={turn.props.total as number}
                onCta={turn.props.onCta as () => void}
                onDismiss={turn.props.onDismiss as () => void}
                onSnooze={turn.props.onSnooze as () => void}
              />
            )}
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
