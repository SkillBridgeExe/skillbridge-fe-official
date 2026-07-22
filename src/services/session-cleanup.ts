// ─── Session cleanup ───────────────────────────────────────────────
// Single wipe of all per-user CLIENT state. The TanStack Query cache keys
// are global (['user','profile'], ['billing','entitlements'], …), not
// user-scoped, and the diagnosis/CV-builder stores hold parsed-CV PII — so
// on ANY session end (manual logout OR involuntary 401/token-expiry) they
// must be cleared, else the next account on the same tab reads the previous
// user's data (bug hunt R2/R3 07-22). Both paths call this one function.

import { queryClient } from "@/lib/query-client";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";

export function clearPerUserClientState(): void {
  queryClient.clear();
  // reset() also rewrites the persisted sessionStorage/localStorage entries.
  useDiagnosisStore.getState().reset();
  useCvBuilderStore.getState().reset();
}
