import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  AUTH_REQUEST_TIMEOUT_MS,
  type ApiEnvelope,
  type AuthUserDto,
} from "@/api/auth/envelope";
import { API_URL } from "@/lib/runtime-config";
import { useAuthStore } from "@/store/useAuthStore";
import { API_ROUTES } from "@/constants/api-routes";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/services/auth-token.service";
import { clearPerUserClientState } from "@/services/session-cleanup";

/** Involuntary session end (401/refresh-fail). Mirrors the manual logout PII wipe
 *  so the next account on the tab can't read the previous user's cached data —
 *  the R2 fix only covered the manual logout button (bug hunt R3 07-22). */
function forceAnonymous(): void {
  clearAccessToken();
  useAuthStore.getState().setAnonymous();
  clearPerUserClientState();
}

export interface AuthAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _retry503?: number;
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
}

interface AuthInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retry503?: number;
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
}

/**
 * Backoff for 503 retries on idempotent GETs. Cloud Run scales to zero, so
 * the first hit after idle can 503 before an instance is up; two spaced
 * retries absorb the short cold starts. Long ones (5-25s) still surface an
 * error — the per-feature retry UI owns those.
 */
const RETRY_503_DELAYS_MS = [1_000, 3_000];

type RefreshPayload = {
  accessToken: string;
  expiresIn: number;
  user?: AuthUserDto;
};

function normalizeApiBaseUrl(value: string | undefined): string {
  const normalized = value?.trim().replace(/\/+$/, "") ?? "";
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}

/**
 * Shared HTTP client for talking to the .NET backend.
 *
 * `withCredentials: true` is required so the browser sends the
 * `skillbridge_refresh_token` HttpOnly cookie on /api/auth/refresh and
 * /api/auth/logout. .NET sets this cookie on login/refresh and clears it on
 * logout — FE never reads or writes it directly. See docs/api-contract.md
 * (section 1.1 Auth Module) for the full cookie + bearer flow.
 *
 * Response shape (from .NET docs/api-response-standard.md):
 *   { success, message, data, errors }
 *
 * Error branching: HTTP status is the primary signal; `errorCode` field is
 * proposed but not yet finalized with .NET dev — fall back to status + message.
 */
export const httpClient = axios.create({
  baseURL: normalizeApiBaseUrl(API_URL),
  timeout: 15_000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const AUTH_REFRESH_EXCLUDED_URLS = new Set<string>([
  API_ROUTES.AUTH.LOGIN,
  API_ROUTES.AUTH.GOOGLE,
  API_ROUTES.AUTH.REFRESH,
  API_ROUTES.AUTH.LOGOUT,
  API_ROUTES.AUTH.VERIFY_EMAIL,
  API_ROUTES.AUTH.RESEND_VERIFICATION,
  API_ROUTES.AUTH.FORGOT_PASSWORD,
  API_ROUTES.AUTH.RESET_PASSWORD,
  API_ROUTES.BUSINESS_COMPANY.VERIFY,
]);

let refreshPromise: Promise<RefreshPayload> | null = null;

function isUsingMockAuth(): boolean {
  return useAuthStore.getState().authSource === "mock";
}

function requestPath(config: AxiosRequestConfig): string {
  const url = config.url ?? "";
  if (!url) return "";

  try {
    const baseURL =
      config.baseURL || (typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const parsed = new URL(url, baseURL);
    return parsed.pathname;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

function isAuthRefreshExcluded(config: AxiosRequestConfig): boolean {
  return Boolean((config as AuthAxiosRequestConfig).skipAuthRefresh) ||
    AUTH_REFRESH_EXCLUDED_URLS.has(requestPath(config));
}

export async function refreshAuthTokens(): Promise<RefreshPayload> {
  if (!refreshPromise) {
    refreshPromise = httpClient
      .post<ApiEnvelope<RefreshPayload>>(
        API_ROUTES.AUTH.REFRESH,
        undefined,
        {
          timeout: AUTH_REQUEST_TIMEOUT_MS,
          skipAuth: true,
          skipAuthRefresh: true,
        } as AuthAxiosRequestConfig,
      )
      .then((response: AxiosResponse<ApiEnvelope<RefreshPayload>>) => {
        if (!response.data.success || !response.data.data?.accessToken) {
          throw new Error(response.data.message || "Refresh token failed");
        }

        const { accessToken, expiresIn } = response.data.data;
        setAccessToken(accessToken, expiresIn);
        return response.data.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

httpClient.interceptors.request.use(
  (config: AuthInternalAxiosRequestConfig) => {
    const token = config.skipAuth ? null : getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as AuthInternalAxiosRequestConfig | undefined;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRefreshExcluded(originalRequest)
    ) {
      originalRequest._retry = true;

      try {
        const { accessToken } = await refreshAuthTokens();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return httpClient(originalRequest);
      } catch (refreshError) {
        if (!isUsingMockAuth()) {
          forceAnonymous();
        }
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && originalRequest && !isAuthRefreshExcluded(originalRequest)) {
      if (!isUsingMockAuth()) {
        forceAnonymous();
      }
    }

    if (status === 403) {
      console.error("[HTTP] Forbidden.");
    }

    // 402 = quota used up / feature not in plan. Broadcast a single event so a global
    // listener shows one honest "upgrade" prompt, instead of each call surfacing a raw red
    // error (the FREE cv_builder_rewrite=0 case looked like a bug). Per-component onError
    // handlers still run; this just guarantees a consistent, on-brand quota message.
    if (status === 402 && typeof window !== "undefined") {
      const data = error.response?.data as { errorCode?: string; message?: string } | undefined;
      window.dispatchEvent(
        new CustomEvent("skillbridge:quota-exceeded", {
          detail: { code: data?.errorCode ?? null },
        }),
      );
    }

    // Retry idempotent GETs on 503 (Cloud Run cold start). Mutations are never
    // auto-retried — a duplicated POST/PUT is worse than a visible error.
    if (
      status === 503 &&
      originalRequest &&
      (originalRequest.method ?? "get").toLowerCase() === "get"
    ) {
      const attempt = originalRequest._retry503 ?? 0;
      const delay = RETRY_503_DELAYS_MS[attempt];
      if (delay !== undefined) {
        originalRequest._retry503 = attempt + 1;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return httpClient(originalRequest);
      }
    }

    if (status && status >= 500) {
      console.error("[HTTP] Server Error:", error.message);
    }

    return Promise.reject(error);
  },
);
