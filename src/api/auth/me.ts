import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  AUTH_REQUEST_TIMEOUT_MS,
  unwrapEnvelope,
  type ApiEnvelope,
  type AuthUserDto,
} from "./envelope";

export type UserSummaryResponse = ApiEnvelope<AuthUserDto>;

// httpClient already injects the stored Bearer token; the explicit param is
// kept so callers can check a token that isn't in localStorage yet.
export const getMeApi = (accessToken?: string): Promise<UserSummaryResponse> =>
  unwrapEnvelope(
    httpClient.get<UserSummaryResponse>(API_ROUTES.AUTH.ME, {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
      ...(accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : {}),
    }),
    "Failed to fetch user profile",
  );
