import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminBusinessProfilesApi, getAdminBusinessProfileApi,
  reviewBusinessProfileApi, getAdminJobReportsApi,
  resolveJobReportApi, getAdminJobApi, removeAdminJobApi,
} from "@/api/admin-jobs";
import type {
  AdminBusinessProfilesQuery, ReviewBusinessRequest,
  AdminJobReportsQuery, ResolveJobReportRequest, RemoveJobRequest,
} from "@/types/jobs";

const keys = {
  profiles: (q: AdminBusinessProfilesQuery) => ["adminBusinessProfiles", q] as const,
  profileDetail: (id: string) => ["adminBusinessProfile", id] as const,
  reports: (q: AdminJobReportsQuery) => ["adminJobReports", q] as const,
  jobDetail: (id: string) => ["adminJobDetail", id] as const,
};

export function useAdminBusinessProfilesQuery(query: AdminBusinessProfilesQuery = {}) {
  return useQuery({
    queryKey: keys.profiles(query),
    queryFn: () => getAdminBusinessProfilesApi(query),
  });
}

export function useAdminBusinessProfileDetailQuery(profileId: string | undefined) {
  return useQuery({
    queryKey: keys.profileDetail(profileId ?? ""),
    queryFn: () => getAdminBusinessProfileApi(profileId!),
    enabled: !!profileId,
  });
}

export function useReviewBusinessProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, body }: { profileId: string; body: ReviewBusinessRequest }) =>
      reviewBusinessProfileApi(profileId, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["adminBusinessProfiles"] });
      qc.invalidateQueries({ queryKey: keys.profileDetail(vars.profileId) });
    },
  });
}

export function useAdminJobReportsQuery(query: AdminJobReportsQuery = {}) {
  return useQuery({
    queryKey: keys.reports(query),
    queryFn: () => getAdminJobReportsApi(query),
  });
}

export function useResolveJobReportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, body }: { reportId: string; body: ResolveJobReportRequest }) =>
      resolveJobReportApi(reportId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminJobReports"] });
    },
  });
}

export function useAdminJobQuery(jobId: string | undefined) {
  return useQuery({
    queryKey: keys.jobDetail(jobId ?? ""),
    queryFn: () => getAdminJobApi(jobId!),
    enabled: !!jobId,
  });
}

export function useRemoveAdminJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, body }: { jobId: string; body: RemoveJobRequest }) =>
      removeAdminJobApi(jobId, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.jobDetail(vars.jobId) });
    },
  });
}
