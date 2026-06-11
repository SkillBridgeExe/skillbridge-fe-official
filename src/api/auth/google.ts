import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  AUTH_REQUEST_TIMEOUT_MS,
  unwrapEnvelope,
  type ApiEnvelope,
  type AuthUserDto,
} from "./envelope";

export interface GoogleLoginRequest {
  idToken: string;
}

export type AuthResponse = ApiEnvelope<{
  accessToken: string | null;
  expiresIn?: number | null;
  user?: AuthUserDto;
}>;

// The google login endpoint also sets the refresh-token cookie
// (httpClient sends credentials on every call — withCredentials: true).
export const googleLoginApi = (payload: GoogleLoginRequest): Promise<AuthResponse> =>
  unwrapEnvelope(
    httpClient.post<AuthResponse>(API_ROUTES.AUTH.GOOGLE, payload, {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    }),
    "Google Login failed",
  );
