// ─── Business job editor + applicant pipeline APIs ──────────────────
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import type {
  Page, JobEntityDto, JobVersionDto,
  BusinessJobsQuery, CreateJobDraftRequest, CreateJobDraftResponse,
  BusinessJobDetailResponse, UpdateJobDraftRequest,
  ReplaceDraftSkillsRequest, PublishJobResponse,
  JobApplicationDto, BusinessApplicationsQuery,
  BusinessApplicationDetailResponse, UpdateApplicationStatusRequest,
} from "@/types/jobs";

// §7.2 List employer jobs
export async function getBusinessJobsApi(
  query: BusinessJobsQuery = {},
): Promise<Page<JobEntityDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Page<JobEntityDto>>>(
    httpClient.get(API_ROUTES.BUSINESS_JOBS.LIST, { params: query }),
    "Failed to load your jobs.",
  );
  return envelope.data;
}

// §7.2 Create job draft
export async function createJobDraftApi(
  body: CreateJobDraftRequest,
): Promise<CreateJobDraftResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CreateJobDraftResponse>>(
    httpClient.post(API_ROUTES.BUSINESS_JOBS.CREATE, body),
    "Failed to create job draft.",
  );
  return envelope.data;
}

// §7.2 Get job detail (business view)
export async function getBusinessJobDetailApi(
  jobId: string,
): Promise<BusinessJobDetailResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BusinessJobDetailResponse>>(
    httpClient.get(API_ROUTES.BUSINESS_JOBS.DETAIL(jobId)),
    "Failed to load job details.",
  );
  return envelope.data;
}

// §7.3 Update draft
export async function updateJobDraftApi(
  jobId: string,
  body: UpdateJobDraftRequest,
): Promise<JobVersionDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobVersionDto>>(
    httpClient.patch(API_ROUTES.BUSINESS_JOBS.DRAFT(jobId), body),
    "Failed to update job draft.",
  );
  return envelope.data;
}

// §7.4 Extract skills
export async function extractJobSkillsApi(
  jobId: string,
  expectedRevision: number,
): Promise<JobVersionDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobVersionDto>>(
    httpClient.post(API_ROUTES.BUSINESS_JOBS.EXTRACT_SKILLS(jobId), { expectedRevision }),
    "Failed to extract skills.",
  );
  return envelope.data;
}

// §7.4 Replace/confirm skills
export async function replaceJobSkillsApi(
  jobId: string,
  body: ReplaceDraftSkillsRequest,
): Promise<JobVersionDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobVersionDto>>(
    httpClient.put(API_ROUTES.BUSINESS_JOBS.SKILLS(jobId), body),
    "Failed to update job skills.",
  );
  return envelope.data;
}

// §7.5 Publish
export async function publishJobApi(
  jobId: string,
  expectedRevision: number,
): Promise<PublishJobResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<PublishJobResponse>>(
    httpClient.post(API_ROUTES.BUSINESS_JOBS.PUBLISH(jobId), { expectedRevision }),
    "Failed to publish job.",
  );
  return envelope.data;
}

// §7.5 Close
export async function closeJobApi(jobId: string): Promise<JobEntityDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobEntityDto>>(
    httpClient.post(API_ROUTES.BUSINESS_JOBS.CLOSE(jobId)),
    "Failed to close job.",
  );
  return envelope.data;
}

// §7.5 Duplicate
export async function duplicateJobApi(
  jobId: string,
): Promise<CreateJobDraftResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CreateJobDraftResponse>>(
    httpClient.post(API_ROUTES.BUSINESS_JOBS.DUPLICATE(jobId)),
    "Failed to duplicate job.",
  );
  return envelope.data;
}

// §7.5 Delete (draft only)
export async function deleteJobApi(jobId: string): Promise<{ deleted: true }> {
  const envelope = await unwrapEnvelope<ApiEnvelope<{ deleted: true }>>(
    httpClient.delete(API_ROUTES.BUSINESS_JOBS.DELETE(jobId)),
    "Failed to delete job.",
  );
  return envelope.data;
}

// §8.1 List applications for a job
export async function getBusinessApplicationsApi(
  jobId: string,
  query: BusinessApplicationsQuery = {},
): Promise<Page<JobApplicationDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Page<JobApplicationDto>>>(
    httpClient.get(API_ROUTES.BUSINESS_JOBS.APPLICATIONS(jobId), { params: query }),
    "Failed to load applications.",
  );
  return envelope.data;
}

// §8.2 Application detail (business)
export async function getBusinessApplicationDetailApi(
  applicationId: string,
): Promise<BusinessApplicationDetailResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BusinessApplicationDetailResponse>>(
    httpClient.get(API_ROUTES.BUSINESS_APPLICATIONS.DETAIL(applicationId)),
    "Failed to load application details.",
  );
  return envelope.data;
}

// §8.3 Download CV snapshot
export async function downloadApplicationCvApi(applicationId: string): Promise<Blob> {
  const response = await httpClient.get<Blob>(
    API_ROUTES.BUSINESS_APPLICATIONS.CV(applicationId),
    { responseType: "blob" },
  );
  return response.data;
}

// §8.4 Update application status
export async function updateApplicationStatusApi(
  applicationId: string,
  body: UpdateApplicationStatusRequest,
): Promise<JobApplicationDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobApplicationDto>>(
    httpClient.patch(API_ROUTES.BUSINESS_APPLICATIONS.STATUS(applicationId), body),
    "Failed to update application status.",
  );
  return envelope.data;
}
