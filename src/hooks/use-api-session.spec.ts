import { describe, expect, it } from "vitest";
import { isApiSessionReady } from "./use-api-session";

describe("isApiSessionReady", () => {
  it("only allows authenticated API sessions", () => {
    expect(isApiSessionReady({
      authStatus: "authenticated",
      authSource: "api",
      isAuthenticated: true,
    })).toBe(true);

    expect(isApiSessionReady({
      authStatus: "authenticated",
      authSource: "mock",
      isAuthenticated: true,
    })).toBe(false);

    expect(isApiSessionReady({
      authStatus: "checking",
      authSource: "api",
      isAuthenticated: true,
    })).toBe(false);

    expect(isApiSessionReady({
      authStatus: "anonymous",
      authSource: null,
      isAuthenticated: false,
    })).toBe(false);
  });
});
