// ─── Public + USER job hooks (TanStack Query) ──────────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getJobsApi, getJobFiltersApi, getJobDetailApi, matchJobApi,
  saveJobApi, unsaveJobApi, getSavedJobsApi,
  applyToJobApi, getMyApplicationsApi, getMyApplicationDetailApi,
  withdrawApplicationApi, reportJobApi,
} from "@/api/jobs";
import { getCompanyDetailApi, getCompanyJobsApi } from "@/api/companies";
import type {
  PublicJobsQuery, PaginationQuery, ApplyToJobRequest, ReportJobRequest,
} from "@/types/jobs";

// ── Keys ────────────────────────────────────────────────────────────
const keys = {
  jobs: (q: PublicJobsQuery) => ["jobs", q] as const,
  jobFilters: ["jobFilters"] as const,
  jobDetail: (slug: string) => ["jobDetail", slug] as const,
  jobMatch: (jobId: string, cvId: string) => ["jobMatch", jobId, cvId] as const,
  savedJobs: (q: PaginationQuery) => ["savedJobs", q] as const,
  myApplications: (q: PaginationQuery) => ["myApplications", q] as const,
  myApplicationDetail: (id: string) => ["myApplicationDetail", id] as const,
  companyDetail: (slug: string) => ["companyDetail", slug] as const,
  companyJobs: (slug: string, q: PublicJobsQuery) => ["companyJobs", slug, q] as const,
};

// ── Queries ─────────────────────────────────────────────────────────

export function useJobsQuery(query: PublicJobsQuery = {}) {
  return useQuery({
    queryKey: keys.jobs(query),
    queryFn: () => getJobsApi(query),
  });
}

export function useJobFiltersQuery() {
  return useQuery({
    queryKey: keys.jobFilters,
    queryFn: getJobFiltersApi,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJobDetailQuery(slug: string | undefined) {
  return useQuery({
    queryKey: keys.jobDetail(slug ?? ""),
    queryFn: () => getJobDetailApi(slug!),
    enabled: !!slug,
  });
}

export function useJobMatchQuery(jobId: string | undefined, cvId: string | undefined) {
  return useQuery({
    queryKey: keys.jobMatch(jobId ?? "", cvId ?? ""),
    queryFn: () => matchJobApi(jobId!, cvId!),
    enabled: !!jobId && !!cvId,
  });
}

export function useSavedJobsQuery(opts: PaginationQuery & { enabled?: boolean } = {}) {
  const { enabled = true, ...query } = opts;
  return useQuery({
    queryKey: keys.savedJobs(query),
    queryFn: () => getSavedJobsApi(query),
    enabled,
  });
}

export function useMyApplicationsQuery(query: PaginationQuery = {}) {
  return useQuery({
    queryKey: keys.myApplications(query),
    queryFn: () => getMyApplicationsApi(query),
  });
}

export function useMyApplicationDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: keys.myApplicationDetail(id ?? ""),
    queryFn: () => getMyApplicationDetailApi(id!),
    enabled: !!id,
  });
}

export function useCompanyDetailQuery(slug: string | undefined) {
  return useQuery({
    queryKey: keys.companyDetail(slug ?? ""),
    queryFn: () => getCompanyDetailApi(slug!),
    enabled: !!slug,
  });
}

export function useCompanyJobsQuery(slug: string | undefined, query: PublicJobsQuery = {}) {
  return useQuery({
    queryKey: keys.companyJobs(slug ?? "", query),
    queryFn: () => getCompanyJobsApi(slug!, query),
    enabled: !!slug,
  });
}

// ── Mutations ───────────────────────────────────────────────────────

export function useSaveJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => saveJobApi(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savedJobs"] });
    },
  });
}

export function useUnsaveJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => unsaveJobApi(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savedJobs"] });
    },
  });
}

export function useApplyToJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, body }: { jobId: string; body: ApplyToJobRequest }) =>
      applyToJobApi(jobId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myApplications"] });
    },
  });
}

export function useWithdrawApplicationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => withdrawApplicationApi(applicationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myApplications"] });
    },
  });
}

export function useReportJobMutation() {
  return useMutation({
    mutationFn: ({ jobId, body }: { jobId: string; body: ReportJobRequest }) =>
      reportJobApi(jobId, body),
  });
}
