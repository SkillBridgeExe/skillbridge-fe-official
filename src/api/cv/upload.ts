import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { CvDto } from "@shared/api";

/**
 * POST /api/cvs chấm ĐỒNG BỘ (extract → parse → LLM) — cộng cold-start Cloud Run
 * (min-instances=0, ~5-15s) nên override timeout 15s mặc định của httpClient.
 */
export const CV_AI_TIMEOUT_MS = 90_000;

export interface UploadCvInput {
  file: File;
  /** Role code chuẩn BE, vd "frontend_developer" — rubric chấm relevance theo role. */
  targetRole?: string;
  /** Tiêu đề hiển thị; BE mặc định lấy tên file. */
  title?: string;
  /** BẮT BUỘC true — consent xử lý dữ liệu cá nhân trong CV (PDPL). */
  consentAccepted: boolean;
}

/** Upload CV + nhận kết quả chấm trong cùng response (data.review). */
export async function uploadCvApi({
  file,
  targetRole,
  title,
  consentAccepted,
}: UploadCvInput): Promise<CvDto> {
  const formData = new FormData();
  formData.append("file", file);
  if (targetRole) formData.append("targetRole", targetRole);
  if (title) formData.append("title", title);
  formData.append("consentAccepted", String(consentAccepted));

  const envelope = await unwrapEnvelope<ApiEnvelope<CvDto>>(
    httpClient.post(API_ROUTES.CV.CREATE, formData, {
      timeout: CV_AI_TIMEOUT_MS,
      headers: { "Content-Type": "multipart/form-data" },
    }),
    "Failed to analyze CV.",
  );
  return envelope.data;
}
