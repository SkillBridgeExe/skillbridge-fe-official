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
  replaceCurrentUserSkillsApi,
  type ReplaceUserSkillItemDto,
  type UserSkillDto,
} from "@/api/user/skills";
import { useAuthStore } from "@/store/useAuthStore";

function hasApiSession() {
  return Boolean(localStorage.getItem("accessToken") || localStorage.getItem("user"));
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
  const avatarUrl = profile.avatarUrl;

  useAuthStore.getState().updateAuthUser({
    ...(displayName ? { name: displayName } : {}),
    ...(email ? { email: email } : {}),
    ...(avatarUrl !== undefined ? { avatar: avatarUrl || undefined } : {}),
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

export async function getMyAvatarUrl(): Promise<string | null> {
  const localAvatar = useAuthStore.getState().currentUser?.avatar;
  if (!hasApiSession()) return localAvatar ?? null;

  const blob = await downloadCurrentUserAvatarApi();
  if (!blob.size) return localAvatar ?? null;

  if (activeAvatarBlobUrl) {
    try {
      URL.revokeObjectURL(activeAvatarBlobUrl);
    } catch (e) {
      console.warn("Failed to revoke old avatar blob URL", e);
    }
  }

  activeAvatarBlobUrl = URL.createObjectURL(blob);
  return activeAvatarBlobUrl;
}

export async function uploadMyAvatar(file: File): Promise<string | null> {
  if (!hasApiSession()) {
    const previewUrl = URL.createObjectURL(file);
    useAuthStore.getState().updateAuthUser({ avatar: previewUrl });
    return previewUrl;
  }

  const result = await uploadCurrentUserAvatarApi(file);
  if (result?.avatarUrl) {
    useAuthStore.getState().updateAuthUser({ avatar: result.avatarUrl });
    return result.avatarUrl;
  }
  return getMyAvatarUrl();
}

export async function deleteMyAvatar(): Promise<void> {
  if (hasApiSession()) await deleteCurrentUserAvatarApi();
  useAuthStore.getState().updateAuthUser({ avatar: undefined });
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
