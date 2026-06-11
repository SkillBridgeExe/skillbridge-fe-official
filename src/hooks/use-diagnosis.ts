import { useMutation, useQuery } from "@tanstack/react-query";
import {
  analyzeCv,
  analyzeCvWithJd,
  compareJdForCv,
  getDiagnosisHistory,
  getGapReport,
  getGithubEvidence,
  getInterviewPlan,
  getJobRecommendations,
  getSkillGap,
  getTrendsInsight,
  loadCvFromHistory,
  reanalyzeCv,
  rewriteTailorBullet,
} from "@/services/diagnosis.service";
import type { CvListQuery } from "@/api/cv/list";
import type { JobRecommendationsQuery } from "@/api/cv/recommendations";
import type { SkillGapQuery } from "@/api/cv/trends";
import { ENABLE_DIAGNOSIS_ADDONS, ENABLE_GITHUB_EVIDENCE } from "@/lib/runtime-config";
import type { TailorAction } from "@shared/api";

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

/**
 * Top-5 job thật khớp CV (moat L2). Chạy khi có cvId + đã login.
 * pool_size=0 → UI hiện empty-state (pool chưa có job cho role).
 */
export function useJobRecommendationsQuery(
  cvId: string | null,
  query: JobRecommendationsQuery = {},
) {
  return useQuery({
    queryKey: ["job-recommendations", cvId, query.role ?? "all", query.limit ?? 5],
    queryFn: () => getJobRecommendations(cvId!, query),
    enabled: Boolean(cvId) && Boolean(localStorage.getItem("accessToken")),
    staleTime: 5 * 60_000,
  });
}

/** Kỹ năng thị trường cần mà CV thiếu (skill-gap trends theo role). */
export function useSkillGapQuery(cvId: string | null, query: SkillGapQuery = {}) {
  return useQuery({
    queryKey: ["skill-gap", cvId, query.role ?? "all", query.limit ?? 10],
    queryFn: () => getSkillGap(cvId!, query),
    enabled: Boolean(cvId) && Boolean(localStorage.getItem("accessToken")),
    staleTime: 5 * 60_000,
  });
}

/** AI insight tá»« trends endpoint cho CV hiá»‡n táº¡i. */
export function useTrendsInsightQuery(cvId: string | null, role?: string | null) {
  return useQuery({
    queryKey: ["trends-insight", cvId, role ?? "all"],
    queryFn: () => getTrendsInsight({ cvId: cvId!, role, limit: 5 }),
    enabled: Boolean(cvId) && Boolean(localStorage.getItem("accessToken")),
    staleTime: 10 * 60_000,
  });
}

export function useInterviewPlanQuery(
  cvId: string | null,
  role?: string | null,
  lang?: "vi" | "en",
) {
  return useQuery({
    queryKey: ["interview-plan", cvId, role ?? "none", lang ?? "auto"],
    queryFn: () => getInterviewPlan({ cvId: cvId!, role: role!, lang }),
    enabled: ENABLE_DIAGNOSIS_ADDONS && Boolean(cvId) && Boolean(role) && Boolean(localStorage.getItem("accessToken")),
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useGapReportQuery(matchId?: string | null, lang?: "vi" | "en") {
  return useQuery({
    queryKey: ["gap-report", matchId ?? "none", lang ?? "auto"],
    queryFn: () => getGapReport({ matchId: matchId!, lang }),
    enabled: ENABLE_DIAGNOSIS_ADDONS && Boolean(matchId) && Boolean(localStorage.getItem("accessToken")),
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useGithubEvidenceMutation() {
  return useMutation({
    mutationFn: (params: Parameters<typeof getGithubEvidence>[0]) => {
      if (!ENABLE_GITHUB_EVIDENCE) {
        throw new Error("GitHub evidence API is disabled.");
      }
      return getGithubEvidence(params);
    },
    retry: false,
  });
}

export function useTailorRewriteMutation() {
  return useMutation({
    mutationFn: ({ cvId, text, action }: { cvId: string; text: string; action: TailorAction }) =>
      rewriteTailorBullet({ cvId, text, action }),
    retry: false,
  });
}
