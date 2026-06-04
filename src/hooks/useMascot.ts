import { useCallback, useRef } from "react";
import { useMascotStore } from "@/store/useMascotStore";
import type { MascotState } from "@/components/mascot/MascotSticker";

/**
 * The 4 mascot hooks. Each surfaces the dolphin in a given mood from anywhere
 * in the app. The global <MascotOverlay/> (mounted at app root) renders it.
 *
 *   const { show, hide } = useMascotLoading();
 *   show("AI đang quét CV...");          // dolphin loading overlay appears
 *   await scanCv();
 *   hide();                              // overlay disappears
 *
 *   const { celebrate } = useMascotSuccess();
 *   celebrate("Hoàn thành!");            // success dolphin pops, auto-dismisses
 */

/** Persistent full-screen loading dolphin. show() before async work, hide() after. */
export function useMascotLoading() {
  const show = useMascotStore((s) => s.show);
  const hide = useMascotStore((s) => s.hide);
  const isLoading = useMascotStore((s) => s.active && s.state === "loading");

  return {
    isLoading,
    show: useCallback(
      (message?: string) => show({ state: "loading", message, blocking: true }),
      [show],
    ),
    hide,
  };
}

/** Persistent full-screen video loading dolphin (uses MP4 laptop animation). */
export function useMascotVideoLoading() {
  const show = useMascotStore((s) => s.show);
  const hide = useMascotStore((s) => s.hide);
  const isLoading = useMascotStore((s) => s.active && s.state === "video_loading");

  return {
    isLoading,
    show: useCallback(
      (message?: string) => show({ state: "video_loading", message, blocking: true }),
      [show],
    ),
    hide,
  };
}

/** Persistent full-screen video loading laptop1 (uses MP4 laptop1 animation). */
export function useMascotLaptop1Loading() {
  const show = useMascotStore((s) => s.show);
  const hide = useMascotStore((s) => s.hide);
  const isLoading = useMascotStore((s) => s.active && s.state === "video_laptop1");

  return {
    isLoading,
    show: useCallback(
      (message?: string) => show({ state: "video_laptop1", message, blocking: true }),
      [show],
    ),
    hide,
  };
}

/** Shared impl for the auto-dismissing moods (success / love / tip). */
function useTransientMascot(state: MascotState, defaultDuration: number) {
  const show = useMascotStore((s) => s.show);
  const hide = useMascotStore((s) => s.hide);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (message?: string, durationMs: number = defaultDuration) => {
      if (timer.current) clearTimeout(timer.current);
      show({ state, message, blocking: false });
      timer.current = setTimeout(() => hide(), durationMs);
    },
    [show, hide, state, defaultDuration],
  );
}

/** One-shot success dolphin (👍, auto-dismiss ~2.2s). */
export function useMascotSuccess() {
  return { celebrate: useTransientMascot("success", 2200) };
}

/** One-shot "thanks / favorited" dolphin (❤️, auto-dismiss ~2.2s). */
export function useMascotLove() {
  return { love: useTransientMascot("love", 2200) };
}

/** AI tip dolphin (💡, auto-dismiss ~3.2s — tips read longer). */
export function useMascotTip() {
  return { showTip: useTransientMascot("tip", 3200) };
}
