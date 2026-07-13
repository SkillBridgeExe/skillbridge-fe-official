import type { UserProfileDetails } from "@/api/user/profile";
import type { UserSkillDto } from "@/api/user/skills";

export interface DashboardSkillGroup {
  category: string;
  averagePercent: number;
  skills: Array<{ id: string; name: string; level: number; percent: number }>;
}

export interface DashboardInterviewInput {
  status: string;
  overallScore: number | null;
  semanticScore: number | null;
  communicationScore: number | null;
}

export function isScoredInterview(item: DashboardInterviewInput): boolean {
  return (
    item.status === "COMPLETED" &&
    typeof item.overallScore === "number" &&
    Number.isFinite(item.overallScore)
  );
}

export function selectScoredInterviews<T extends DashboardInterviewInput>(
  items: T[],
): T[] {
  return items.filter(isScoredInterview);
}

function average(values: Array<number | null>): number | null {
  const present = values.filter(
    (value): value is number => typeof value === "number",
  );
  if (!present.length) return null;
  return Math.round(
    present.reduce((sum, value) => sum + value, 0) / present.length,
  );
}

export function resolveDashboardGoal(
  profile: UserProfileDetails | null | undefined,
  cvTargetRole: string | null | undefined,
): string | null {
  const value =
    profile?.targetJob?.trim() ||
    profile?.careerGoal?.trim() ||
    cvTargetRole?.trim();
  return value ? value.replaceAll("_", " ") : null;
}

export function groupDashboardSkills(
  skills: UserSkillDto[],
): DashboardSkillGroup[] {
  const groups = new Map<string, DashboardSkillGroup["skills"]>();
  for (const skill of skills) {
    const category = skill.category?.trim() || "Other";
    const level = Math.min(
      5,
      Math.max(1, Math.round(Number(skill.level) || 1)),
    );
    const items = groups.get(category) ?? [];
    items.push({
      id: skill.skillId,
      name: skill.name || skill.skillName || skill.skillId,
      level,
      percent: level * 20,
    });
    groups.set(category, items);
  }

  return [...groups.entries()].map(([category, items]) => ({
    category,
    averagePercent: Math.round(
      items.reduce((sum, item) => sum + item.percent, 0) / items.length,
    ),
    skills: items,
  }));
}

export function buildInterviewSummary(items: DashboardInterviewInput[]) {
  const completed = selectScoredInterviews(items);
  return {
    completed: completed.length,
    averageOverall: average(completed.map((item) => item.overallScore)),
    averageSemantic: average(completed.map((item) => item.semanticScore)),
    averageCommunication: average(
      completed.map((item) => item.communicationScore),
    ),
  };
}

export function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { response?: { status?: number } }).response?.status === 402;
}
