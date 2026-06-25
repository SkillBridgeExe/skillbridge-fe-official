import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { AUTH_REQUEST_TIMEOUT_MS, unwrapEnvelope, type ApiEnvelope } from "./envelope";

export interface VerifyEmailRequest {
  token: string;
}

export type VerifyEmailResponse = ApiEnvelope<{ verified: true }>;

export const verifyEmailApi = (payload: VerifyEmailRequest): Promise<VerifyEmailResponse> =>
  unwrapEnvelope(
    httpClient.post<VerifyEmailResponse>(API_ROUTES.AUTH.VERIFY_EMAIL, payload, {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    }),
    "Email verification failed",
  );
