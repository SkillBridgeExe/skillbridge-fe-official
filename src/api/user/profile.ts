import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { BackendUserSkillDto, UserSkillDto } from "@/api/user/skills";

export interface UserProfileDetails {
  university?: string | null;
  major?: string | null;
  experienceYears?: number | null;
  targetJob?: string | null;
  careerGoal?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
}

export interface UserProfileDto {
  id?: string;
  email?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  roles?: string[];
  isEmailVerified?: boolean;
  profile?: UserProfileDetails | null;
  skills?: Array<UserSkillDto | BackendUserSkillDto>;
}

export type UpdateUserProfileRequest = Partial<{
  displayName: string | null;
  university: string | null;
  major: string | null;
  experienceYears: number | null;
  targetJob: string | null;
  careerGoal: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
}>;

export async function getCurrentUserProfileApi(): Promise<UserProfileDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<UserProfileDto>>(
    httpClient.get(API_ROUTES.USER.PROFILE),
    "Failed to load user profile.",
  );
  return envelope.data;
}

export async function updateCurrentUserProfileApi(
  payload: UpdateUserProfileRequest,
): Promise<UserProfileDto | null> {
  const envelope = await unwrapEnvelope<ApiEnvelope<UserProfileDto | null>>(
    httpClient.patch(API_ROUTES.USER.PROFILE, payload),
    "Failed to update user profile.",
  );
  return envelope.data;
}
