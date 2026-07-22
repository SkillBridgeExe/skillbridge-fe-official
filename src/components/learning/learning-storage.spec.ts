import { describe, expect, it } from "vitest";
import {
  canUsePersistedRoadmap,
  getSessionProgressStorageKey,
} from "./learning-storage";

describe("learning local storage isolation", () => {
  it("scopes session progress keys to the authenticated user", () => {
    expect(getSessionProgressStorageKey("user-1", "roadmap-react")).toBe(
      "skillbridge:learning-session-progress:user-1:roadmap-react",
    );
    expect(getSessionProgressStorageKey("user-2", "roadmap-react")).not.toBe(
      getSessionProgressStorageKey("user-1", "roadmap-react"),
    );
  });

  it("hides a persisted roadmap from every account except its owner", () => {
    expect(canUsePersistedRoadmap("user-1", "user-1")).toBe(true);
    expect(canUsePersistedRoadmap("user-1", "user-2")).toBe(false);
    expect(canUsePersistedRoadmap(null, "user-1")).toBe(false);
    expect(canUsePersistedRoadmap("user-1", null)).toBe(false);
  });
});
