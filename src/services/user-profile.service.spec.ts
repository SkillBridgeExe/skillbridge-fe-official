import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import {
  getMySkills,
  getSafeAvatarUrl,
  isProtectedAvatarUrl,
  type UserProfileDto,
} from "./user-profile.service";

vi.mock("@/api/user/profile", () => ({
  getCurrentUserProfileApi: vi.fn(),
  updateCurrentUserProfileApi: vi.fn(),
}));

vi.mock("@/api/user/avatar", () => ({
  deleteCurrentUserAvatarApi: vi.fn(),
  downloadCurrentUserAvatarApi: vi.fn(),
  uploadCurrentUserAvatarApi: vi.fn(),
}));

vi.mock("@/api/user/skills", () => ({
  getCurrentUserSkillsApi: vi.fn(),
  normalizeUserSkill: vi.fn((skill: {
    id?: string;
    skillId?: string;
    displayName?: string | null;
    name?: string | null;
    skillName?: string | null;
    level: number;
  }) => {
    const skillId = skill.skillId ?? skill.id ?? "";
    const label = skill.name ?? skill.skillName ?? skill.displayName ?? skillId;
    return { skillId, name: label, skillName: label, level: skill.level };
  }),
  replaceCurrentUserSkillsApi: vi.fn(),
}));

function stubLocalStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  });
}

describe("user profile helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    stubLocalStorage();
    useAuthStore.getState().logout();
  });

  it("classifies protected avatar URLs separately from render-safe URLs", () => {
    expect(isProtectedAvatarUrl("/api/users/me/avatar")).toBe(true);
    expect(isProtectedAvatarUrl("https://api.example.com/api/users/me/avatar")).toBe(true);
    expect(getSafeAvatarUrl("/api/users/me/avatar")).toBeUndefined();
    expect(getSafeAvatarUrl("https://cdn.example.com/avatar.png")).toBe("https://cdn.example.com/avatar.png");
    expect(getSafeAvatarUrl("/taithi.png")).toBe("/taithi.png");
    expect(getSafeAvatarUrl("blob:http://localhost/avatar")).toBe("blob:http://localhost/avatar");
    expect(getSafeAvatarUrl("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
  });

  it("uses skills already returned by the profile aggregate without calling the skills endpoint", async () => {
    const { getCurrentUserSkillsApi } = await import("@/api/user/skills");
    useAuthStore.getState().setAuthenticated(
      {
        id: "user-1",
        email: "user@example.com",
        name: "User Example",
        role: "user",
      },
      "api",
    );
    const profile = {
      id: "user-1",
      email: "user@example.com",
      displayName: "User Example",
      skills: [{ id: "skill-1", canonicalName: "react", displayName: "React", level: 3 }],
    } satisfies UserProfileDto;

    const skills = await getMySkills(profile);

    expect(skills).toEqual([{ skillId: "skill-1", name: "React", skillName: "React", level: 3 }]);
    expect(getCurrentUserSkillsApi).not.toHaveBeenCalled();
  });
});
