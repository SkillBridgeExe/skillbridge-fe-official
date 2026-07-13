import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { CvDto, CvListItemDto, Paginated } from "@shared/api";

export interface CvListQuery {
  /** Trang, bắt đầu từ 1. */
  page?: number;
  /** 1-50, BE mặc định 20. */
  limit?: number;
  /** Distinguishes uploaded scans from Studio builder drafts. */
  cvKind?: "UPLOADED" | "BUILT";
}

/** GET /api/cvs — danh sách CV của user (lịch sử chẩn đoán). */
export async function getCvListApi(
  query: CvListQuery = {},
): Promise<Paginated<CvListItemDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<Paginated<CvListItemDto>>>(
    httpClient.get(API_ROUTES.CV.LIST, { params: query }),
    "Failed to load your CV history.",
  );
  return envelope.data;
}

/** GET /api/cvs/:id — chi tiết CV kèm review đã lưu gần nhất. */
export async function getCvDetailApi(id: string): Promise<CvDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CvDto>>(
    httpClient.get(API_ROUTES.CV.DETAIL(id)),
    "Failed to load the CV.",
  );
  return envelope.data;
}
