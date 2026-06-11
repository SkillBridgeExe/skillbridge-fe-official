import {
  getCurrentUserProfileApi,
  updateCurrentUserProfileApi,
  type UpdateUserProfileRequest,
  type UserProfileDto,
} from "@/api/user/profile";
import {
  deleteCurrentUserAvatarApi,
  downloadCurrentUserAvatarApi,
  uploadCurrentUserAvatarApi,
} from "@/api/user/avatar";
import { API_ROUTES } from "@/constants/api-routes";
import {
  getCurrentUserSkillsApi,
  replaceCurrentUserSkillsApi,
  type ReplaceUserSkillItemDto,
  type UserSkillDto,
} from "@/api/user/skills";
import { useAuthStore } from "@/store/useAuthStore";
import { hasApiAuthSession } from "@/services/auth-session.service";

function hasApiSession() {
  return hasApiAuthSession();

  // Only a real bearer token counts as an API session. A lingering "user" key
  // (mock login / stale state) must NOT trigger authed calls — those 401 and
  // used to bounce the user to the homepage.
}

function getLocalProfile(): UserProfileDto {
  const user = useAuthStore.getState().currentUser;
  const mockProfileJson = localStorage.getItem(`mock_profile_${user?.id}`);
  if (mockProfileJson) {
    try {
      const parsed = JSON.parse(mockProfileJson);
      return {
        ...parsed,
        displayName: user?.name ?? parsed.displayName,
        avatarUrl: user?.avatar ?? parsed.avatarUrl,
      };
    } catch {
      // fallback
    }
  }
  return {
    id: user?.id,
    email: user?.email,
    displayName: user?.name,
    avatarUrl: user?.avatar,
  };
}

function syncAuthUser(profile: UserProfileDto | null | undefined) {
  if (!profile) return;
  const displayName = profile.displayName;
  const email = profile.email;
  const avatarUrl = getSafeAvatarUrl(profile.avatarUrl);

  useAuthStore.getState().updateAuthUser({
    ...(displayName ? { name: displayName } : {}),
    ...(email ? { email: email } : {}),
    ...(profile.avatarUrl !== undefined ? { avatar: avatarUrl } : {}),
  });
}

export async function getMyProfile(): Promise<UserProfileDto> {
  if (!hasApiSession()) return getLocalProfile();
  const profile = await getCurrentUserProfileApi();
  syncAuthUser(profile);
  return profile;
}

export async function updateMyProfile(
  payload: UpdateUserProfileRequest,
): Promise<UserProfileDto> {
  if (!hasApiSession()) {
    const currentLocal = getLocalProfile();
    const localProfile: UserProfileDto = {
      id: currentLocal.id,
      email: currentLocal.email,
      displayName: payload.displayName !== undefined ? payload.displayName : currentLocal.displayName,
      avatarUrl: currentLocal.avatarUrl,
      profile: {
        ...(currentLocal.profile ?? {}),
        ...(payload.university !== undefined ? { university: payload.university } : {}),
        ...(payload.major !== undefined ? { major: payload.major } : {}),
        ...(payload.experienceYears !== undefined ? { experienceYears: payload.experienceYears } : {}),
        ...(payload.targetJob !== undefined ? { targetJob: payload.targetJob } : {}),
        ...(payload.careerGoal !== undefined ? { careerGoal: payload.careerGoal } : {}),
        ...(payload.githubUrl !== undefined ? { githubUrl: payload.githubUrl } : {}),
        ...(payload.linkedinUrl !== undefined ? { linkedinUrl: payload.linkedinUrl } : {}),
        ...(payload.portfolioUrl !== undefined ? { portfolioUrl: payload.portfolioUrl } : {}),
      }
    };
    syncAuthUser(localProfile);
    const user = useAuthStore.getState().currentUser;
    if (user?.id) {
      localStorage.setItem(`mock_profile_${user.id}`, JSON.stringify(localProfile));
    }
    return localProfile;
  }

  const updated = await updateCurrentUserProfileApi(payload);
  const profile = updated ?? { ...getLocalProfile(), ...payload };
  syncAuthUser(profile);
  return profile;
}

let activeAvatarBlobUrl: string | null = null;

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export function validateAvatarFile(file: File | undefined): string | null {
  if (!file) return "No file selected.";
  if (file.size > AVATAR_MAX_BYTES) return "Avatar must be 2MB or smaller.";
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) return "Unsupported avatar file type.";
  return null;
}

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

function setAuthAvatar(value: string | null | undefined) {
  useAuthStore.getState().updateAuthUser({ avatar: value || undefined });
}

export async function getMyAvatarUrl(): Promise<string | null> {
  const localAvatar = getSafeAvatarUrl(useAuthStore.getState().currentUser?.avatar);
  if (!hasApiSession()) return localAvatar ?? null;

  let blob: Blob;
  try {
    blob = await downloadCurrentUserAvatarApi();
  } catch {
    return localAvatar ?? null;
  }
  if (!blob.size) return localAvatar ?? null;

  if (activeAvatarBlobUrl) {
    try {
      URL.revokeObjectURL(activeAvatarBlobUrl);
    } catch (e) {
      console.warn("Failed to revoke old avatar blob URL", e);
    }
  }

  activeAvatarBlobUrl = URL.createObjectURL(blob);
  setAuthAvatar(activeAvatarBlobUrl);
  return activeAvatarBlobUrl;
}

export async function uploadMyAvatar(file: File): Promise<string | null> {
  if (!hasApiSession()) {
    const previewUrl = URL.createObjectURL(file);
    useAuthStore.getState().updateAuthUser({ avatar: previewUrl });
    return previewUrl;
  }

  const previewUrl = URL.createObjectURL(file);
  setAuthAvatar(previewUrl);

  try {
    const result = await uploadCurrentUserAvatarApi(file);
    if (isProtectedAvatarUrl(result?.avatarUrl)) {
      return getMyAvatarUrl();
    }
    const safeAvatarUrl = getSafeAvatarUrl(result?.avatarUrl);
    if (safeAvatarUrl) {
      setAuthAvatar(safeAvatarUrl);
      return safeAvatarUrl;
    }
    setAuthAvatar(undefined);
    return null;
  } catch (error) {
    setAuthAvatar(undefined);
    throw error;
  }
}

export async function deleteMyAvatar(): Promise<void> {
  if (hasApiSession()) await deleteCurrentUserAvatarApi();
  setAuthAvatar(undefined);
}

export async function getMySkills(): Promise<UserSkillDto[]> {
  if (!hasApiSession()) {
    const user = useAuthStore.getState().currentUser;
    const mockSkillsJson = localStorage.getItem(`mock_skills_${user?.id}`);
    if (mockSkillsJson) {
      try {
        return JSON.parse(mockSkillsJson);
      } catch {
        // fallback
      }
    }
    return [];
  }
  return getCurrentUserSkillsApi();
}

export async function replaceMySkills(
  skills: ReplaceUserSkillItemDto[],
): Promise<UserSkillDto[]> {
  if (!hasApiSession()) {
    const user = useAuthStore.getState().currentUser;
    if (user?.id) {
      localStorage.setItem(`mock_skills_${user.id}`, JSON.stringify(skills));
    }
    return skills;
  }
  return (await replaceCurrentUserSkillsApi({ skills })) ?? skills;
}
