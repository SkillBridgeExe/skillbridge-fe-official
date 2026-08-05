import { isAxiosError } from "axios";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { JobRecommendationsResponse } from "@shared/api";

export interface JobRecommendationsQuery {
  limit?: number;
  offset?: number;
  /** Role code filter; BE mặc định theo targetRole của CV, hoặc "all". */
  role?: string;
  cityCodes?: string[];
  workModes?: ("ONSITE" | "HYBRID" | "REMOTE")[];
  employmentTypes?: ("FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT" | "FREELANCE")[];
  experienceLevels?: ("INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD")[];
  fit?: ("safe_apply" | "stretch" | "not_recommended")[];
  sort?: "RECOMMENDED" | "SKILL_MATCH" | "NEWEST" | "SALARY_DESC";
  salaryOnly?: boolean;
  /** Free-text search across job title and company name. */
  q?: string;
  /** Filter by free-form city labels from crawl sources. */
  cityNames?: string[];
  /** Filter by district codes. */
  districtCodes?: string[];
  /** Filter by recruitment source identifiers. */
  sourceNames?: string[];
  /** Filter jobs posted from this date (YYYY-MM-DD). */
  postedFrom?: string;
  /** Filter jobs posted until this date (YYYY-MM-DD). */
  postedTo?: string;
  /** Minimum salary filter (requires salaryCurrency). */
  salaryMin?: number;
  /** Maximum salary filter (requires salaryCurrency). */
  salaryMax?: number;
  /** Currency code for salary filters (ISO 4217, e.g. 'VND'). */
  salaryCurrency?: string;
  snapshotToken?: string;
}

/**
 * GET /api/cvs/:cvId/job-recommendations — top job thật cho CV
 * (hybrid skill-match + embedding, RRF-fused). pool_size=0 → pool chưa có
 * data cho role này, UI hiển thị empty-state.
 */
export async function getJobRecommendationsApi(
  cvId: string,
  query: JobRecommendationsQuery = {},
): Promise<JobRecommendationsResponse> {
  const params: Record<string, unknown> = { ...query };
  if (Array.isArray(query.cityCodes) && query.cityCodes.length > 0) {
    params.cityCodes = query.cityCodes.join(",");
  }
  if (Array.isArray(query.workModes) && query.workModes.length > 0) {
    params.workModes = query.workModes.join(",");
  }
  if (Array.isArray(query.employmentTypes) && query.employmentTypes.length > 0) {
    params.employmentTypes = query.employmentTypes.join(",");
  }
  if (Array.isArray(query.experienceLevels) && query.experienceLevels.length > 0) {
    params.experienceLevels = query.experienceLevels.join(",");
  }
  if (Array.isArray(query.fit) && query.fit.length > 0) {
    params.fit = query.fit.join(",");
  }
  if (Array.isArray(query.cityNames) && query.cityNames.length > 0) {
    params.cityNames = query.cityNames.join(",");
  }
  if (Array.isArray(query.districtCodes) && query.districtCodes.length > 0) {
    params.districtCodes = query.districtCodes.join(",");
  }
  if (Array.isArray(query.sourceNames) && query.sourceNames.length > 0) {
    params.sourceNames = query.sourceNames.join(",");
  }
  if (query.snapshotToken) {
    params.snapshotToken = query.snapshotToken;
  }

  let rawStatus: number | undefined;
  const request = httpClient
    .get<ApiEnvelope<JobRecommendationsResponse>>(API_ROUTES.CV.JOB_RECOMMENDATIONS(cvId), {
      params,
    })
    .catch((error: unknown) => {
      if (isAxiosError(error)) rawStatus = error.response?.status;
      throw error;
    });

  try {
    const envelope = await unwrapEnvelope<ApiEnvelope<JobRecommendationsResponse>>(
      request,
      "Failed to load job recommendations.",
    );
    return envelope.data;
  } catch (error) {
    if (rawStatus && error && typeof error === "object") {
      (error as { status?: number }).status = rawStatus;
    }
    throw error;
  }
}
