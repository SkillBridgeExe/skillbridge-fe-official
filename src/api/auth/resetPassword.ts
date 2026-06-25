import { httpClient, type AuthAxiosRequestConfig } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { AUTH_REQUEST_TIMEOUT_MS, unwrapEnvelope, type ApiEnvelope } from "./envelope";

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export type ResetPasswordResponse = ApiEnvelope<{ reset: true }>;

export const resetPasswordApi = (
  payload: ResetPasswordRequest,
): Promise<ResetPasswordResponse> =>
  unwrapEnvelope<ResetPasswordResponse>(
    httpClient.post<ResetPasswordResponse>(API_ROUTES.AUTH.RESET_PASSWORD, payload, {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
      skipAuth: true,
      skipAuthRefresh: true,
    } as AuthAxiosRequestConfig),
    "Password reset failed",
  );
