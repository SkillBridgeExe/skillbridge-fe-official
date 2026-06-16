import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  getAdminUserApi,
  getAdminUsersApi,
  getAdminUserSummaryApi,
  replaceAdminUserRolesApi,
  updateAdminUserStatusApi,
} from "./admin-users";
import {
  getAdminUser,
  getAdminUsers,
  getAdminUserSummary,
  replaceAdminUserRoles,
  updateAdminUserStatus,
} from "@/services/admin-users.service";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function ok<T>(data: T) {
  return Promise.resolve({
    data: {
      success: true,
      message: "OK",
      data,
      errors: null,
    },
  });
}

describe("admin-users api", () => {
  it("exposes canonical admin user routes", () => {
    expect(API_ROUTES.ADMIN_USERS.LIST).toBe("/api/admin/users");
    expect(API_ROUTES.ADMIN_USERS.SUMMARY).toBe("/api/admin/users/summary");
    expect(API_ROUTES.ADMIN_USERS.DETAIL("user-1")).toBe("/api/admin/users/user-1");
    expect(API_ROUTES.ADMIN_USERS.STATUS("user-1")).toBe("/api/admin/users/user-1/status");
    expect(API_ROUTES.ADMIN_USERS.ROLES("user-1")).toBe("/api/admin/users/user-1/roles");
  });

  it("loads paginated users and unwraps the response envelope", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(
      ok({
        items: [
          {
            id: "user-1",
            email: "user@example.com",
            displayName: "User Example",
            avatarUrl: null,
            roles: ["USER"],
            status: "ACTIVE",
            isEmailVerified: true,
            lastLoginAt: null,
            createdAt: "2026-06-01T00:00:00.000Z",
            cvCount: 2,
            matchCount: 1,
            interviewCount: 3,
            paidAmountVnd: 100000,
            activePlanCodes: ["PRO"],
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }) as never,
    );

    const result = await getAdminUsersApi({ page: 1, limit: 20, search: "user" });

    expect(httpClient.get).toHaveBeenCalledWith(API_ROUTES.ADMIN_USERS.LIST, {
      params: { page: 1, limit: 20, search: "user" },
    });
    expect(result.items[0].paidAmountVnd).toBe(100000);
  });

  it("loads summary/detail and writes status/roles through concrete admin routes", async () => {
    vi.mocked(httpClient.get)
      .mockReturnValueOnce(ok({ totals: { totalUsers: 2 }, roleDistribution: [] }) as never)
      .mockReturnValueOnce(ok({ id: "user-1", email: "user@example.com", roles: ["USER"] }) as never);
    vi.mocked(httpClient.patch).mockReturnValueOnce(ok({ id: "user-1", status: "SUSPENDED" }) as never);
    vi.mocked(httpClient.put).mockReturnValueOnce(ok({ id: "user-1", roles: ["USER", "MENTOR"] }) as never);

    await getAdminUserSummaryApi({ rangeDays: 30 });
    await getAdminUserApi("user-1");
    await updateAdminUserStatusApi("user-1", { status: "SUSPENDED" });
    await replaceAdminUserRolesApi("user-1", { roles: ["USER", "MENTOR"] });

    expect(httpClient.get).toHaveBeenNthCalledWith(1, API_ROUTES.ADMIN_USERS.SUMMARY, {
      params: { rangeDays: 30 },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(2, API_ROUTES.ADMIN_USERS.DETAIL("user-1"));
    expect(httpClient.patch).toHaveBeenCalledWith(API_ROUTES.ADMIN_USERS.STATUS("user-1"), {
      status: "SUSPENDED",
    });
    expect(httpClient.put).toHaveBeenCalledWith(API_ROUTES.ADMIN_USERS.ROLES("user-1"), {
      roles: ["USER", "MENTOR"],
    });
  });
});

describe("admin-users service", () => {
  it("delegates to the API layer", async () => {
    vi.mocked(httpClient.get)
      .mockReturnValueOnce(ok({ items: [], total: 0, page: 1, limit: 20 }) as never)
      .mockReturnValueOnce(ok({ totals: { totalUsers: 0 } }) as never)
      .mockReturnValueOnce(ok({ id: "user-1" }) as never);
    vi.mocked(httpClient.patch).mockReturnValueOnce(ok({ id: "user-1", status: "ACTIVE" }) as never);
    vi.mocked(httpClient.put).mockReturnValueOnce(ok({ id: "user-1", roles: ["ADMIN"] }) as never);

    await getAdminUsers({ page: 1 });
    await getAdminUserSummary({ rangeDays: 90 });
    await getAdminUser("user-1");
    await updateAdminUserStatus("user-1", { status: "ACTIVE" });
    await replaceAdminUserRoles("user-1", { roles: ["ADMIN"] });

    expect(httpClient.get).toHaveBeenNthCalledWith(1, API_ROUTES.ADMIN_USERS.LIST, {
      params: { page: 1 },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(2, API_ROUTES.ADMIN_USERS.SUMMARY, {
      params: { rangeDays: 90 },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(3, API_ROUTES.ADMIN_USERS.DETAIL("user-1"));
    expect(httpClient.patch).toHaveBeenCalledWith(API_ROUTES.ADMIN_USERS.STATUS("user-1"), {
      status: "ACTIVE",
    });
    expect(httpClient.put).toHaveBeenCalledWith(API_ROUTES.ADMIN_USERS.ROLES("user-1"), {
      roles: ["ADMIN"],
    });
  });
});
