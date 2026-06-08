import { useMutation, useQuery } from "@tanstack/react-query";
import {
  analyzeCv,
  analyzeCvWithJd,
  compareJdForCv,
  getDiagnosisHistory,
  loadCvFromHistory,
  reanalyzeCv,
} from "@/services/diagnosis.service";
import type { CvListQuery } from "@/api/cv/list";

/** Chấm CV (không JD) — POST /api/cvs thật, trả { cvId, review }. */
export function useAnalyzeCvMutation() {
  return useMutation({
    mutationFn: analyzeCv,
  });
}

/** Chấm CV + so JD — upload/chấm rồi match cvId × jdText (2 call tuần tự). */
export function useAnalyzeCvWithJdMutation() {
  return useMutation({
    mutationFn: analyzeCvWithJd,
  });
}

/** So CV ĐÃ chấm (lastCvId) với JD — chỉ 1 call match, không upload lại. */
export function useCompareJdMutation() {
  return useMutation({
    mutationFn: compareJdForCv,
  });
}

/** "Phân tích lại" CV đã có trên BE theo cvId — tốn 1 lượt quota chấm, không upload lại. */
export function useReanalyzeCvMutation() {
  return useMutation({
    mutationFn: reanalyzeCv,
  });
}

/**
 * Lịch sử CV đã chấm (GET /api/diagnosis/history). Chỉ chạy khi đã đăng nhập
 * (truyền enabled từ component để tránh gọi BE khi chưa có accessToken).
 */
export function useCvHistoryQuery(enabled: boolean, query: CvListQuery = {}) {
  return useQuery({
    queryKey: ["cv-history", query.page ?? 1, query.limit ?? 20],
    queryFn: () => getDiagnosisHistory(query),
    enabled,
    staleTime: 60_000,
  });
}

/** Mở lại 1 CV cũ từ lịch sử theo id — trả { cvId, review } để render màn kết quả. */
export function useLoadCvFromHistoryMutation() {
  return useMutation({
    mutationFn: loadCvFromHistory,
  });
}
