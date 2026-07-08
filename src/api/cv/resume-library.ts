import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { getCvDetailApi } from "@/api/cv/list";
import { updateBuilderDraftApi } from "@/api/cv/builder";
import type { CvDto, CvListItemDto, Paginated } from "@shared/api";

/** GET /api/cvs — list user's CVs. Optionally filter by cvKind. */
export async function listResumesApi(
  params: { cvKind?: "BUILT" | "UPLOADED"; page?: number; limit?: number } = {},
): Promise<Paginated<CvListItemDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Paginated<CvListItemDto>>>(
    httpClient.get(API_ROUTES.CV.LIST, { params }),
    "Failed to load the resume list.",
  );
  return envelope.data;
}

/** DELETE /api/cvs/:id — permanently delete a CV. */
export async function deleteResumeApi(id: string): Promise<void> {
  await httpClient.delete(API_ROUTES.CV.DELETE(id));
}

/** Duplicate by creating a new builder draft using sourceCvId. */
export async function duplicateResumeApi(
  sourceCvId: string,
  title: string,
): Promise<CvDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvDto>>(
    httpClient.post(API_ROUTES.CV.BUILDER_CREATE, {
      sourceCvId,
      title,
    }),
    "Failed to duplicate the CV.",
  );
  return envelope.data;
}

/** Rename a CV. */
export async function renameResumeApi(
  id: string,
  title: string,
): Promise<CvDto> {
  const detail = await getCvDetailApi(id);
  if (!detail.parsedJson) {
    throw new Error("Cannot rename a CV without builder data.");
  }
  return updateBuilderDraftApi(id, {
    parsedJson: detail.parsedJson,
    targetRole: detail.targetRole ?? undefined,
    language: detail.language === "vi" || detail.language === "en" ? detail.language : undefined,
    title,
  });
}
