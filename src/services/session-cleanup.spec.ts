// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/useAuthStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useRoadmapStore } from "@/components/learning/roadmap-store";
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

  it("wipes ALL per-user stores when a DIFFERENT user authenticates", () => {
    useAuthStore.setState({ lastAuthedUserId: "user-A" });
    const clearCache = vi.spyOn(queryClient, "clear");
    const resetDiagnosis = vi.spyOn(useDiagnosisStore.getState(), "reset");
    const resetBuilder = vi.spyOn(useCvBuilderStore.getState(), "reset");
    // The learning roadmap is derived from the user's CV gaps — must be wiped too.
    const clearRoadmap = vi.spyOn(useRoadmapStore.getState(), "clearRoadmap");

    wipeClientStateIfUserChanged("user-B");

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(resetDiagnosis).toHaveBeenCalledTimes(1);
    expect(resetBuilder).toHaveBeenCalledTimes(1);
    expect(clearRoadmap).toHaveBeenCalledTimes(1);
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

  it("wipes defensively when there is NO proven prior user (fresh / pre-marker browser)", () => {
    // prev=null is not proof of same-user: a browser whose last login predates
    // the persisted marker may still hold stale per-user data. Wipe to close it.
    const clearCache = vi.spyOn(queryClient, "clear");

    wipeClientStateIfUserChanged("user-A");

    expect(clearCache).toHaveBeenCalledTimes(1);
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
