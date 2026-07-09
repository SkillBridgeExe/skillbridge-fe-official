import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { CvDto, CvVersionSummary, CvVersionDetail, Paginated } from "@shared/api";

/** GET /api/cvs/:id/versions — version history (newest first, no snapshot bodies). */
export async function listVersionsApi(
  cvId: string,
  params: { page?: number; limit?: number } = {},
): Promise<Paginated<CvVersionSummary>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Paginated<CvVersionSummary>>>(
    httpClient.get(API_ROUTES.CV.VERSIONS(cvId), { params }),
    "Failed to load version history.",
  );
  return envelope.data;
}

/** POST /api/cvs/:id/versions — snapshot the current document ("Save version"). */
export async function createVersionApi(cvId: string, label?: string): Promise<CvVersionSummary> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvVersionSummary>>(
    httpClient.post(API_ROUTES.CV.VERSIONS(cvId), label ? { label } : {}),
    "Failed to save version.",
  );
  return envelope.data;
}

/** GET /api/cvs/:id/versions/:versionId — one version incl. its snapshot. */
export async function getVersionApi(cvId: string, versionId: string): Promise<CvVersionDetail> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvVersionDetail>>(
    httpClient.get(API_ROUTES.CV.VERSION_DETAIL(cvId, versionId)),
    "Failed to load version.",
  );
  return envelope.data;
}

/** POST /api/cvs/:id/versions/:versionId/restore — restore (auto-snapshots current first). */
export async function restoreVersionApi(cvId: string, versionId: string): Promise<CvDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvDto>>(
    httpClient.post(API_ROUTES.CV.VERSION_RESTORE(cvId, versionId), {}),
    "Failed to restore version.",
  );
  return envelope.data;
}
