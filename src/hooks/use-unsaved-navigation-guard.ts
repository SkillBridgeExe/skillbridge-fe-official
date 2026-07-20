import { useEffect } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";

export type BlockedNavigationState = "blocked" | "unblocked" | "proceeding";
export type BlockedNavigationAction = "proceed" | "reset" | "none";

export function resolveBlockedNavigation(
  state: BlockedNavigationState,
  confirmed: boolean,
): BlockedNavigationAction {
  if (state !== "blocked") return "none";
  return confirmed ? "proceed" : "reset";
}

/** Data-router guard for in-app transitions and document unloads. */
export function useUnsavedNavigationGuard(
  dirty: boolean,
  message = "You have unsaved changes. Leave this editor?",
) {
  const blocker = useBlocker(dirty);

  useBeforeUnload((event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  useEffect(() => {
    const action = resolveBlockedNavigation(
      blocker.state,
      blocker.state === "blocked" ? window.confirm(message) : false,
    );
    if (action === "proceed") blocker.proceed?.();
    if (action === "reset") blocker.reset?.();
  }, [blocker, message]);
}
