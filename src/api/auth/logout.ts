import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { AUTH_REQUEST_TIMEOUT_MS, unwrapEnvelope, type ApiEnvelope } from "./envelope";

export type LogoutResponse = ApiEnvelope<null>;

// httpClient sends the HttpOnly refresh-token cookie (withCredentials: true)
// so the BE can clear it.
export const logoutApi = (): Promise<LogoutResponse> =>
  unwrapEnvelope(
    httpClient.post<LogoutResponse>(API_ROUTES.AUTH.LOGOUT, undefined, {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    }),
    "Logout failed",
  );
