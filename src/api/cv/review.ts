import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { CvDto } from "@shared/api";
import { CV_AI_TIMEOUT_MS } from "./upload";

/**
 * POST /api/diagnosis/cv-review — chấm LẠI một CV đã có trên BE
 * (dùng cho CV từ builder hoặc "Chấm lại" CV cũ; không cần upload lại file).
 * Gửi kèm targetRole để chấm theo role mới — đổi role thì BE chấm lại (review
 * phụ thuộc rubric của role); bỏ trống = giữ role đã lưu của CV.
 */
export async function reRunCvReviewApi(cvId: string, targetRole?: string): Promise<CvDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvDto>>(
    httpClient.post(
      API_ROUTES.DIAGNOSIS.CV_REVIEW,
      targetRole ? { cvId, targetRole } : { cvId },
      { timeout: CV_AI_TIMEOUT_MS },
    ),
    "Failed to re-run the CV review.",
  );
  return envelope.data;
}
