import { API_ROUTES } from "@/constants/api-routes";

export function isProtectedAvatarUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed === API_ROUTES.USER.AVATAR || trimmed.endsWith(API_ROUTES.USER.AVATAR);
}

export function getSafeAvatarUrl(value: string | null | undefined): string | undefined {
  if (!value || isProtectedAvatarUrl(value)) return undefined;
  const trimmed = value.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return undefined;
}

export function getAuthAvatarUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return isProtectedAvatarUrl(value) ? API_ROUTES.USER.AVATAR : getSafeAvatarUrl(value);
}
