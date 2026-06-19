import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/app";
import {
  downloadAdminMentorAvatar,
  getAdminMentors,
  getMentorFilters,
  getMentorProfile,
  getMentors,
  getMentorSummary,
  getMyMentorProfile,
  searchMentorSkills,
  submitMyMentorProfile,
  updateAdminMentorStatus,
  updateMyMentorProfile,
  type AdminMentorListQuery,
  type MentorListQuery,
  type SkillSearchQuery,
  type UpdateAdminMentorStatusRequest,
} from "@/services/mentor.service";

export function useAdminMentorAvatar(profileId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "mentors", profileId ?? "", "avatar"],
    queryFn: () => downloadAdminMentorAvatar(profileId!),
    enabled: Boolean(profileId) && enabled,
  });
}

export function useMentorSummary() {
  return useQuery({ queryKey: QUERY_KEYS.MENTOR_SUMMARY, queryFn: getMentorSummary });
}

export function useMentorFilters() {
  return useQuery({ queryKey: QUERY_KEYS.MENTOR_FILTERS, queryFn: getMentorFilters });
}

export function useMentors(query: MentorListQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.MENTORS(query),
    queryFn: () => getMentors(query),
  });
}

export function useMentorProfile(slug: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.MENTOR(slug ?? ""),
    queryFn: () => getMentorProfile(slug!),
    enabled: Boolean(slug),
  });
}

export function useMyMentorProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.MY_MENTOR_PROFILE,
    queryFn: getMyMentorProfile,
  });
}

export function useMentorSkills(query: SkillSearchQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.MENTOR_SKILLS(query),
    queryFn: () => searchMentorSkills(query),
  });
}

export function useUpdateMyMentorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyMentorProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(QUERY_KEYS.MY_MENTOR_PROFILE, profile);
      void invalidateMentorCaches(queryClient);
    },
  });
}

export function useSubmitMyMentorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitMyMentorProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(QUERY_KEYS.MY_MENTOR_PROFILE, profile);
      void invalidateMentorCaches(queryClient);
    },
  });
}

export function useAdminMentors(query: AdminMentorListQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_MENTORS(query),
    queryFn: () => getAdminMentors(query),
  });
}

export function useUpdateAdminMentorStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      profileId,
      payload,
    }: {
      profileId: string;
      payload: UpdateAdminMentorStatusRequest;
    }) => updateAdminMentorStatus(profileId, payload),
    onSuccess: () => {
      void invalidateMentorCaches(queryClient);
    },
  });
}

function invalidateMentorCaches(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["mentors"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "mentors"] }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_MENTOR_PROFILE }),
  ]);
}
