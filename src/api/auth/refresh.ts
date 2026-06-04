import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { AUTH_REQUEST_TIMEOUT_MS, unwrapEnvelope } from "./envelope";
import type { AuthResponse } from "./google";

// httpClient sends the HttpOnly refresh-token cookie (withCredentials: true).
export const refreshApi = (): Promise<AuthResponse> =>
  unwrapEnvelope(
    httpClient.post<AuthResponse>(API_ROUTES.AUTH.REFRESH, undefined, {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    }),
    "Refresh token failed",
  );
