import {
  getAdminUserApi,
  getAdminUsersApi,
  getAdminUserSummaryApi,
  replaceAdminUserRolesApi,
  updateAdminUserStatusApi,
  type AdminUsersQuery,
  type ReplaceAdminUserRolesDto,
  type UpdateAdminUserStatusDto,
} from "@/api/admin-users";

export type {
  AdminMutableUserStatus,
  AdminUserDetail,
  AdminUserListItem,
  AdminUserRole,
  AdminUserSkill,
  AdminUserStatus,
  AdminUserSummary,
  AdminUsersQuery,
  PaginatedAdminUsers,
  ReplaceAdminUserRolesDto,
  UpdateAdminUserStatusDto,
} from "@/api/admin-users";

export function getAdminUsers(query: AdminUsersQuery) {
  return getAdminUsersApi(query);
}

export function getAdminUserSummary(query: { rangeDays?: number }) {
  return getAdminUserSummaryApi(query);
}

export function getAdminUser(id: string) {
  return getAdminUserApi(id);
}

export function updateAdminUserStatus(id: string, payload: UpdateAdminUserStatusDto) {
  return updateAdminUserStatusApi(id, payload);
}

export function replaceAdminUserRoles(id: string, payload: ReplaceAdminUserRolesDto) {
  return replaceAdminUserRolesApi(id, payload);
}
