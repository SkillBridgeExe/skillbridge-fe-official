import type { AuthSource, UserRole } from "@/store/useAuthStore";

export function getJobListAccess(input: {
  isAuthenticated: boolean;
  authSource: AuthSource;
  role: UserRole | null | undefined;
}) {
  const canQuerySavedJobs = input.isAuthenticated && input.authSource === "api" && input.role === "user";
  return {
    canQuerySavedJobs,
    showSaveAction: !input.isAuthenticated || canQuerySavedJobs,
  };
}
