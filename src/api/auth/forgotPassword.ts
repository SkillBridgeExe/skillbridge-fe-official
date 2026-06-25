import { httpClient, type AuthAxiosRequestConfig } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { AUTH_REQUEST_TIMEOUT_MS, unwrapEnvelope, type ApiEnvelope } from "./envelope";

export interface ForgotPasswordRequest {
  email: string;
}

export type ForgotPasswordResponse = ApiEnvelope<{ accepted: true }>;

export const forgotPasswordApi = (
  payload: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> =>
  unwrapEnvelope<ForgotPasswordResponse>(
    httpClient.post<ForgotPasswordResponse>(API_ROUTES.AUTH.FORGOT_PASSWORD, payload, {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
      skipAuth: true,
      skipAuthRefresh: true,
    } as AuthAxiosRequestConfig),
    "Password reset request failed",
  );
