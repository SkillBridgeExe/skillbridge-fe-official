// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthBootstrap from "./AuthBootstrap";
import { bootstrapAuthSession } from "@/services/auth-session.service";

const authStoreMock = vi.hoisted(() => ({
  getState: vi.fn(() => ({
    authSource: "api",
    currentUser: { id: "user-1", role: "user" },
  })),
  hasHydrated: vi.fn(() => true),
  onFinishHydration: vi.fn(),
}));

const posthogMock = vi.hoisted(() => ({
  identify: vi.fn(),
}));

vi.mock("@posthog/react", () => ({
  usePostHog: () => posthogMock,
}));

vi.mock("@/services/auth-session.service", () => ({
  bootstrapAuthSession: vi.fn(),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: {
    getState: authStoreMock.getState,
    persist: {
      hasHydrated: authStoreMock.hasHydrated,
      onFinishHydration: authStoreMock.onFinishHydration,
    },
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("AuthBootstrap", () => {
  it("handles bootstrap rejection as a non-fatal error", async () => {
    const error = new Error("bootstrap failed");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(bootstrapAuthSession).mockRejectedValueOnce(error);

    render(<AuthBootstrap />);

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith("Failed to bootstrap auth session", error);
    });
    expect(posthogMock.identify).not.toHaveBeenCalled();
  });
});
