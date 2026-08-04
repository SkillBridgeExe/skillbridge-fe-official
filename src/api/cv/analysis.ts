import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { uiFeedbackLang } from "@/lib/ui-locale";
import type { CvDto, CvMatchDto } from "@shared/api";
import { CV_AI_TIMEOUT_MS } from "./upload";

export interface CvAnalysisResponse {
  status: "ANALYZED" | "UPLOADED_ONLY" | "REVIEWED_ONLY";
  cv: CvDto;
  match: CvMatchDto | null;
  requiredCreditType: "CV_ANALYSIS" | "INTERVIEW_SESSION" | null;
  matchErrorCode?: string;
}

export async function analyzeCvApi(input: {
  file?: File | null;
  cvId?: string | null;
  targetRole: string;
  consentAccepted: boolean;
  jdText?: string;
}): Promise<CvAnalysisResponse> {
  const formData = new FormData();
  if (input.file) formData.append("file", input.file);
  if (input.cvId) formData.append("cvId", input.cvId);
  formData.append("targetRole", input.targetRole);
  formData.append("consentAccepted", String(input.consentAccepted));
  formData.append("lang", uiFeedbackLang());
  if (input.jdText) formData.append("jdText", input.jdText);

  const envelope = await unwrapEnvelope<ApiEnvelope<CvAnalysisResponse>>(
    httpClient.post(API_ROUTES.DIAGNOSIS.CV_ANALYSIS, formData, {
      timeout: CV_AI_TIMEOUT_MS,
      headers: { "Content-Type": "multipart/form-data" },
    }),
    "Failed to analyze CV.",
  );
  return envelope.data;
}
