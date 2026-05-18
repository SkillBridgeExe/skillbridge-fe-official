import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import type { CvReviewData, CvReviewResponse } from "@shared/api";

export interface ReviewCvInput {
  cvFile: File;
  jobDescription?: string;
}

export async function reviewCv({ cvFile, jobDescription }: ReviewCvInput): Promise<CvReviewData> {
  const formData = new FormData();
  formData.append("cv", cvFile);
  const normalizedJd = jobDescription?.trim() ?? "";

  if (normalizedJd.length > 0) {
    formData.append("jobDescription", normalizedJd);
  }

  const endpoint =
    normalizedJd.length > 0
      ? API_ROUTES.DIAGNOSIS.CV_JD_REVIEW
      : API_ROUTES.DIAGNOSIS.CV_ANALYZE;

  const { data: payload } = await httpClient.post<CvReviewResponse>(endpoint, formData);

  if ("error" in payload) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}
