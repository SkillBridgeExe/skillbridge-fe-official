// ─── Public company APIs ────────────────────────────────────────────
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import type { PublicCompanyDto, PublicJobDto, PublicJobsQuery, Page } from "@/types/jobs";
import { serializeJobParams } from "./jobs";

// §4.4 Company detail
export async function getCompanyDetailApi(slug: string): Promise<PublicCompanyDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<PublicCompanyDto>>(
    httpClient.get(API_ROUTES.COMPANIES.DETAIL(slug)),
    "Failed to load company details.",
  );
  return envelope.data;
}

// §4.4 Company jobs
export async function getCompanyJobsApi(
  slug: string,
  query: PublicJobsQuery = {},
): Promise<Page<PublicJobDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Page<PublicJobDto>>>(
    httpClient.get(API_ROUTES.COMPANIES.JOBS(slug), {
      params: query,
      paramsSerializer: { serialize: serializeJobParams },
    }),
    "Failed to load company jobs.",
  );
  return envelope.data;
}
