import { dashboardPathFor } from "@/services/auth.service";
import type { UserRole } from "@/store/useAuthStore";

/** Prevent an auth dialog from turning a return URL into an open redirect. */
export function postLoginPath(role: UserRole, redirectTo?: string): string {
  if (redirectTo?.startsWith("/") && !redirectTo.startsWith("//")) {
    return redirectTo;
  }
  return dashboardPathFor(role);
}
