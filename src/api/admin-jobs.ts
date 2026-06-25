// ─── Admin business review + job reports/takedown APIs ──────────────
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import type {
  Page, BusinessProfileDto, BusinessCompanyAggregate,
  JobEntityDto, JobReportDto,
  ReviewBusinessRequest, ResolveJobReportRequest, RemoveJobRequest,
  AdminBusinessProfilesQuery, AdminJobReportsQuery,
} from "@/types/jobs";

// §9.1 List business profiles
export async function getAdminBusinessProfilesApi(
  query: AdminBusinessProfilesQuery = {},
): Promise<Page<BusinessProfileDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Page<BusinessProfileDto>>>(
    httpClient.get(API_ROUTES.ADMIN_BUSINESS.PROFILES, { params: query }),
    "Failed to load business profiles.",
  );
  return envelope.data;
}

// §9.1 Get single profile
export async function getAdminBusinessProfileApi(
  profileId: string,
): Promise<BusinessCompanyAggregate> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BusinessCompanyAggregate>>(
    httpClient.get(API_ROUTES.ADMIN_BUSINESS.PROFILE(profileId)),
    "Failed to load business profile.",
  );
  return envelope.data;
}

export async function downloadAdminBusinessMediaApi(
  profileId: string,
  kind: "logo" | "cover",
): Promise<Blob> {
  const url =
    kind === "logo"
      ? API_ROUTES.ADMIN_BUSINESS.PROFILE_LOGO(profileId)
      : API_ROUTES.ADMIN_BUSINESS.PROFILE_COVER(profileId);
  const response = await httpClient.get<Blob>(url, { responseType: "blob" });
  return response.data;
}

// §9.1 Review business profile
export async function reviewBusinessProfileApi(
  profileId: string,
  body: ReviewBusinessRequest,
): Promise<BusinessProfileDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BusinessProfileDto>>(
    httpClient.patch(API_ROUTES.ADMIN_BUSINESS.PROFILE_STATUS(profileId), body),
    "Failed to review business profile.",
  );
  return envelope.data;
}

// §9.2 List job reports
export async function getAdminJobReportsApi(
  query: AdminJobReportsQuery = {},
): Promise<Page<JobReportDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Page<JobReportDto>>>(
    httpClient.get(API_ROUTES.ADMIN_JOBS.REPORTS, { params: query }),
    "Failed to load job reports.",
  );
  return envelope.data;
}

// §9.2 Resolve job report
export async function resolveJobReportApi(
  reportId: string,
  body: ResolveJobReportRequest,
): Promise<JobReportDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobReportDto>>(
    httpClient.patch(API_ROUTES.ADMIN_JOBS.RESOLVE_REPORT(reportId), body),
    "Failed to resolve job report.",
  );
  return envelope.data;
}

// §9.3 Get admin job detail
export async function getAdminJobApi(jobId: string): Promise<JobEntityDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobEntityDto>>(
    httpClient.get(API_ROUTES.ADMIN_JOBS.DETAIL(jobId)),
    "Failed to load job.",
  );
  return envelope.data;
}

// §9.3 Remove job (admin takedown)
export async function removeAdminJobApi(
  jobId: string,
  body: RemoveJobRequest,
): Promise<JobEntityDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<JobEntityDto>>(
    httpClient.patch(API_ROUTES.ADMIN_JOBS.STATUS(jobId), body),
    "Failed to remove job.",
  );
  return envelope.data;
}
