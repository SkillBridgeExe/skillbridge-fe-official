import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";

export const MENTOR_PROFILE_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export const MENTOR_SORTS = ["rating_desc", "price_asc", "price_desc", "newest"] as const;
export const MENTOR_SESSION_DURATIONS = [30, 45, 60, 90, 120] as const;

export type MentorProfileStatus = (typeof MENTOR_PROFILE_STATUSES)[number];
export type MentorSort = (typeof MENTOR_SORTS)[number];

export interface MentorSkillDto {
  id: string;
  displayName: string;
  category: string | null;
}

export interface MentorCardDto {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  company: string | null;
  shortBio: string | null;
  domains: string[];
  skills: MentorSkillDto[];
  ratingAverage: number | null;
  reviewCount: number;
  completedSessions: number;
  sessionPriceVnd: number;
  sessionDurationMinutes: number;
  currency: "VND";
  isAcceptingBookings: boolean;
  verified: boolean;
}

export interface MentorPublicProfileDto extends MentorCardDto {
  bio: string | null;
  linkedinUrl: string | null;
}

export interface MentorProfileDto extends MentorPublicProfileDto {
  phoneNumber: string | null;
  status: MentorProfileStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface MentorSummaryDto {
  verifiedExperts: number;
  sessionsCompleted: number;
  averageRating: number | null;
  spotlightMentor: MentorCardDto | null;
}

export interface MentorFiltersDto {
  domains: Array<{ value: string; label: string; mentorCount: number }>;
}

export interface MentorListDto {
  items: MentorCardDto[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminMentorListDto {
  items: MentorProfileDto[];
  total: number;
  page: number;
  limit: number;
}

export interface MentorListQuery {
  query?: string;
  domain?: string;
  minRating?: number;
  sort?: MentorSort;
  page?: number;
  limit?: number;
}

export interface UpdateMentorProfileRequest {
  headline?: string | null;
  company?: string | null;
  shortBio?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  phoneNumber?: string | null;
  domainTags?: string[];
  sessionPriceVnd?: number;
  sessionDurationMinutes?: number;
  isAcceptingBookings?: boolean;
  skillIds?: string[];
}

export interface AdminMentorListQuery {
  status?: MentorProfileStatus;
  query?: string;
  page?: number;
  limit?: number;
}

export interface UpdateAdminMentorStatusRequest {
  status: Extract<MentorProfileStatus, "APPROVED" | "REJECTED" | "SUSPENDED">;
  rejectionReason?: string | null;
}

export interface SkillPickerItemDto {
  id: string;
  canonicalName: string;
  displayName: string;
  category: string | null;
}

export interface SkillSearchQuery {
  query?: string;
  category?: string;
  limit?: number;
}

export async function getMentorSummaryApi(): Promise<MentorSummaryDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorSummaryDto>>(
    httpClient.get(API_ROUTES.MENTORS.SUMMARY),
    "Failed to load mentor marketplace summary.",
  );
  return envelope.data;
}

export async function getMentorFiltersApi(): Promise<MentorFiltersDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorFiltersDto>>(
    httpClient.get(API_ROUTES.MENTORS.FILTERS),
    "Failed to load mentor filters.",
  );
  return envelope.data;
}

export async function getMentorsApi(query: MentorListQuery = {}): Promise<MentorListDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorListDto>>(
    httpClient.get(API_ROUTES.MENTORS.LIST, { params: query }),
    "Failed to load mentors.",
  );
  return envelope.data;
}

export async function getMentorProfileApi(slug: string): Promise<MentorPublicProfileDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorPublicProfileDto>>(
    httpClient.get(API_ROUTES.MENTORS.DETAIL(slug)),
    "Failed to load mentor profile.",
  );
  return envelope.data;
}

export async function getMyMentorProfileApi(): Promise<MentorProfileDto | null> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorProfileDto | null>>(
    httpClient.get(API_ROUTES.MENTORS.MY_PROFILE),
    "Failed to load your mentor profile.",
  );
  return envelope.data;
}

export async function updateMyMentorProfileApi(
  payload: UpdateMentorProfileRequest,
): Promise<MentorProfileDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorProfileDto>>(
    httpClient.patch(API_ROUTES.MENTORS.MY_PROFILE, payload),
    "Failed to update your mentor profile.",
  );
  return envelope.data;
}

export async function submitMyMentorProfileApi(): Promise<MentorProfileDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorProfileDto>>(
    httpClient.post(API_ROUTES.MENTORS.SUBMIT_PROFILE),
    "Failed to submit your mentor profile.",
  );
  return envelope.data;
}

export async function getAdminMentorsApi(
  query: AdminMentorListQuery = {},
): Promise<AdminMentorListDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminMentorListDto>>(
    httpClient.get(API_ROUTES.ADMIN_MENTORS.LIST, { params: query }),
    "Failed to load mentor applications.",
  );
  return envelope.data;
}

export async function updateAdminMentorStatusApi(
  profileId: string,
  payload: UpdateAdminMentorStatusRequest,
): Promise<MentorProfileDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorProfileDto>>(
    httpClient.patch(API_ROUTES.ADMIN_MENTORS.STATUS(profileId), payload),
    "Failed to update mentor status.",
  );
  return envelope.data;
}

export async function searchMentorSkillsApi(
  query: SkillSearchQuery,
): Promise<SkillPickerItemDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<SkillPickerItemDto[]>>(
    httpClient.get(API_ROUTES.SKILLS.LIST, { params: query }),
    "Failed to load skills.",
  );
  return envelope.data;
}

export async function downloadAdminMentorAvatarApi(profileId: string): Promise<Blob> {
  const response = await httpClient.get<Blob>(API_ROUTES.ADMIN_MENTORS.AVATAR(profileId), {
    responseType: "blob",
  });
  return response.data;
}

// ── Slot types & APIs ──────────────────────────────────────────────────────

export const MENTOR_SLOT_STATUSES = ["OPEN", "HELD", "BOOKED", "BLOCKED"] as const;
export type MentorSlotStatus = (typeof MENTOR_SLOT_STATUSES)[number];

export interface MentorSlotDto {
  id: string;
  startsAt: string;
  endsAt: string;
  status: MentorSlotStatus;
  holdExpiresAt?: string | null;
}

export interface ListMentorSlotsQuery {
  from: string;
  to: string;
}

export interface CreateMentorSlotDto {
  startsAt: string;
  endsAt: string;
}

export async function getMentorSlotsApi(
  slug: string,
  query: ListMentorSlotsQuery,
): Promise<MentorSlotDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorSlotDto[]>>(
    httpClient.get(API_ROUTES.MENTORS.SLOTS(slug), { params: query }),
    "Failed to load mentor slots.",
  );
  return envelope.data;
}

export async function getMyMentorSlotsApi(
  query: ListMentorSlotsQuery,
): Promise<MentorSlotDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorSlotDto[]>>(
    httpClient.get(API_ROUTES.MENTORS.MY_SLOTS, { params: query }),
    "Failed to load your mentor slots.",
  );
  return envelope.data;
}

export async function createMentorSlotApi(
  payload: CreateMentorSlotDto,
): Promise<MentorSlotDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorSlotDto>>(
    httpClient.post(API_ROUTES.MENTORS.MY_SLOTS, payload),
    "Failed to create slot.",
  );
  return envelope.data;
}

export async function deleteMentorSlotApi(
  slotId: string,
): Promise<{ deleted: true }> {
  const envelope = await unwrapEnvelope<ApiEnvelope<{ deleted: true }>>(
    httpClient.delete(API_ROUTES.MENTORS.MY_SLOT(slotId)),
    "Failed to delete slot.",
  );
  return envelope.data;
}
