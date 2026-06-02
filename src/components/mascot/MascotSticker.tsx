import { motion, type Transition, type TargetAndTransition } from "framer-motion";
import { cn } from "@/lib/utils";
import laptopPng from "@/assets/mascot/laptop.png";
import lightbulbPng from "@/assets/mascot/lightbulb.png";
import thumbsUpPng from "@/assets/mascot/thumbs-up.png";
import heartsPng from "@/assets/mascot/hearts.png";

/**
 * SkillBridge mascot (blue dolphin) as an animated sticker.
 *
 * TIER 1 implementation: whole-image motion only (no cut-up parts needed).
 * Each `state` swaps to the matching pose PNG and plays a looping micro-animation
 * driven by Framer Motion (already in the project — zero new deps).
 *
 * - loading  → laptop pose, "typing bob" (fast vertical nudge) — perfect for the
 *              CV-scan / "AI đang xử lý" overlay.
 * - tip      → lightbulb pose, gentle float + scale "aha".
 * - success  → thumbs-up pose, celebratory bounce.
 * - love     → hearts pose, heartbeat + sway.
 * - idle     → laptop pose, slow breathing sway (the default "alive" state).
 *
 * Part-level motion (real typing, fin-wave, blink) is a future TIER 2 upgrade
 * that requires the pose cut into transparent layers — intentionally not done here.
 */
export type MascotState = "idle" | "loading" | "tip" | "success" | "love";

const POSE: Record<MascotState, string> = {
  idle: laptopPng,
  loading: laptopPng,
  tip: lightbulbPng,
  success: thumbsUpPng,
  love: heartsPng,
};

const MOTION: Record<MascotState, { animate: TargetAndTransition; transition: Transition }> = {
  // Slow float + sway, pivoting at the tail — like resting in water.
  idle: {
    animate: { y: [0, -5, 0], rotate: [-2.5, 2.5, -2.5] },
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
  },
  // Quick rhythmic dip = "đang gõ máy / đang xử lý".
  loading: {
    animate: { y: [0, -5, 0], rotate: [-1.5, 1.5, -1.5] },
    transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
  },
  // Bob up with a little scale "pop" on each rise.
  tip: {
    animate: { y: [0, -8, 0], scale: [1, 1.04, 1] },
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  },
  // Springy celebratory jump that settles.
  success: {
    animate: { y: [0, -14, 0, -5, 0], scale: [1, 1.06, 1, 1.02, 1] },
    transition: { duration: 1.3, repeat: Infinity, ease: "easeOut" },
  },
  // Double-beat heart pulse + gentle tilt.
  love: {
    animate: { scale: [1, 1.06, 1, 1.05, 1], rotate: [-2, 2, -2] },
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
};

export interface MascotStickerProps {
  state?: MascotState;
  /** Rendered width in px (height keeps aspect ratio). Default 160. */
  size?: number;
  className?: string;
  /** Disable hover/tap gestures (e.g. when used as a passive loading indicator). */
  interactive?: boolean;
}

export function MascotSticker({
  state = "idle",
  size = 160,
  className,
  interactive = true,
}: MascotStickerProps) {
  const { animate, transition } = MOTION[state];

  return (
    <motion.img
      src={POSE[state]}
      alt="SkillBridge mascot"
      draggable={false}
      style={{ width: size, height: "auto", transformOrigin: "bottom center" }}
      className={cn(
        "select-none drop-shadow-[0_10px_18px_rgba(56,130,246,0.20)]",
        className,
      )}
      animate={animate}
      transition={transition}
      whileHover={interactive ? { scale: 1.07 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
    />
  );
}

export default MascotSticker;
