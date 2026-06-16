import { getMeApi } from "@/api/auth/me";
import type { AuthUserDto } from "@/api/auth/envelope";
import { refreshAuthTokens } from "@/api/core/http-client";
import { getAuthAvatarUrl } from "@/lib/avatar-url";
import { clearAccessToken } from "@/services/auth-token.service";
import { useAuthStore, type AuthUser, type UserRole } from "@/store/useAuthStore";

const KNOWN_ROLES = ["admin", "business", "mentor"] as const;
const AUTH_STORAGE_KEY = "skillbridge-auth";
const USER_ROLES: UserRole[] = ["user", "admin", "business", "mentor"];

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<AuthUser>;
  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    USER_ROLES.includes(user.role as UserRole)
  );
}

export function getPersistedMockUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      state?: { authSource?: unknown; currentUser?: unknown };
    };
    const user = parsed.state?.currentUser;

    return parsed.state?.authSource === "mock" && isAuthUser(user) ? user : null;
  } catch {
    return null;
  }
}

export function toUserRole(roles: string[] | undefined): UserRole {
  const role = roles?.[0]?.toLowerCase() ?? "user";
  return (KNOWN_ROLES as readonly string[]).includes(role) ? (role as UserRole) : "user";
}

export function toAuthUser(user: AuthUserDto): AuthUser {
  const avatar = getAuthAvatarUrl(user.avatarUrl);
  return {
    id: user.id,
    name: user.displayName || user.email,
    email: user.email,
    role: toUserRole(user.roles),
    ...(avatar ? { avatar } : {}),
  };
}

export function hasApiAuthSession(): boolean {
  const { authSource, authStatus, isAuthenticated } = useAuthStore.getState();
  return authStatus === "authenticated" && isAuthenticated && authSource === "api";
}

export async function refreshAuthSession(): Promise<AuthUser> {
  const { accessToken, user } = await refreshAuthTokens();

  if (!accessToken) {
    throw new Error("Refresh did not return an access token");
  }

  const authUser = user ? toAuthUser(user) : toAuthUser((await getMeApi(accessToken)).data);
  useAuthStore.getState().setAuthenticated(authUser, "api");
  return authUser;
}

export async function bootstrapAuthSession(): Promise<void> {
  const state = useAuthStore.getState();
  const persistedMockUser = getPersistedMockUser();

  if (persistedMockUser) {
    state.setAuthenticated(persistedMockUser, "mock");
    return;
  }

  if (state.authSource === "mock" && state.currentUser) {
    state.setAuthenticated(state.currentUser, "mock");
    return;
  }

  state.setChecking();

  try {
    await refreshAuthSession();
  } catch {
    const fallbackMockUser = getPersistedMockUser();
    if (fallbackMockUser) {
      useAuthStore.getState().setAuthenticated(fallbackMockUser, "mock");
      return;
    }

    clearAccessToken();
    useAuthStore.getState().setAnonymous();
  }
}
