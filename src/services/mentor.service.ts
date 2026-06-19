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
  type AdminMentorListQuery,
  type MentorListQuery,
  type SkillSearchQuery,
  type UpdateAdminMentorStatusRequest,
  type UpdateMentorProfileRequest,
} from "@/api/mentors";

export type {
  AdminMentorListQuery,
  AdminMentorListDto,
  MentorCardDto,
  MentorFiltersDto,
  MentorListDto,
  MentorListQuery,
  MentorProfileDto,
  MentorPublicProfileDto,
  MentorProfileStatus,
  MentorSkillDto,
  MentorSort,
  MentorSummaryDto,
  SkillPickerItemDto,
  SkillSearchQuery,
  UpdateAdminMentorStatusRequest,
  UpdateMentorProfileRequest,
} from "@/api/mentors";

export {
  MENTOR_PROFILE_STATUSES,
  MENTOR_SESSION_DURATIONS,
  MENTOR_SORTS,
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
