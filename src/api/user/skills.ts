import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";

export interface UserSkillDto {
  skillId: string;
  level: number;
  category?: string | null;
  name?: string | null;
  skillName?: string | null;
}

export interface BackendUserSkillDto {
  id?: string;
  skillId?: string;
  canonicalName?: string | null;
  displayName?: string | null;
  name?: string | null;
  skillName?: string | null;
  category?: string | null;
  level: number;
}

export interface ReplaceUserSkillItemDto {
  skillId: string;
  level: number;
}

export interface ReplaceUserSkillsRequest {
  skills: ReplaceUserSkillItemDto[];
}

export function normalizeUserSkill(skill: BackendUserSkillDto): UserSkillDto {
  const skillId = skill.skillId ?? skill.id ?? "";
  const label =
    skill.name ??
    skill.skillName ??
    skill.displayName ??
    skill.canonicalName ??
    skillId;
  return {
    skillId,
    level: Number(skill.level) || 1,
    ...(skill.category !== undefined ? { category: skill.category } : {}),
    name: label,
    skillName: label,
  };
}

export async function getCurrentUserSkillsApi(): Promise<UserSkillDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BackendUserSkillDto[]>>(
    httpClient.get(API_ROUTES.USER.SKILLS),
    "Failed to load user skills.",
  );
  return envelope.data.map(normalizeUserSkill);
}

export async function replaceCurrentUserSkillsApi(
  payload: ReplaceUserSkillsRequest,
): Promise<UserSkillDto[] | null> {
  const envelope = await unwrapEnvelope<
    ApiEnvelope<BackendUserSkillDto[] | null>
  >(
    httpClient.put(API_ROUTES.USER.SKILLS, payload),
    "Failed to update user skills.",
  );
  return envelope.data?.map(normalizeUserSkill) ?? null;
}
