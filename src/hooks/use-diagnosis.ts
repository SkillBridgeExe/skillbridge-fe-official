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
import { useHasApiSession } from "@/hooks/use-api-session";
import { QUERY_KEYS } from "@/constants/app";
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
 * CV history (GET /api/diagnosis/history). Callers pass `enabled` only after
 * a real API session is ready, so bootstrap/checking and mock accounts skip BE.
 */
export function useCvHistoryQuery(enabled: boolean, query: CvListQuery = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DIAGNOSIS_HISTORY, query.page ?? 1, query.limit ?? 20],
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
  const canUseApi = useHasApiSession();

  return useQuery({
    queryKey: ["job-recommendations", cvId, query.role ?? "all", query.limit ?? 5],
    queryFn: () => getJobRecommendations(cvId!, query),
    enabled: Boolean(cvId) && canUseApi,
    staleTime: 5 * 60_000,
  });
}

/** Kỹ năng thị trường cần mà CV thiếu (skill-gap trends theo role). */
export function useSkillGapQuery(cvId: string | null, query: SkillGapQuery = {}) {
  const canUseApi = useHasApiSession();

  return useQuery({
    queryKey: ["skill-gap", cvId, query.role ?? "all", query.limit ?? 10],
    queryFn: () => getSkillGap(cvId!, query),
    enabled: Boolean(cvId) && canUseApi,
    staleTime: 5 * 60_000,
  });
}

/** AI insight tá»« trends endpoint cho CV hiá»‡n táº¡i. */
export function useTrendsInsightQuery(cvId: string | null, role?: string | null) {
  const canUseApi = useHasApiSession();

  return useQuery({
    queryKey: ["trends-insight", cvId, role ?? "all"],
    queryFn: () => getTrendsInsight({ cvId: cvId!, role, limit: 5 }),
    enabled: Boolean(cvId) && canUseApi,
    staleTime: 10 * 60_000,
  });
}

export function useInterviewPlanQuery(
  cvId: string | null,
  role?: string | null,
  lang?: "vi" | "en",
) {
  const canUseApi = useHasApiSession();

  return useQuery({
    queryKey: ["interview-plan", cvId, role ?? "none", lang ?? "auto"],
    queryFn: () => getInterviewPlan({ cvId: cvId!, role: role!, lang }),
    enabled: ENABLE_DIAGNOSIS_ADDONS && Boolean(cvId) && Boolean(role) && canUseApi,
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useGapReportQuery(matchId?: string | null, lang?: "vi" | "en") {
  const canUseApi = useHasApiSession();

  return useQuery({
    queryKey: ["gap-report", matchId ?? "none", lang ?? "auto"],
    queryFn: () => getGapReport({ matchId: matchId!, lang }),
    enabled: ENABLE_DIAGNOSIS_ADDONS && Boolean(matchId) && canUseApi,
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
    mutationFn: ({
      cvId,
      matchId,
      text,
      action,
    }: {
      cvId: string;
      matchId: string;
      text: string;
      action: TailorAction;
    }) => rewriteTailorBullet({ cvId, matchId, text, action }),
    retry: false,
  });
}
