import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { AUTH_REQUEST_TIMEOUT_MS, unwrapEnvelope, type ApiEnvelope } from "./envelope";

export interface ResendVerificationEmailRequest {
  email: string;
}

export type ResendVerificationEmailResponse = ApiEnvelope<{ accepted: true }>;

export const resendVerificationEmailApi = (
  payload: ResendVerificationEmailRequest,
): Promise<ResendVerificationEmailResponse> =>
  unwrapEnvelope(
    httpClient.post<ResendVerificationEmailResponse>(
      API_ROUTES.AUTH.RESEND_VERIFICATION,
      { email: payload.email.trim() },
      { timeout: AUTH_REQUEST_TIMEOUT_MS },
    ),
    "Resend verification email failed",
  );
