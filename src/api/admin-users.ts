import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";

export type AdminUserRole = "USER" | "MENTOR" | "BUSINESS" | "ADMIN";
export type AdminUserStatus = "ACTIVE" | "UNVERIFIED" | "SUSPENDED";
export type AdminMutableUserStatus = "ACTIVE" | "SUSPENDED";

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
  createdFrom?: string;
  createdTo?: string;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  roles: AdminUserRole[];
  status: AdminUserStatus;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  cvCount: number;
  matchCount: number;
  interviewCount: number;
  paidAmountVnd: number;
  activePlanCodes: string[];
}

export interface PaginatedAdminUsers {
  items: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserSummary {
  rangeDays: number;
  totals: {
    totalUsers: number;
    activeUsers: number;
    unverifiedUsers: number;
    suspendedUsers: number;
    newUsers: number;
    paidRevenueVnd: number;
    cvCount: number;
    matchCount: number;
    interviewCount: number;
  };
  roleDistribution: Array<{ role: AdminUserRole | string; count: number }>;
  statusDistribution: Array<{ status: AdminUserStatus | string; count: number }>;
  registrationTrend: Array<{ date: string; count: number }>;
  activityFunnel: Array<{ label: string; value: number }>;
  revenueTrend: Array<{ date: string; amountVnd: number }>;
}

export interface AdminUserProfile {
  university?: string | null;
  major?: string | null;
  experienceYears?: number | null;
  targetJob?: string | null;
  careerGoal?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
}

export interface AdminUserSkill {
  id: string;
  canonicalName: string | null;
  displayName: string;
  category: string | null;
  level: number;
}

export interface AdminUserSubscriptionSummary {
  activePlanCodes: string[];
  recent: Array<{
    id: string;
    planCode: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    createdAt?: string;
  }>;
}

export interface AdminUserDetail extends Omit<AdminUserListItem, "cvCount" | "matchCount" | "interviewCount" | "paidAmountVnd" | "activePlanCodes"> {
  profile: AdminUserProfile | null;
  skills: AdminUserSkill[];
  authProviders: string[];
  subscription: AdminUserSubscriptionSummary;
  activityCounts: {
    cvCount: number;
    matchCount: number;
    interviewCount: number;
    paymentCount: number;
    paidAmountVnd: number;
  };
  monthlyActivitySeries: Array<{
    month: string;
    cvCount: number;
    interviewCount: number;
    paidAmountVnd: number;
  }>;
  usageEvents: Array<{
    id?: string;
    featureKey: string;
    sourceType?: string | null;
    sourceId?: string | null;
    usedAt: string;
  }>;
  recentCvs: Array<{
    id: string;
    title: string | null;
    originalFileName: string | null;
    targetRole: string | null;
    createdAt: string;
  }>;
  recentInterviews: Array<{
    id: string;
    targetRole: string;
    status: string;
    overallScore: string | null;
    startedAt: string;
  }>;
  recentPayments: Array<{
    id: string;
    amountVnd: number;
    status: string;
    planCode: string | null;
    paidAt: string | null;
    createdAt: string;
  }>;
}

export interface UpdateAdminUserStatusDto {
  status: AdminMutableUserStatus;
}

export interface ReplaceAdminUserRolesDto {
  roles: AdminUserRole[];
}

export async function getAdminUsersApi(query: AdminUsersQuery): Promise<PaginatedAdminUsers> {
  const envelope = await unwrapEnvelope<ApiEnvelope<PaginatedAdminUsers>>(
    httpClient.get(API_ROUTES.ADMIN_USERS.LIST, { params: query }),
    "Failed to load admin users.",
  );
  return envelope.data;
}

export async function getAdminUserSummaryApi(query: { rangeDays?: number }): Promise<AdminUserSummary> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminUserSummary>>(
    httpClient.get(API_ROUTES.ADMIN_USERS.SUMMARY, { params: query }),
    "Failed to load admin user summary.",
  );
  return envelope.data;
}

export async function getAdminUserApi(id: string): Promise<AdminUserDetail> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminUserDetail>>(
    httpClient.get(API_ROUTES.ADMIN_USERS.DETAIL(id)),
    "Failed to load admin user profile.",
  );
  return envelope.data;
}

export async function updateAdminUserStatusApi(
  id: string,
  payload: UpdateAdminUserStatusDto,
): Promise<AdminUserListItem> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminUserListItem>>(
    httpClient.patch(API_ROUTES.ADMIN_USERS.STATUS(id), payload),
    "Failed to update user status.",
  );
  return envelope.data;
}

export async function replaceAdminUserRolesApi(
  id: string,
  payload: ReplaceAdminUserRolesDto,
): Promise<Pick<AdminUserDetail, "id" | "email" | "displayName" | "roles" | "status">> {
  const envelope = await unwrapEnvelope<
    ApiEnvelope<Pick<AdminUserDetail, "id" | "email" | "displayName" | "roles" | "status">>
  >(
    httpClient.put(API_ROUTES.ADMIN_USERS.ROLES(id), payload),
    "Failed to update user roles.",
  );
  return envelope.data;
}
