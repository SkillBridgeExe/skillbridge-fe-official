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
  getMentorSlotsApi,
  getMyMentorSlotsApi,
  createMentorSlotApi,
  blockMentorSlotApi,
  deleteMentorSlotApi,
  getMyMentorAvailabilityTemplateApi,
  type AdminMentorListQuery,
  type CreateMentorSlotDto,
  type ListMentorSlotsQuery,
  saveMyMentorAvailabilityTemplateApi,
  unblockMentorSlotApi,
  type SaveMentorAvailabilityTemplateRequest,
  type MentorListQuery,
  type SkillSearchQuery,
  type UpdateAdminMentorStatusRequest,
  type UpdateMentorProfileRequest,
} from "@/api/mentors";

export type {
  AdminMentorListQuery,
  AdminMentorListDto,
  CreateMentorSlotDto,
  ListMentorSlotsQuery,
  MentorAvailabilityTemplateDto,
  MentorAvailabilityWindow,
  MentorCardDto,
  MentorFiltersDto,
  MentorListDto,
  MentorListQuery,
  MentorProfileDto,
  MentorPublicProfileDto,
  MentorProfileStatus,
  MentorSkillDto,
  MentorSlotDto,
  MentorSlotSource,
  MentorSlotStatus,
  MentorSort,
  MentorSummaryDto,
  SkillPickerItemDto,
  SkillSearchQuery,
  UpdateAdminMentorStatusRequest,
  UpdateMentorProfileRequest,
  SaveMentorAvailabilityTemplateRequest,
} from "@/api/mentors";

export {
  MENTOR_PROFILE_STATUSES,
  MENTOR_SESSION_DURATIONS,
  MENTOR_SLOT_SOURCES,
  MENTOR_SORTS,
  MENTOR_SLOT_STATUSES,
} from "@/api/mentors";

export const getMentorSummary = () => getMentorSummaryApi();
export const getMentorFilters = () => getMentorFiltersApi();
export const getMentors = (query: MentorListQuery = {}) => getMentorsApi(query);
export const getMentorProfile = (slug: string) => getMentorProfileApi(slug);
export const getMyMentorProfile = () => getMyMentorProfileApi();
export const updateMyMentorProfile = (payload: UpdateMentorProfileRequest) =>
  updateMyMentorProfileApi(payload);
export const submitMyMentorProfile = () => submitMyMentorProfileApi();
export const getAdminMentors = (query: AdminMentorListQuery = {}) =>
  getAdminMentorsApi(query);
export const updateAdminMentorStatus = (
  profileId: string,
  payload: UpdateAdminMentorStatusRequest,
) => updateAdminMentorStatusApi(profileId, payload);
export const searchMentorSkills = (query: SkillSearchQuery) => searchMentorSkillsApi(query);
export const downloadAdminMentorAvatar = (profileId: string) =>
  downloadAdminMentorAvatarApi(profileId);

// Slots
export const getMentorSlots = (slug: string, query: ListMentorSlotsQuery) =>
  getMentorSlotsApi(slug, query);
export const getMyMentorSlots = (query: ListMentorSlotsQuery) =>
  getMyMentorSlotsApi(query);
export const createMentorSlot = (payload: CreateMentorSlotDto) =>
  createMentorSlotApi(payload);
export const getMyMentorAvailabilityTemplate = () =>
  getMyMentorAvailabilityTemplateApi();
export const saveMyMentorAvailabilityTemplate = (
  payload: SaveMentorAvailabilityTemplateRequest,
) => saveMyMentorAvailabilityTemplateApi(payload);
export const blockMentorSlot = (slotId: string) => blockMentorSlotApi(slotId);
export const unblockMentorSlot = (slotId: string) => unblockMentorSlotApi(slotId);
export const deleteMentorSlot = (slotId: string) =>
  deleteMentorSlotApi(slotId);
