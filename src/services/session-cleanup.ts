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
import { useRoadmapStore } from "@/components/learning/roadmap-store";

export function clearPerUserClientState(): void {
  queryClient.clear();
  // reset()/clearRoadmap() also rewrite the persisted sessionStorage/localStorage
  // entries. Every store holding data DERIVED FROM THE USER's CV must be here —
  // the learning roadmap is built from the user's gap analysis (bug hunt R6).
  useDiagnosisStore.getState().reset();
  useCvBuilderStore.getState().reset();
  useRoadmapStore.getState().clearRoadmap();
}

/**
 * Wipe per-user state at LOGIN, only when a DIFFERENT user is authenticating on
 * this tab. This closes the cross-account leak without tying the wipe to a
 * transient 401 (which fires on a recoverable refresh blip and would destroy
 * the SAME user's unsaved in-flight CV/diagnosis work — bug hunt R4 07-22).
 */
export function wipeClientStateIfUserChanged(newUserId: string): void {
  const prev = useAuthStore.getState().lastAuthedUserId;
  // Wipe UNLESS we can prove it's the same user (prev === newUserId). A null
  // prev is NOT proof — it happens on a fresh browser (nothing to wipe, harmless)
  // AND on a browser whose last login predates this marker being persisted, where
  // stale per-user data may still sit in storage. Wiping defensively there closes
  // that migration window without ever wiping a proven same-user re-login, so the
  // R4 "don't destroy in-flight work on a transient blip" guarantee still holds
  // (post-fix sessions always have prev set). (bug hunt R6 07-22)
  if (prev !== newUserId) clearPerUserClientState();
  useAuthStore.setState({ lastAuthedUserId: newUserId });
}
