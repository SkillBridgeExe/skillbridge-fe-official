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
import {
  getCurrentUserSkillsApi,
  normalizeUserSkill,
  replaceCurrentUserSkillsApi,
  type ReplaceUserSkillItemDto,
  type UserSkillDto,
} from "@/api/user/skills";
import { getAuthAvatarUrl, getSafeAvatarUrl, isProtectedAvatarUrl } from "@/lib/avatar-url";
import { useAuthStore } from "@/store/useAuthStore";
import { hasApiAuthSession } from "@/services/auth-session.service";

export { getSafeAvatarUrl, isProtectedAvatarUrl } from "@/lib/avatar-url";
export type { UserProfileDto } from "@/api/user/profile";

function hasApiSession() {
  return hasApiAuthSession();

  // Only a real bearer token counts as an API session. A lingering "user" key
  // (mock login / stale state) must NOT trigger authed calls — those 401 and
  // used to bounce the user to the homepage.
}

/** Convert a File to a data URL (base64) that survives page reload + localStorage. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  let avatarUrl = getAuthAvatarUrl(profile.avatarUrl);

  // Public GCS URLs reuse the same path after every re-upload — the URL never
  // changes, so the browser serves a stale cached copy indefinitely. Append a
  // version timestamp on every profile sync so the browser always fetches the
  // current file. Protected paths (/api/user/avatar) are always freshly
  // downloaded as a blob and are not affected by this.
  if (avatarUrl && avatarUrl.startsWith("http")) {
    avatarUrl = `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
  }

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

function setAuthAvatar(value: string | null | undefined) {
  useAuthStore.getState().updateAuthUser({ avatar: value || undefined });
}

export async function getMyAvatarUrl(): Promise<string | null> {
  const currentAvatar = useAuthStore.getState().currentUser?.avatar;
  const localAvatar = getSafeAvatarUrl(currentAvatar);
  if (!hasApiSession() || !isProtectedAvatarUrl(currentAvatar)) return localAvatar ?? null;

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
    // Use data URL instead of blob URL so the avatar survives page reload.
    // Blob URLs are session-scoped and die on refresh; data URLs persist in localStorage.
    const dataUrl = await fileToDataUrl(file);
    useAuthStore.getState().updateAuthUser({ avatar: dataUrl });
    return dataUrl;
  }

  const previewUrl = URL.createObjectURL(file);
  setAuthAvatar(previewUrl);

  try {
    const result = await uploadCurrentUserAvatarApi(file);
    if (isProtectedAvatarUrl(result?.avatarUrl)) {
      setAuthAvatar(getAuthAvatarUrl(result?.avatarUrl));
      return getMyAvatarUrl();
    }
    const safeAvatarUrl = getSafeAvatarUrl(result?.avatarUrl);
    if (safeAvatarUrl) {
      // Append a version param so the browser treats this as a new URL and
      // skips the cached copy of the previous avatar at the same GCS path.
      const busted = `${safeAvatarUrl}?v=${Date.now()}`;
      setAuthAvatar(busted);
      return busted;
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

export async function getMySkills(profile?: UserProfileDto | null): Promise<UserSkillDto[]> {
  if (Array.isArray(profile?.skills)) return profile.skills.map(normalizeUserSkill);

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
