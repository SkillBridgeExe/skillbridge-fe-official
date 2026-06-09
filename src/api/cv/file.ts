import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";

/**
 * Tải file CV gốc đã upload (GET /api/cvs/:id/file) — trả Blob để UI tải xuống.
 * Endpoint cần JWT; bypass envelope vì trả bytes thô (giống render-pdf).
 */
export async function downloadCvFileApi(cvId: string): Promise<Blob> {
  const res = await httpClient.get(API_ROUTES.CV.FILE(cvId), { responseType: "blob" });
  return res.data as Blob;
}
