import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  AUTH_REQUEST_TIMEOUT_MS,
  unwrapEnvelope,
  type ApiEnvelope,
  type AuthUserDto,
} from "./envelope";

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  role: string;
}

export type RegisterResponse = ApiEnvelope<{
  accessToken: string | null;
  expiresIn?: number | null;
  user: AuthUserDto;
}>;

export const registerApi = (payload: RegisterRequest): Promise<RegisterResponse> =>
  unwrapEnvelope(
    httpClient.post<RegisterResponse>(API_ROUTES.AUTH.REGISTER, payload, {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    }),
    "Register failed",
  );
