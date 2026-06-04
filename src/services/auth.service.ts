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

export interface LoginOutcome {
  role: UserRole;
  /** "api" = NestJS backend; "mock" = demo account (fallback khi BE không nhận). */
  source: "api" | "mock";
}

const KNOWN_ROLES = ["admin", "business", "mentor"] as const;

function toUserRole(roles: string[] | undefined): UserRole {
  const role = roles?.[0]?.toLowerCase() ?? "user";
  return (KNOWN_ROLES as readonly string[]).includes(role) ? (role as UserRole) : "user";
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

function persistSession(accessToken: string | null, user: AuthUserDto, role: UserRole) {
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("user", JSON.stringify(user));
  useAuthStore.getState().setAuthUser({
    id: user.id,
    name: user.displayName || user.email,
    email: user.email,
    role,
  });
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
    persistSession(result.data.accessToken, result.data.user, role);
    return { role, source: "api" };
  } catch (apiError) {
    const mock = useAuthStore.getState().loginWithMockAccount(email, password);
    if (mock.success) return { role: mock.role, source: "mock" };
    throw apiError;
  }
}

export async function loginWithGoogle(idToken: string): Promise<LoginOutcome> {
  const result = await googleLoginApi({ idToken });
  const role = toUserRole(result.data.user.roles);
  persistSession(result.data.accessToken, result.data.user, role);
  return { role, source: "api" };
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
