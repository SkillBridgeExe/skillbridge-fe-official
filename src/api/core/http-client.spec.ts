import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { httpClient } from "./http-client";
import { bootstrapAuthSession } from "@/services/auth-session.service";
import { useAuthStore } from "@/store/useAuthStore";

function response<T>(
  config: InternalAxiosRequestConfig,
  status: number,
  data: T,
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? "OK" : "Unauthorized",
    headers: {},
    config,
  };
}

function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError(
    "Unauthorized",
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    response(config, 401, { success: false, message: "Unauthorized", data: null }),
  );
}

function serviceUnavailable(config: InternalAxiosRequestConfig) {
  return new AxiosError(
    "Service Unavailable",
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    response(config, 503, { success: false, message: "Service Unavailable", data: null }),
  );
}

function stubLocalStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  });
}

describe("httpClient refresh handling", () => {
  beforeEach(() => {
    stubLocalStorage();
    useAuthStore.getState().logout();
  });

  afterEach(() => {
    httpClient.defaults.adapter = undefined;
    vi.unstubAllGlobals();
  });

  it("refreshes once and retries the original request after a 401", async () => {
    const calls: string[] = [];
    let protectedAttempts = 0;

    httpClient.defaults.adapter = vi.fn(async (config) => {
      calls.push(config.url ?? "");

      if (config.url === "/api/protected") {
        protectedAttempts += 1;
        if (protectedAttempts === 1) throw unauthorized(config);
        return response(config, 200, { ok: true, authorization: config.headers.Authorization });
      }

      if (config.url === "/api/auth/refresh") {
        return response(config, 200, {
          success: true,
          message: "refreshed",
          data: { accessToken: "fresh-token", expiresIn: 3600 },
          errors: null,
        });
      }

      throw new Error(`Unexpected URL ${config.url}`);
    }) as AxiosAdapter;

    const result = await httpClient.get("/api/protected");

    expect(result.data).toEqual({ ok: true, authorization: "Bearer fresh-token" });
    expect(calls).toEqual(["/api/protected", "/api/auth/refresh", "/api/protected"]);
  });

  it("shares one refresh request across parallel 401 responses", async () => {
    let refreshCalls = 0;
    const protectedAttempts = new Map<string, number>();

    httpClient.defaults.adapter = vi.fn(async (config) => {
      const url = config.url ?? "";

      if (url.startsWith("/api/protected/")) {
        const attempts = (protectedAttempts.get(url) ?? 0) + 1;
        protectedAttempts.set(url, attempts);
        if (attempts === 1) throw unauthorized(config);
        return response(config, 200, { url, authorization: config.headers.Authorization });
      }

      if (url === "/api/auth/refresh") {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return response(config, 200, {
          success: true,
          message: "refreshed",
          data: { accessToken: "fresh-token", expiresIn: 3600 },
          errors: null,
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    }) as AxiosAdapter;

    const [first, second] = await Promise.all([
      httpClient.get("/api/protected/one"),
      httpClient.get("/api/protected/two"),
    ]);

    expect(first.data.authorization).toBe("Bearer fresh-token");
    expect(second.data.authorization).toBe("Bearer fresh-token");
    expect(refreshCalls).toBe(1);
  });

  it("shares one refresh request between auth bootstrap and a 401 retry", async () => {
    let refreshCalls = 0;
    let protectedAttempts = 0;

    httpClient.defaults.adapter = vi.fn(async (config) => {
      const url = config.url ?? "";

      if (url === "/api/protected") {
        protectedAttempts += 1;
        if (protectedAttempts === 1) throw unauthorized(config);
        return response(config, 200, { authorization: config.headers.Authorization });
      }

      if (url === "/api/auth/refresh") {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return response(config, 200, {
          success: true,
          message: "refreshed",
          data: {
            accessToken: "fresh-token",
            expiresIn: 3600,
            user: {
              id: "user-1",
              email: "user@example.com",
              displayName: "User Example",
              avatarUrl: "https://cdn.example.com/avatar.png",
              isEmailVerified: true,
              roles: ["USER"],
            },
          },
          errors: null,
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    }) as AxiosAdapter;

    const bootstrapPromise = bootstrapAuthSession();
    const protectedPromise = httpClient.get("/api/protected");
    const [, protectedResult] = await Promise.all([bootstrapPromise, protectedPromise]);

    expect(protectedResult.data.authorization).toBe("Bearer fresh-token");
    expect(refreshCalls).toBe(1);
    expect(useAuthStore.getState().authStatus).toBe("authenticated");
    expect(useAuthStore.getState().authSource).toBe("api");
    expect(useAuthStore.getState().currentUser?.avatar).toBe("https://cdn.example.com/avatar.png");
  });

  it("clears the API session when refresh fails after a protected 401", async () => {
    let refreshCalls = 0;
    useAuthStore.getState().setAuthenticated(
      {
        id: "user-1",
        email: "user@example.com",
        name: "User Example",
        role: "user",
      },
      "api",
    );

    httpClient.defaults.adapter = vi.fn(async (config) => {
      const url = config.url ?? "";

      if (url === "/api/protected") {
        throw unauthorized(config);
      }

      if (url === "/api/auth/refresh") {
        refreshCalls += 1;
        throw unauthorized(config);
      }

      throw new Error(`Unexpected URL ${url}`);
    }) as AxiosAdapter;

    await expect(httpClient.get("/api/protected")).rejects.toThrow("Unauthorized");

    expect(refreshCalls).toBe(1);
    expect(useAuthStore.getState().authStatus).toBe("anonymous");
    expect(useAuthStore.getState().authSource).toBeNull();
  });
});

describe("httpClient 503 cold-start retry", () => {
  beforeEach(() => {
    stubLocalStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    httpClient.defaults.adapter = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("retries an idempotent GET twice with backoff and succeeds", async () => {
    let attempts = 0;
    httpClient.defaults.adapter = vi.fn(async (config) => {
      attempts += 1;
      if (attempts < 3) throw serviceUnavailable(config);
      return response(config, 200, { success: true, message: "OK", data: { ok: true }, errors: null });
    }) as AxiosAdapter;

    const resultPromise = httpClient.get("/api/cvs/cv-1/versions");
    await vi.advanceTimersByTimeAsync(1_000); // first backoff
    await vi.advanceTimersByTimeAsync(3_000); // second backoff
    const result = await resultPromise;

    expect(attempts).toBe(3);
    expect(result.data.data).toEqual({ ok: true });
  });

  it("gives up after the retry budget and surfaces the 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let attempts = 0;
    httpClient.defaults.adapter = vi.fn(async (config) => {
      attempts += 1;
      throw serviceUnavailable(config);
    }) as AxiosAdapter;

    const resultPromise = httpClient.get("/api/cvs/cv-1/versions").catch((error) => error);
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(3_000);
    const error = await resultPromise;

    expect(attempts).toBe(3); // original + 2 retries, then stop
    expect((error as AxiosError).response?.status).toBe(503);
  });

  it("never auto-retries a mutation on 503 (double-POST risk)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let attempts = 0;
    httpClient.defaults.adapter = vi.fn(async (config) => {
      attempts += 1;
      throw serviceUnavailable(config);
    }) as AxiosAdapter;

    await expect(httpClient.post("/api/cvs/cv-1/versions", {})).rejects.toThrow();
    expect(attempts).toBe(1);
  });
});
