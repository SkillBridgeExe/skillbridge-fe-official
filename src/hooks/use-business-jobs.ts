// ─── Business job editor + pipeline hooks (TanStack Query) ─────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBusinessJobsApi, createJobDraftApi, getBusinessJobDetailApi,
  updateJobDraftApi, extractJobSkillsApi, replaceJobSkillsApi,
  publishJobApi, closeJobApi, duplicateJobApi, deleteJobApi,
  getBusinessApplicationsApi, getBusinessApplicationDetailApi,
  downloadApplicationCvApi, updateApplicationStatusApi,
  getBusinessDashboardApi,
} from "@/api/business-jobs";
import type {
  BusinessJobsQuery, CreateJobDraftRequest, UpdateJobDraftRequest,
  ReplaceDraftSkillsRequest, BusinessApplicationsQuery,
  UpdateApplicationStatusRequest,
  BusinessJobDetailResponse,
  JobVersionDto,
} from "@/types/jobs";

// ── Keys ────────────────────────────────────────────────────────────
const keys = {
  list: (q: BusinessJobsQuery) => ["businessJobs", q] as const,
  detail: (jobId: string) => ["businessJobDetail", jobId] as const,
  applications: (jobId: string, q: BusinessApplicationsQuery) =>
    ["businessApplications", jobId, q] as const,
  applicationDetail: (appId: string) => ["businessApplicationDetail", appId] as const,
  dashboard: ["businessDashboard"] as const,
};

/** A mutation returns a new draft revision but not a new readiness evaluation. */
export function withStalePublishReadiness(
  current: BusinessJobDetailResponse,
  draft: JobVersionDto,
): BusinessJobDetailResponse {
  return {
    ...current,
    draft,
    publishReadiness: {
      ready: false,
      blockers: [{
        code: "READINESS_STALE",
        field: "review",
        message: "Checking publish readiness for the latest draft.",
      }],
    },
  };
}

// ── Queries ─────────────────────────────────────────────────────────

export function useBusinessJobsQuery(query: BusinessJobsQuery = {}) {
  return useQuery({
    queryKey: keys.list(query),
    queryFn: () => getBusinessJobsApi(query),
  });
}

export function useBusinessDashboardQuery() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: getBusinessDashboardApi,
  });
}

export function useBusinessJobDetailQuery(jobId: string | undefined) {
  return useQuery({
    queryKey: keys.detail(jobId ?? ""),
    queryFn: () => getBusinessJobDetailApi(jobId!),
    enabled: !!jobId,
  });
}

export function useBusinessApplicationsQuery(
  jobId: string | undefined,
  query: BusinessApplicationsQuery = {},
) {
  return useQuery({
    queryKey: keys.applications(jobId ?? "", query),
    queryFn: () => getBusinessApplicationsApi(jobId!, query),
    enabled: !!jobId,
  });
}

export function useBusinessApplicationDetailQuery(appId: string | undefined) {
  return useQuery({
    queryKey: keys.applicationDetail(appId ?? ""),
    queryFn: () => getBusinessApplicationDetailApi(appId!),
    enabled: !!appId,
  });
}

// ── Mutations ───────────────────────────────────────────────────────

export function useCreateJobDraftMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateJobDraftRequest) => createJobDraftApi(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businessJobs"] });
      qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useUpdateJobDraftMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, body }: { jobId: string; body: UpdateJobDraftRequest }) =>
      updateJobDraftApi(jobId, body),
    onSuccess: (draft, vars) => {
      qc.setQueryData(keys.detail(vars.jobId), (current: BusinessJobDetailResponse | undefined) => {
        return current ? withStalePublishReadiness(current, draft) : current;
      });
      qc.invalidateQueries({ queryKey: keys.detail(vars.jobId) });
      qc.invalidateQueries({ queryKey: ["businessJobs"] });
      qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useExtractJobSkillsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, revision }: { jobId: string; revision: number }) =>
      extractJobSkillsApi(jobId, revision),
    onSuccess: (draft, vars) => {
      qc.setQueryData(keys.detail(vars.jobId), (current: BusinessJobDetailResponse | undefined) => {
        return current ? withStalePublishReadiness(current, draft) : current;
      });
      qc.invalidateQueries({ queryKey: keys.detail(vars.jobId) });
    },
  });
}

export function useReplaceJobSkillsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, body }: { jobId: string; body: ReplaceDraftSkillsRequest }) =>
      replaceJobSkillsApi(jobId, body),
    onSuccess: (draft, vars) => {
      qc.setQueryData(keys.detail(vars.jobId), (current: BusinessJobDetailResponse | undefined) => {
        return current ? withStalePublishReadiness(current, draft) : current;
      });
      qc.invalidateQueries({ queryKey: keys.detail(vars.jobId) });
    },
  });
}

export function usePublishJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, revision }: { jobId: string; revision: number }) =>
      publishJobApi(jobId, revision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businessJobs"] });
      qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useCloseJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => closeJobApi(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businessJobs"] });
      qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useDuplicateJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => duplicateJobApi(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businessJobs"] });
      qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useDeleteJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => deleteJobApi(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businessJobs"] });
      qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useDownloadApplicationCvMutation() {
  return useMutation({
    mutationFn: (applicationId: string) => downloadApplicationCvApi(applicationId),
  });
}

export function useUpdateApplicationStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      body,
    }: {
      applicationId: string;
      body: UpdateApplicationStatusRequest;
    }) => updateApplicationStatusApi(applicationId, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["businessApplications"] });
      qc.invalidateQueries({ queryKey: keys.applicationDetail(vars.applicationId) });
      qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}
