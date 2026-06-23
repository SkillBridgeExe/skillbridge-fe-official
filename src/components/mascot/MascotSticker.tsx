import { motion, useReducedMotion, type Transition, type TargetAndTransition } from "framer-motion";
import { cn } from "@/lib/utils";
import laptopPng from "@/assets/mascot/laptop.png";
import lightbulbPng from "@/assets/mascot/lightbulb.png";
import thumbsUpPng from "@/assets/mascot/thumbs-up.png";
import heartsPng from "@/assets/mascot/hearts.png";
import swimmingPng from "@/assets/mascot/Swimming.png";
import thinkingPng from "@/assets/mascot/thinking.png";
import { MascotVideo } from "./MascotVideo";

/**
 * SkillBridge mascot (blue dolphin) as an animated sticker.
 *
 * TIER 1 implementation: whole-image motion only (no cut-up parts needed).
 * Each `state` swaps to the matching pose PNG and plays a looping micro-animation
 * driven by Framer Motion (already in the project — zero new deps).
 *
 * - loading       → laptop pose, "typing bob" (fast vertical nudge) — perfect for the
 *                   CV-scan / "AI đang xử lý" overlay.
 * - video_loading → video-based laptop loading animation using dolphin.mp4 (more interactive).
 * - tip           → lightbulb pose, gentle float + scale "aha".
 * - success       → thumbs-up pose, celebratory bounce.
 * - love          → hearts pose, heartbeat + sway.
 * - swimming      → swimming pose, side-to-side undulation — shown while the user DRAGS the mascot.
 * - idle          → laptop pose, slow breathing sway (the default "alive" state).
 */
export type MascotState =
  | "idle"
  | "loading"
  | "tip"
  | "success"
  | "love"
  | "swimming"
  | "thinking"
  | "video_loading"
  | "video_laptop1";

const POSE: Record<MascotState, string> = {
  idle: laptopPng,
  loading: laptopPng,
  tip: lightbulbPng,
  success: thumbsUpPng,
  love: heartsPng,
  swimming: swimmingPng,
  thinking: thinkingPng,
  video_loading: "", // Video doesn't use PNG pose
  video_laptop1: "", // Video doesn't use PNG pose
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
  // Side-to-side undulation + forward bob = "đang bơi" (while the user drags the mascot).
  swimming: {
    animate: { x: [0, -4, 4, 0], y: [0, -3, 0, -3, 0], rotate: [-6, 6, -6] },
    transition: { duration: 0.7, repeat: Infinity, ease: "easeInOut" },
  },
  // Slow pondering tilt side-to-side + soft bob = "đang suy nghĩ" (AI is processing).
  thinking: {
    animate: { y: [0, -3, 0], rotate: [0, -5, 0, 5, 0] },
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
  },
  // Video loading: video itself has animation, so we leave this empty.
  video_loading: {
    animate: {},
    transition: {},
  },
  video_laptop1: {
    animate: {},
    transition: {},
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
  const prefersReducedMotion = useReducedMotion();
  // Tăng kích thước 1.3 lần riêng cho state 'love' để bù trừ khoảng trống thừa của file ảnh hearts.png
  const adjustedSize = state === "love" ? size * 1.3 : size;

  if (state === "video_loading") {
    return <MascotVideo size={adjustedSize} className={className} type="dolphin" />;
  }
  if (state === "video_laptop1") {
    return <MascotVideo size={adjustedSize} className={className} type="laptop1" />;
  }

  const motionDef = MOTION[state];
  // WCAG: respect prefers-reduced-motion — disable repeat-Infinity loops
  const animate = prefersReducedMotion ? {} : motionDef.animate;
  const transition = prefersReducedMotion ? {} : motionDef.transition;

  return (
    <motion.img
      src={POSE[state]}
      alt="SkillBridge mascot"
      draggable={false}
      style={{
        width: adjustedSize,
        aspectRatio: "1 / 1",
        objectFit: "contain",
        transformOrigin: "bottom center",
        // Đặt lề âm để kéo chữ sát lại gần chú cá heo
        marginBottom: state === "love" ? -16 : 0
      }}
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
