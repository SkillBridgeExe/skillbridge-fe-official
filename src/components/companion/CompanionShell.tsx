// ─── CompanionShell ─────────────────────────────────────────────────
// Single floating, draggable dolphin mascot WITH a speech-bubble above it.
// Mounted once at app root. Reads useCompanionStore for the active
// context + useCvBuilderStore for the mascot pose. Hosts skill
// renderers inside the bubble: CvBuilderSkill, CvIntakeSkill,
// DiagnosisResultsSkill, etc.
//
// Architecture (unit model): the mascot + bubble are ONE visual unit — a
// dolphin with a speech bubble RIGHT ABOVE it. The UNIT is the Floating UI
// floating element; it anchors to the problem CARD (the active context's
// `anchorId`) so the dolphin "swims to" the card and speaks there. Bubble and
// mascot always move together. Three positioning modes:
//   1. anchored  — sits beside the card (Floating UI middleware keeps it on-screen)
//   2. manual    — the user dragged the dolphin; the unit detaches and stays put
//   3. fallback  — no anchor + not dragged → fixed bottom-right
// Dragging is initiated ONLY from the dolphin (dragControls), so clicking/typing
// inside the bubble never drags the unit.

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useDragControls, useMotionValue } from "framer-motion";
import { X } from "lucide-react";
import {
  useFloating,
  offset,
  flip,
  shift,
  size,
  autoUpdate,
  FloatingPortal,
} from "@floating-ui/react";
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

  // Drag is initiated ONLY from the dolphin (not the bubble), so typing/clicking
  // inside the bubble never drags the whole unit.
  const dragControls = useDragControls();
  // Persisted drag offset for the manual/fallback path. Framer owns the transform
  // for these motion values, so a parked unit stays exactly where it was dropped.
  // (Seeded from the store so it survives re-renders / re-anchor toggles.)
  const dragX = useMotionValue(position.x);
  const dragY = useMotionValue(position.y);

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

  // ── Positioning gate (restored on the UNIT) ──
  // anchored: the unit (bubble + dolphin) sits beside the card. We DROP the
  // anchor while the user is dragging (isDragging) or after they parked the unit
  // (positionMode === "manual"), so a dragged unit stays where it was dropped.
  // When neither anchored nor manual applies → fixed bottom-right fallback.
  const anchored = !!anchorEl && positionMode !== "manual" && !isDragging;

  // Floating UI for the UNIT — its own floating element referencing the card.
  // size() clamps the unit to the available viewport space (no edge clipping),
  // so the WHOLE unit (bubble + dolphin) stays on-screen near a viewport edge.
  const { refs, floatingStyles } = useFloating({
    placement: "right-start",
    // CRITICAL: position via top/left, NOT transform. This element is also a
    // framer `motion.div` with `drag`, which OWNS the CSS `transform` (its x/y
    // motion values). If Floating UI also wrote `transform` (the default), framer
    // would clobber it → the anchored unit collapses to translate(0,0) ≈ top-left
    // instead of sitting beside the card. top/left and framer's transform coexist.
    transform: false,
    middleware: [
      offset(12),
      flip(),
      shift({ padding: 12 }),
      size({
        padding: 12,
        apply({ availableWidth, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.max(0, availableWidth)}px`,
            maxHeight: `${Math.max(0, availableHeight)}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Sync the reference element with the resolved anchor card.
  useEffect(() => {
    refs.setReference(anchored ? anchorEl : null);
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

  // Note: re-anchoring after a drag is driven by the wiring hook's
  // resetPositionMode() on anchor change (Fix A) — advancing the issue queue
  // reuses ONE context id, so the shell never sees an activeId change; the hook
  // flips positionMode back to "auto" for a genuinely new card.

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

  // Keep the framer drag offset in sync with the stored position when NOT
  // actively dragging (framer owns the motion values mid-drag). This makes the
  // parked offset authoritative across re-anchor toggles / re-renders.
  useEffect(() => {
    if (isDragging) return;
    dragX.set(position.x);
    dragY.set(position.y);
  }, [position.x, position.y, isDragging, dragX, dragY]);

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
    <FloatingPortal>
      {/* ── THE UNIT — bubble (top) + dolphin (bottom), one positioned element.
            refs.setFloating anchors the whole unit to the card when `anchored`;
            otherwise it falls back to fixed bottom-right (+ the parked drag
            offset). Dragging is started only from the dolphin. ── */}
      <motion.div
        ref={refs.setFloating}
        drag
        dragMomentum={false}
        dragListener={false}
        dragControls={dragControls}
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
            ? // Anchored: Floating UI owns positioning via top/left (transform:false).
              { ...floatingStyles, zIndex: 70, touchAction: "none" }
            : positionMode === "manual" || isDragging
              ? // Manual: the user dragged/parked the unit → framer drives x/y so it
                // stays where it was dropped (fixed bottom-right + the drag offset).
                { x: dragX, y: dragY, touchAction: "none" }
              : // Pure fallback (no anchor, never dragged) → CLEAN bottom-right with
                // NO stale drag offset (a leftover offset would push it off-screen).
                { touchAction: "none" }
        }
        className={
          anchored
            ? "flex flex-col items-end gap-2"
            : "fixed bottom-6 right-6 z-[70] flex flex-col items-end gap-2"
        }
      >
        {/* ── Speech bubble (above the dolphin) ── */}
        <AnimatePresence>
          {showBubble && (
            <motion.div
              key="companion-bubble"
              // Pointer interactions inside the bubble must NOT bubble up to the
              // drag-enabled unit (extra safety on top of dragListener={false}).
              onPointerDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {/* The dialog box is an INNER plain div carrying ref/role/aria —
                  NOT the AnimatePresence-child motion.div. framer's PopChild reads
                  `.ref` off its direct child; a ref there triggers React's
                  "`ref` is not a prop" console error (deprecated in React 18.3+). */}
              <div
                ref={bubbleRef}
                role="dialog"
                aria-live="polite"
                aria-label="Companion assistant"
                tabIndex={-1}
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Dolphin mascot (below the bubble) — the drag handle ── */}
        <button
          onPointerDown={(e) => dragControls.start(e)}
          onClick={handleDolphinClick}
          className="cursor-grab active:cursor-grabbing focus:outline-none"
          aria-label="Companion mascot"
        >
          <MascotSticker state={pose} size={180} />
        </button>
      </motion.div>
    </FloatingPortal>
  );
}
