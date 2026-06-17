// ─── Auth Service ──────────────────────────────────────────────
// Tầng nghiệp vụ cho authentication: login (API thật + mock song song),
// Google OAuth, register, verify email, logout.
// Convention: Page → services → api/* (xem CONTEXT.md).

import { loginApi } from "@/api/auth/login";
import { googleLoginApi } from "@/api/auth/google";
import {
  registerApi,
  type RegisterRequest,
  type RegisterResponse,
} from "@/api/auth/register";
import { verifyEmailApi, type VerifyEmailResponse } from "@/api/auth/verifyEmail";
import {
  resendVerificationEmailApi,
  type ResendVerificationEmailResponse,
} from "@/api/auth/resendVerificationEmail";
import { logoutApi } from "@/api/auth/logout";
import type { AuthUserDto } from "@/api/auth/envelope";
import { useAuthStore, type UserRole } from "@/store/useAuthStore";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api-error";
import { setAccessToken } from "@/services/auth-token.service";
import { toAuthUser, toUserRole } from "@/services/auth-session.service";

export interface LoginOutcome {
  role: UserRole;
  displayName?: string;
  /** "api" = NestJS backend; "mock" = demo account (fallback khi BE không nhận). */
  source: "api" | "mock";
}

/** Trang đích theo role — dùng chung cho mọi redirect sau khi auth thành công. */
export function dashboardPathFor(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "business":
      return "/business";
    case "mentor":
      return "/mentor-dashboard";
    default:
      return "/dashboard";
  }
}

export function getLoginErrorDescription(
  error: unknown,
  invalidCredentialsMessage: string,
  fallback: string,
): string {
  if (getApiErrorCode(error) === "INVALID_CREDENTIALS") {
    return invalidCredentialsMessage;
  }
  return getApiErrorMessage(error, fallback);
}

function persistSession(
  accessToken: string | null,
  expiresIn: number | null | undefined,
  user: AuthUserDto,
  role: UserRole,
) {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  if (accessToken) setAccessToken(accessToken, expiresIn);
  useAuthStore.getState().setAuthenticated({ ...toAuthUser(user), role }, "api");
}

/**
 * Đăng nhập qua NestJS; nếu API từ chối hoặc không phản hồi thì thử
 * 4 account demo. Mock chạy SONG SONG với auth thật (luật CLAUDE.md) —
 * demo không phụ thuộc BE đã seed account hay chưa.
 */
export async function login(email: string, password: string): Promise<LoginOutcome> {
  try {
    const result = await loginApi({ email, password });
    const role = toUserRole(result.data.user.roles);
    persistSession(result.data.accessToken, result.data.expiresIn, result.data.user, role);
    return { role, source: "api", displayName: result.data.user.displayName };
  } catch (apiError) {
    const mock = useAuthStore.getState().loginWithMockAccount(email, password);
    if (mock.success) {
      const currentUser = useAuthStore.getState().currentUser;
      return { role: mock.role, source: "mock", displayName: currentUser?.name };
    }
    throw apiError;
  }
}

export async function loginWithGoogle(idToken: string): Promise<LoginOutcome> {
  const result = await googleLoginApi({ idToken });
  if (!result.data.user) throw new Error("Google login did not return a user");
  const role = toUserRole(result.data.user.roles);
  persistSession(result.data.accessToken, result.data.expiresIn, result.data.user, role);
  return { role, source: "api", displayName: result.data.user.displayName };
}

export function register(payload: RegisterRequest): Promise<RegisterResponse> {
  return registerApi(payload);
}

export function verifyEmail(token: string): Promise<VerifyEmailResponse> {
  return verifyEmailApi({ token });
}

export function resendVerificationEmail(
  email: string,
): Promise<ResendVerificationEmailResponse> {
  return resendVerificationEmailApi({ email });
}

/** Best-effort logout phía BE (xoá refresh cookie) + luôn xoá session local. */
export async function logout(): Promise<void> {
  try {
    await logoutApi();
  } catch {
    // BE không phản hồi vẫn phải logout được ở local.
  }
  useAuthStore.getState().logout();
}
