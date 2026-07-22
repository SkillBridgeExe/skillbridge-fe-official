// ─── Session cleanup ───────────────────────────────────────────────
// Single wipe of all per-user CLIENT state. The TanStack Query cache keys
// are global (['user','profile'], ['billing','entitlements'], …), not
// user-scoped, and the diagnosis/CV-builder stores hold parsed-CV PII — so
// on ANY session end (manual logout OR involuntary 401/token-expiry) they
// must be cleared, else the next account on the same tab reads the previous
// user's data (bug hunt R2/R3 07-22). Both paths call this one function.

import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/useAuthStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";

export function clearPerUserClientState(): void {
  queryClient.clear();
  // reset() also rewrites the persisted sessionStorage/localStorage entries.
  useDiagnosisStore.getState().reset();
  useCvBuilderStore.getState().reset();
}

/**
 * Wipe per-user state at LOGIN, only when a DIFFERENT user is authenticating on
 * this tab. This closes the cross-account leak without tying the wipe to a
 * transient 401 (which fires on a recoverable refresh blip and would destroy
 * the SAME user's unsaved in-flight CV/diagnosis work — bug hunt R4 07-22).
 */
export function wipeClientStateIfUserChanged(newUserId: string): void {
  const prev = useAuthStore.getState().lastAuthedUserId;
  if (prev && prev !== newUserId) clearPerUserClientState();
  useAuthStore.setState({ lastAuthedUserId: newUserId });
}
