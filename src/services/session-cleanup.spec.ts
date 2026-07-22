// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/useAuthStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { wipeClientStateIfUserChanged } from "./session-cleanup";

/**
 * The cross-account PII wipe has been mis-implemented three times (R2/R4/R5).
 * These pin the exact invariant: wipe when a DIFFERENT user logs in, never on a
 * same-user re-login (which would destroy that user's own in-flight work), and
 * always record the incoming id so the NEXT different login can compare.
 */
describe("wipeClientStateIfUserChanged", () => {
  beforeEach(() => {
    useAuthStore.setState({ lastAuthedUserId: null });
    vi.restoreAllMocks();
  });
  afterEach(() => {
    useAuthStore.setState({ lastAuthedUserId: null });
  });

  it("wipes per-user state when a DIFFERENT user authenticates", () => {
    useAuthStore.setState({ lastAuthedUserId: "user-A" });
    const clearCache = vi.spyOn(queryClient, "clear");
    const resetDiagnosis = vi.spyOn(useDiagnosisStore.getState(), "reset");
    const resetBuilder = vi.spyOn(useCvBuilderStore.getState(), "reset");

    wipeClientStateIfUserChanged("user-B");

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(resetDiagnosis).toHaveBeenCalledTimes(1);
    expect(resetBuilder).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().lastAuthedUserId).toBe("user-B");
  });

  it("does NOT wipe on a same-user re-login (preserves in-flight work)", () => {
    useAuthStore.setState({ lastAuthedUserId: "user-A" });
    const clearCache = vi.spyOn(queryClient, "clear");
    const resetBuilder = vi.spyOn(useCvBuilderStore.getState(), "reset");

    wipeClientStateIfUserChanged("user-A");

    expect(clearCache).not.toHaveBeenCalled();
    expect(resetBuilder).not.toHaveBeenCalled();
    expect(useAuthStore.getState().lastAuthedUserId).toBe("user-A");
  });

  it("does NOT wipe on the first-ever login (no prior id) but records it", () => {
    const clearCache = vi.spyOn(queryClient, "clear");

    wipeClientStateIfUserChanged("user-A");

    expect(clearCache).not.toHaveBeenCalled();
    expect(useAuthStore.getState().lastAuthedUserId).toBe("user-A");
  });

  it("persists lastAuthedUserId so the compare survives a reload", () => {
    // The id MUST be in the persisted slice — else a reload nulls it and the
    // next different user's login skips the wipe (the R5 leak).
    useAuthStore.setState({ lastAuthedUserId: "user-A" });
    const persisted = JSON.parse(
      localStorage.getItem("skillbridge-auth") ?? "{}",
    );
    expect(persisted?.state?.lastAuthedUserId).toBe("user-A");
  });
});
