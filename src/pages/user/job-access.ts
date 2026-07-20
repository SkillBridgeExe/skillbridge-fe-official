import type { UserRole } from "@/store/useAuthStore";

export interface JobViewer {
  isAuthenticated: boolean;
  role: UserRole | null | undefined;
}

/** Allows only absolute HTTP(S) destinations before rendering an external link. */
export function sanitizeExternalJobUrl(sourceUrl: string | null | undefined): string | null {
  const value = sourceUrl?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** External applications are public/candidate actions, never business, mentor, or admin actions. */
export function getExternalJobApplyUrl(viewer: JobViewer, sourceUrl: string | null | undefined): string | null {
  if (viewer.isAuthenticated && viewer.role !== "user") return null;
  return sanitizeExternalJobUrl(sourceUrl);
}
