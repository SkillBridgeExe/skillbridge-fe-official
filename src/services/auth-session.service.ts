import { refreshApi } from "@/api/auth/refresh";
import { getMeApi } from "@/api/auth/me";
import type { AuthUserDto } from "@/api/auth/envelope";
import { clearAccessToken, setAccessToken } from "@/services/auth-token.service";
import { useAuthStore, type AuthUser, type UserRole } from "@/store/useAuthStore";

const KNOWN_ROLES = ["admin", "business", "mentor"] as const;

export function toUserRole(roles: string[] | undefined): UserRole {
  const role = roles?.[0]?.toLowerCase() ?? "user";
  return (KNOWN_ROLES as readonly string[]).includes(role) ? (role as UserRole) : "user";
}

export function toAuthUser(user: AuthUserDto): AuthUser {
  return {
    id: user.id,
    name: user.displayName || user.email,
    email: user.email,
    role: toUserRole(user.roles),
  };
}

export function hasApiAuthSession(): boolean {
  const { authSource, authStatus, isAuthenticated } = useAuthStore.getState();
  return authStatus === "authenticated" && isAuthenticated && authSource === "api";
}

export async function refreshAuthSession(): Promise<AuthUser> {
  const refreshResult = await refreshApi();
  const { accessToken, expiresIn, user } = refreshResult.data;

  if (!accessToken) {
    throw new Error("Refresh did not return an access token");
  }

  setAccessToken(accessToken, expiresIn);
  const authUser = user ? toAuthUser(user) : toAuthUser((await getMeApi(accessToken)).data);
  useAuthStore.getState().setAuthenticated(authUser, "api");
  return authUser;
}

export async function bootstrapAuthSession(): Promise<void> {
  const state = useAuthStore.getState();

  if (state.authSource === "mock" && state.currentUser) {
    state.setAuthenticated(state.currentUser, "mock");
    return;
  }

  state.setChecking();

  try {
    await refreshAuthSession();
  } catch {
    clearAccessToken();
    useAuthStore.getState().setAnonymous();
  }
}
