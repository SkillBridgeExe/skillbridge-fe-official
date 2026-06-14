import { useAuthStore, type AuthSource, type AuthStatus } from "@/store/useAuthStore";

export interface ApiSessionState {
  authStatus: AuthStatus;
  authSource: AuthSource;
  isAuthenticated: boolean;
}

export function isApiSessionReady(state: ApiSessionState): boolean {
  return (
    state.authStatus === "authenticated" &&
    state.authSource === "api" &&
    state.isAuthenticated
  );
}

export function useHasApiSession(): boolean {
  return useAuthStore(isApiSessionReady);
}
