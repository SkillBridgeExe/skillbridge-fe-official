import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_URL } from "@/lib/runtime-config";
import { useAuthStore } from "@/store/useAuthStore";

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

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // Refresh-token handling lives in the auth service so it can call
      // /api/auth/refresh before falling through. Here we only clear local
      // state when the server confirms the session is unrecoverable.
      // TODO: wire auth service to call refresh before clearing the session.
      //
      // Clear the session client-side (token + user + auth store) so authed
      // background queries (e.g. the navbar avatar) stop firing and re-tripping
      // this 401. No hard redirect: public pages (e.g. /diagnosis) stay put as
      // guest, while AuthGuard sends protected pages to login on its own.
      useAuthStore.getState().logout();
    }

    if (status === 403) {
      console.error("[HTTP] Forbidden.");
    }

    if (status && status >= 500) {
      console.error("[HTTP] Server Error:", error.message);
    }

    return Promise.reject(error);
  },
);
