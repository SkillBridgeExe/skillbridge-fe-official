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
import { useCompanionStore, bubbleVisible, isChatBusy } from "@/store/useCompanionStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { CvBuilderSkill } from "./skills/CvBuilderSkill";
import { CvIntakeSkill } from "./skills/CvIntakeSkill";
import { CvProjectIntakeSkill } from "./skills/CvProjectIntakeSkill";
import { DiagnosisResultsSkill } from "./skills/DiagnosisResultsSkill";
import { DiagnosisReviewSkill } from "./skills/DiagnosisReviewSkill";
import { ElementIssueSkill } from "./skills/ElementIssueSkill";
import { DiagnosisCommentarySkill } from "./skills/DiagnosisCommentarySkill";
import { DiagnosisChatSkill } from "./skills/DiagnosisChatSkill";
import { LearningChatSkill } from "./skills/LearningChatSkill";
import type { ElementIssue } from "./skills/element-issues";
import type { ChatActionChip } from "./skills/chat-action-chips";

const POSE: Record<string, MascotState> = {
  idle: "idle",
  asking: "tip",
  thinking: "thinking",
  presenting: "tip",
};

/**
 * Pose for the CHAT skills (Wave 1): a pure function of two store facts — a reply in
 * flight, and the latest gate verdict (answer_kind). The LLM is never in the animation
 * loop: thinking covers the whole round-trip latency, sheepish owns a refusal, confident
 * owns a grounded answer, and everything else keeps the advisor's default lightbulb.
 * Exported for its spec.
 */
export function chatPose(
  busy: boolean,
  tone: "grounded" | "refusal" | "canned" | null,
): MascotState {
  if (busy) return "thinking";
  if (tone === "refusal") return "sheepish";
  if (tone === "grounded") return "confident";
  return "tip";
}

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
  const suspended = useCompanionStore((s) => s.suspended);
  // Subscribe to the live chat thread so the bubble RE-RENDERS when a message is
  // appended / resolved / failed. The diagnosis_chat turn live-reads chatMessages
  // inside getTurn(), but getTurn() only re-runs when this component re-renders —
  // without subscribing here, a send mutates the store yet the shell never re-renders,
  // so the thread stays frozen until an unrelated state change forces a repaint.
  const chatMessages = useCompanionStore((s) => s.chatMessages);
  // Derive the in-flight flag from the thread itself (is there a pending assistant
  // row?) instead of the hook's propsRef.isPending. propsRef.isPending flips on the
  // hook HOST's render when the mutation settles, which does NOT re-render this shell
  // (only a chatMessages change does) — so reading it here leaves the composer/retry
  // stuck disabled after a send resolves/fails. The pending row IS in chatMessages,
  // which we subscribe to, so this stays reactive.
  // chatActionPending (store-backed) ORs in a confirmed chip action's own network
  // call (e.g. view_match's loadMatchForChat) — same disable, no fake chat row.
  const chatActionPending = useCompanionStore((s) => s.chatActionPending);
  // isChatBusy is the SHARED definition — the send/retry guards read the very same predicate
  // live from the store, so the composer's enabled state and "will this send actually fire?"
  // can never disagree again (they did: the guard closed over a stale flag → dead chat).
  const chatPending = isChatBusy({ chatMessages, chatActionPending });
  // Subscribe to the store-backed opener + chips so the bubble REPAINTS when the user
  // switches tabs (focus change). The hook pushes these via setChatDisplay; reading them
  // from the subscribed store — not turn.props — is what makes the swap live on tab switch.
  const chatOpener = useCompanionStore((s) => s.chatOpener);
  const chatSuggestions = useCompanionStore((s) => s.chatSuggestions);
  const chatPendingAction = useCompanionStore((s) => s.chatPendingAction);
  // Wave 2: memory mirror — store-backed (same repaint reason as chatOpener).
  const chatKnownState = useCompanionStore((s) => s.chatKnownState);

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
  // Hide the bubble WHILE dragging the dolphin (it re-appears on drop, re-positioned
  // by FU-B against the dolphin's final spot) — avoids the bubble lagging the dolphin
  // mid-drag and keeps the drag gesture clean.
  const showBubble = visible && !!turn && !isDragging;

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

  // ── FU-B: the BUBBLE anchors to the DOLPHIN (its reference is the dolphin element,
  // NOT the card). placement "top" + flip()+shift()+size() means the bubble auto-flips
  // below / shifts inward / clamps wherever the dolphin ends up — anchored beside a
  // card, dragged to ANY edge, or the fallback corner. This is what makes the bubble
  // NEVER occluded in every mode (the old single-FU clip only ran in anchored mode). ──
  const dolphinNodeRef = useRef<HTMLDivElement | null>(null);
  const bubbleFloat = useFloating({
    placement: "top",
    transform: false, // top/left, so framer's scale-pop transform never clobbers it
    middleware: [
      offset(10),
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

  // The dolphin wrapper is BOTH FU-A's floating element AND FU-B's reference AND the
  // node we measure for the drop-clamp — one stable merged callback ref (refs objects
  // are stable, so this never thrashes the ref on re-render).
  const setDolphinRef = useCallback(
    (node: HTMLDivElement | null) => {
      dolphinNodeRef.current = node;
      refs.setFloating(node);
      bubbleFloat.refs.setReference(node);
    },
    [refs, bubbleFloat.refs],
  );

  // Pose: dragging → "swimming"; success flash → "success"; chat skills → event-driven
  // emotion (Wave 1); other advisory skills → "tip"; cv_intake/cv_builder follow mascotState.
  const isChatSkill = turn?.skill === "diagnosis_chat" || turn?.skill === "learning_chat" || turn?.skill === "cv_builder_chat";
  const isAdvisorySkill = turn?.skill === "diagnosis_results"
    || turn?.skill === "diagnosis_review"
    || turn?.skill === "diagnosis_upload"
    || turn?.skill === "diagnosis_progress"
    || turn?.skill === "diagnosis_element_issue"
    || turn?.skill === "diagnosis_commentary";
  const chatAnswerTone = useCompanionStore((s) => s.chatAnswerTone);
  const pose: MascotState = isDragging
    ? "swimming"
    : showSuccess
      ? "success"
      : isChatSkill
        ? chatPose(chatPending, chatAnswerTone)
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
  if (suspended || Object.keys(contexts).length === 0) return null;

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
      {/* ── DOLPHIN — FU-A floating element (anchored to the active issue's card via
            refs.setFloating) + framer drag root + FU-B's reference. The bubble is a
            SEPARATE element (below) anchored to THIS via FU-B, so it never clips. ── */}
      <motion.div
        ref={setDolphinRef}
        drag
        dragMomentum={false}
        dragListener={false}
        dragControls={dragControls}
        onDragStart={() => setDragging(true)}
        onDragEnd={(_e, info) => {
          setDragging(false);
          let nx = position.x + info.offset.x;
          let ny = position.y + info.offset.y;
          // Clamp so the DOLPHIN itself never lands off-screen (the bubble is kept on
          // screen independently by FU-B). Measure the just-dropped on-screen box.
          const node = dolphinNodeRef.current;
          if (node && typeof window !== "undefined") {
            const r = node.getBoundingClientRect();
            const m = 8;
            if (r.left < m) nx += m - r.left;
            else if (r.right > window.innerWidth - m) nx -= r.right - (window.innerWidth - m);
            if (r.top < m) ny += m - r.top;
            else if (r.bottom > window.innerHeight - m) ny -= r.bottom - (window.innerHeight - m);
          }
          setPosition(nx, ny);
        }}
        style={
          anchored
            ? // Anchored: FU-A owns positioning via top/left (transform:false).
              { ...floatingStyles, zIndex: 20, touchAction: "none" }
            : positionMode === "manual" || isDragging
              ? // Manual: framer drives x/y so a parked dolphin stays where dropped.
                { x: dragX, y: dragY, touchAction: "none" }
              : // Pure fallback (no anchor, never dragged) → clean bottom-right.
                { touchAction: "none" }
        }
        className={anchored ? "z-[20]" : "fixed bottom-6 right-6 z-[20]"}
      >
        <button
          onPointerDown={(e) => dragControls.start(e)}
          onClick={handleDolphinClick}
          className="cursor-grab active:cursor-grabbing focus:outline-none"
          aria-label="Companion mascot"
        >
          <MascotSticker state={pose} size={200} />
        </button>
      </motion.div>

      {/* ── BUBBLE — FU-B floating element, anchored to the dolphin so it auto-flips/
            shifts to stay on-screen in EVERY mode. The plain wrapper holds the FU
            position; the inner motion.div animates (scale-only, no y → no transform
            fight with FU-B's top/left); the dialog div carries the ref/role (a ref on
            the AnimatePresence child triggers framer's "`ref` is not a prop"). ── */}
      <div
        ref={bubbleFloat.refs.setFloating}
        style={{ ...bubbleFloat.floatingStyles, zIndex: 21 }}
      >
        <AnimatePresence>
          {showBubble && (
            <motion.div
              key="companion-bubble"
              onPointerDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
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

              {/* ── cv_project_intake ── */}
              {turn?.skill === "cv_project_intake" && (
                <CvProjectIntakeSkill
                  key={`project-intake-${turn.props.entryIndex}`}
                  draftId={(turn.props.draftId as string) ?? draftId ?? ""}
                  entryIndex={turn.props.entryIndex as number}
                  currentEntry={turn.props.currentEntry as {
                    name: string; role: string; tools: string;
                    link: string; description: string;
                  }}
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

              {/* ── diagnosis_commentary (Phase A grounded commentary) ── */}
              {turn?.skill === "diagnosis_commentary" && (
                <DiagnosisCommentarySkill
                  issue={turn.props.issue as ElementIssue}
                  onCta={turn.props.onCta as () => void}
                  onDismiss={turn.props.onDismiss as (() => void) | undefined}
                />
              )}

              {/* ── diagnosis_chat (calm corner advisor — chat-driven, owner decision 06-23) ── */}
              {turn?.skill === "diagnosis_chat" && (
                <DiagnosisChatSkill
                  messages={chatMessages}
                  opener={chatOpener}
                  suggestions={chatSuggestions}
                  onSend={turn.props.onSend as (q: string) => void}
                  onSuggestionTap={turn.props.onSuggestionTap as ((q: string) => void) | undefined}
                  onRetry={turn.props.onRetry as (index: number) => void}
                  onDeleteThread={turn.props.onDeleteThread as (() => void) | undefined}
                  onAction={turn.props.onAction as ((chip: ChatActionChip) => void) | undefined}
                  pendingAction={chatPendingAction}
                  onConfirmAction={turn.props.onConfirmAction as (() => void) | undefined}
                  onCancelAction={turn.props.onCancelAction as (() => void) | undefined}
                  isPending={chatPending}
                  knownState={chatKnownState}
                />
              )}

              {/* ── learning_chat (Task M3 — corner advisor on a Learning session page) ── */}
              {turn?.skill === "learning_chat" && (
                <LearningChatSkill
                  messages={chatMessages}
                  opener={chatOpener}
                  suggestions={chatSuggestions}
                  onSend={turn.props.onSend as (q: string) => void}
                  onRetry={turn.props.onRetry as (index: number) => void}
                  isPending={chatPending}
                />
              )}

              {/* ── cv_builder_chat (Slice 5 — CV builder writing companion) ── */}
              {turn?.skill === "cv_builder_chat" && (
                <DiagnosisChatSkill
                  messages={chatMessages}
                  opener={chatOpener}
                  suggestions={chatSuggestions}
                  onSend={turn.props.onSend as (q: string) => void}
                  onSuggestionTap={turn.props.onSuggestionTap as ((q: string) => void) | undefined}
                  onRetry={turn.props.onRetry as (index: number) => void}
                  onDeleteThread={turn.props.onDeleteThread as (() => void) | undefined}
                  onAction={turn.props.onAction as ((chip: ChatActionChip) => void) | undefined}
                  pendingAction={chatPendingAction}
                  onConfirmAction={turn.props.onConfirmAction as (() => void) | undefined}
                  onCancelAction={turn.props.onCancelAction as (() => void) | undefined}
                  isPending={chatPending}
                  knownState={chatKnownState}
                  placeholderKey="companion.cvChat.placeholder"
                  positioningKey="companion.cvChat.positioning"
                />
              )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FloatingPortal>
  );
}
