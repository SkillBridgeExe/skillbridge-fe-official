import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLoginErrorDescription, login } from "./auth.service";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiError } from "@/lib/api-error";

vi.mock("@/api/auth/login", () => ({
  loginApi: vi.fn(),
}));

vi.mock("@/api/auth/google", () => ({
  googleLoginApi: vi.fn(),
}));

const user = {
  id: "user-1",
  email: "user@example.com",
  displayName: "User Example",
  avatarUrl: "https://cdn.example.com/avatar.png",
  isEmailVerified: true,
  roles: ["USER"],
};

function stubLocalStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  });
}

describe("auth service session persistence", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    stubLocalStorage();
    useAuthStore.getState().logout();
  });

  it("keeps API access tokens out of localStorage after login", async () => {
    const { loginApi } = await import("@/api/auth/login");
    vi.mocked(loginApi).mockResolvedValue({
      success: true,
      message: "ok",
      data: {
        accessToken: "access-token",
        expiresIn: 3600,
        user,
      },
      errors: null,
    });

    await login("user@example.com", "secret");

    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().currentUser?.email).toBe("user@example.com");
    expect(useAuthStore.getState().currentUser?.avatar).toBe("https://cdn.example.com/avatar.png");
  });

  it("maps INVALID_CREDENTIALS to the localized login copy", () => {
    const message = getLoginErrorDescription(
      new ApiError("Invalid credentials", "INVALID_CREDENTIALS"),
      "Incorrect email or password.",
      "Login failed",
    );

    expect(message).toBe("Incorrect email or password.");
  });

  it("uses the generic fallback when a login error has no backend message", () => {
    const message = getLoginErrorDescription(
      { unexpected: true },
      "Incorrect email or password.",
      "Could not sign in. Please try again.",
    );

    expect(message).toBe("Could not sign in. Please try again.");
  });
});
