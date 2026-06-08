import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";

export interface UserSkillDto {
  skillId: string;
  level: number;
  name?: string | null;
  skillName?: string | null;
}

export interface ReplaceUserSkillItemDto {
  skillId: string;
  level: number;
}

export interface ReplaceUserSkillsRequest {
  skills: ReplaceUserSkillItemDto[];
}

export async function getCurrentUserSkillsApi(): Promise<UserSkillDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<UserSkillDto[]>>(
    httpClient.get(API_ROUTES.USER.SKILLS),
    "Failed to load user skills.",
  );
  return envelope.data;
}

export async function replaceCurrentUserSkillsApi(
  payload: ReplaceUserSkillsRequest,
): Promise<UserSkillDto[] | null> {
  const envelope = await unwrapEnvelope<ApiEnvelope<UserSkillDto[] | null>>(
    httpClient.put(API_ROUTES.USER.SKILLS, payload),
    "Failed to update user skills.",
  );
  return envelope.data;
}
