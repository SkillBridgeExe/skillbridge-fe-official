// ─── Public + USER job APIs ─────────────────────────────────────────
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import type {
  Page, PublicJobDto, PublicJobsQuery, JobFiltersResponse,
  JobMatchResult, SavedJobRow, SavedJobItem, PaginationQuery,
  ApplyToJobRequest, JobApplicationDto, CandidateApplicationDetailResponse,
  ReportJobRequest,
} from "@/types/jobs";

// §4.1 List jobs
// Arrays must be comma-separated (e.g. workModes=REMOTE,HYBRID) per API contract.
export function serializeJobParams(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) parts.push(`${key}=${value.join(",")}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join("&");
}

export async function getJobsApi(query: PublicJobsQuery = {}): Promise<Page<PublicJobDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Page<PublicJobDto>>>(
    httpClient.get(API_ROUTES.JOBS.LIST, {
      params: query,
      paramsSerializer: { serialize: serializeJobParams },
    }),
    "Failed to load jobs.",
  );
  return envelope.data;
}

// §4.2 Filter values
export async function getJobFiltersApi(): Promise<JobFiltersResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobFiltersResponse>>(
    httpClient.get(API_ROUTES.JOBS.FILTERS),
    "Failed to load job filters.",
  );
  return envelope.data;
}

// §4.3 Job detail
export async function getJobDetailApi(slug: string): Promise<PublicJobDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<PublicJobDto>>(
    httpClient.get(API_ROUTES.JOBS.DETAIL(slug)),
    "Failed to load job details.",
  );
  return envelope.data;
}

// §5.1 Match CV with job
export async function matchJobApi(jobId: string, cvId: string): Promise<JobMatchResult> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobMatchResult>>(
    httpClient.get(API_ROUTES.JOBS.MATCH(jobId), { params: { cvId } }),
    "Failed to match CV with job.",
  );
  return envelope.data;
}

// §5.2 Save / unsave job
export async function saveJobApi(jobId: string): Promise<SavedJobRow> {
  const envelope = await unwrapEnvelope<ApiEnvelope<SavedJobRow>>(
    httpClient.put(API_ROUTES.SAVED_JOBS.TOGGLE(jobId)),
    "Failed to save job.",
  );
  return envelope.data;
}

export async function unsaveJobApi(jobId: string): Promise<{ deleted: true }> {
  const envelope = await unwrapEnvelope<ApiEnvelope<{ deleted: true }>>(
    httpClient.delete(API_ROUTES.SAVED_JOBS.TOGGLE(jobId)),
    "Failed to unsave job.",
  );
  return envelope.data;
}

export async function getSavedJobsApi(query: PaginationQuery = {}): Promise<Page<SavedJobItem>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Page<SavedJobItem>>>(
    httpClient.get(API_ROUTES.SAVED_JOBS.LIST, { params: query }),
    "Failed to load saved jobs.",
  );
  return envelope.data;
}

// §5.3 Apply to native job
export async function applyToJobApi(
  jobId: string,
  body: ApplyToJobRequest,
): Promise<JobApplicationDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobApplicationDto>>(
    httpClient.post(API_ROUTES.JOBS.APPLY(jobId), body),
    "Failed to apply to job.",
  );
  return envelope.data;
}

// §5.4 My applications
export async function getMyApplicationsApi(
  query: PaginationQuery = {},
): Promise<Page<JobApplicationDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Page<JobApplicationDto>>>(
    httpClient.get(API_ROUTES.MY_APPLICATIONS.LIST, { params: query }),
    "Failed to load your applications.",
  );
  return envelope.data;
}

export async function getMyApplicationDetailApi(
  applicationId: string,
): Promise<CandidateApplicationDetailResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CandidateApplicationDetailResponse>>(
    httpClient.get(API_ROUTES.MY_APPLICATIONS.DETAIL(applicationId)),
    "Failed to load application details.",
  );
  return envelope.data;
}

export async function withdrawApplicationApi(
  applicationId: string,
): Promise<JobApplicationDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobApplicationDto>>(
    httpClient.post(API_ROUTES.MY_APPLICATIONS.WITHDRAW(applicationId)),
    "Failed to withdraw application.",
  );
  return envelope.data;
}

// §5.5 Report job
export async function reportJobApi(
  jobId: string,
  body: ReportJobRequest,
): Promise<Record<string, unknown>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Record<string, unknown>>>(
    httpClient.post(API_ROUTES.JOBS.REPORT(jobId), body),
    "Failed to report job.",
  );
  return envelope.data;
}
