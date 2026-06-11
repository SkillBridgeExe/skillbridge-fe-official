import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  AUTH_REQUEST_TIMEOUT_MS,
  unwrapEnvelope,
  type ApiEnvelope,
  type AuthUserDto,
} from "./envelope";

export interface LoginRequest {
  email: string;
  password: string;
}

export type LoginResponse = ApiEnvelope<{
  accessToken: string;
  expiresIn: number;
  user: AuthUserDto;
}>;

export const loginApi = (payload: LoginRequest): Promise<LoginResponse> =>
  unwrapEnvelope(
    httpClient.post<LoginResponse>(
      API_ROUTES.AUTH.LOGIN,
      { email: payload.email.trim(), password: payload.password },
      { timeout: AUTH_REQUEST_TIMEOUT_MS },
    ),
    "Login failed",
  );
