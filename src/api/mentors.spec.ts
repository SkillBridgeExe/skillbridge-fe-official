import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  downloadAdminMentorAvatarApi,
  getAdminMentorsApi,
  getMentorFiltersApi,
  getMentorProfileApi,
  getMentorsApi,
  getMentorSummaryApi,
  getMyMentorProfileApi,
  searchMentorSkillsApi,
  submitMyMentorProfileApi,
  updateAdminMentorStatusApi,
  updateMyMentorProfileApi,
} from "./mentors";
import {
  getMentorFilters,
  getMentorProfile,
  getMentors,
  getMentorSummary,
} from "@/services/mentor.service";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

beforeEach(() => vi.clearAllMocks());

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

describe("mentor api routes", () => {
  it("exposes public, self-service, admin, and skill catalog routes", () => {
    expect(API_ROUTES.MENTORS.SUMMARY).toBe("/api/mentors/summary");
    expect(API_ROUTES.MENTORS.FILTERS).toBe("/api/mentors/filters");
    expect(API_ROUTES.MENTORS.LIST).toBe("/api/mentors");
    expect(API_ROUTES.MENTORS.DETAIL("nguyen-minh-an")).toBe(
      "/api/mentors/nguyen-minh-an",
    );
    expect(API_ROUTES.MENTORS.AVATAR("nguyen-minh-an")).toBe(
      "/api/mentors/nguyen-minh-an/avatar",
    );
    expect(API_ROUTES.MENTORS.MY_PROFILE).toBe("/api/mentors/me/profile");
    expect(API_ROUTES.MENTORS.SUBMIT_PROFILE).toBe("/api/mentors/me/profile/submit");
    expect(API_ROUTES.ADMIN_MENTORS.LIST).toBe("/api/admin/mentors");
    expect(API_ROUTES.ADMIN_MENTORS.STATUS("profile-1")).toBe(
      "/api/admin/mentors/profile-1/status",
    );
    expect(API_ROUTES.ADMIN_MENTORS.AVATAR("profile-1")).toBe(
      "/api/admin/mentors/profile-1/avatar",
    );
    expect(API_ROUTES.SKILLS.LIST).toBe("/api/skills");
  });

  it("loads public marketplace resources with canonical params", async () => {
    vi.mocked(httpClient.get)
      .mockReturnValueOnce(ok({ verifiedExperts: 6 }) as never)
      .mockReturnValueOnce(ok({ domains: [] }) as never)
      .mockReturnValueOnce(ok({ items: [], total: 0, page: 2, limit: 6 }) as never)
      .mockReturnValueOnce(ok({ id: "profile-1", slug: "nguyen-minh-an" }) as never);

    await getMentorSummaryApi();
    await getMentorFiltersApi();
    await getMentorsApi({ query: "React", minRating: 4, page: 2, limit: 6 });
    await getMentorProfileApi("nguyen-minh-an");

    expect(httpClient.get).toHaveBeenNthCalledWith(1, API_ROUTES.MENTORS.SUMMARY);
    expect(httpClient.get).toHaveBeenNthCalledWith(2, API_ROUTES.MENTORS.FILTERS);
    expect(httpClient.get).toHaveBeenNthCalledWith(3, API_ROUTES.MENTORS.LIST, {
      params: { query: "React", minRating: 4, page: 2, limit: 6 },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(
      4,
      API_ROUTES.MENTORS.DETAIL("nguyen-minh-an"),
    );
  });

  it("maps self-service, admin review, and skill catalog calls", async () => {
    vi.mocked(httpClient.get)
      .mockReturnValueOnce(ok(null) as never)
      .mockReturnValueOnce(ok({ items: [], total: 0, page: 1, limit: 20 }) as never)
      .mockReturnValueOnce(ok([]) as never);
    vi.mocked(httpClient.patch)
      .mockReturnValueOnce(ok({ id: "profile-1", status: "DRAFT" }) as never)
      .mockReturnValueOnce(ok({ id: "profile-1", status: "APPROVED" }) as never);
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({ id: "profile-1", status: "PENDING_REVIEW" }) as never,
    );

    await getMyMentorProfileApi();
    await updateMyMentorProfileApi({
      headline: "Senior Frontend Engineer",
      linkedinUrl: "https://www.linkedin.com/in/nguyen-minh-an",
      phoneNumber: "+84912345678",
    });
    await submitMyMentorProfileApi();
    await getAdminMentorsApi({ status: "PENDING_REVIEW", page: 1 });
    await updateAdminMentorStatusApi("profile-1", { status: "APPROVED" });
    await searchMentorSkillsApi({ query: "react", limit: 8 });

    expect(httpClient.patch).toHaveBeenNthCalledWith(1, API_ROUTES.MENTORS.MY_PROFILE, {
      headline: "Senior Frontend Engineer",
      linkedinUrl: "https://www.linkedin.com/in/nguyen-minh-an",
      phoneNumber: "+84912345678",
    });
    expect(httpClient.post).toHaveBeenCalledWith(API_ROUTES.MENTORS.SUBMIT_PROFILE);
    expect(httpClient.get).toHaveBeenNthCalledWith(2, API_ROUTES.ADMIN_MENTORS.LIST, {
      params: { status: "PENDING_REVIEW", page: 1 },
    });
    expect(httpClient.patch).toHaveBeenNthCalledWith(
      2,
      API_ROUTES.ADMIN_MENTORS.STATUS("profile-1"),
      { status: "APPROVED" },
    );
    expect(httpClient.get).toHaveBeenNthCalledWith(3, API_ROUTES.SKILLS.LIST, {
      params: { query: "react", limit: 8 },
    });
  });

  it("downloads protected mentor avatars for admin review", async () => {
    const avatar = new Blob(["avatar"], { type: "image/webp" });
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: avatar } as never);

    await expect(downloadAdminMentorAvatarApi("profile-1")).resolves.toBe(avatar);

    expect(httpClient.get).toHaveBeenCalledWith(
      API_ROUTES.ADMIN_MENTORS.AVATAR("profile-1"),
      { responseType: "blob" },
    );
  });

  it("keeps pages behind the mentor service boundary", async () => {
    vi.mocked(httpClient.get)
      .mockReturnValueOnce(ok({ verifiedExperts: 0 }) as never)
      .mockReturnValueOnce(ok({ domains: [] }) as never)
      .mockReturnValueOnce(ok({ items: [], total: 0, page: 1, limit: 6 }) as never)
      .mockReturnValueOnce(ok({ id: "profile-1", slug: "mentor" }) as never);

    await getMentorSummary();
    await getMentorFilters();
    await getMentors({ page: 1, limit: 6 });
    await getMentorProfile("mentor");

    expect(httpClient.get).toHaveBeenCalledTimes(4);
  });
});
