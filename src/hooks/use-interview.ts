import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCvListApi } from "@/api/cv/list";
import { getCvMatchesApi } from "@/api/cv/match";
import { QUERY_KEYS } from "@/constants/app";
import { useHasApiSession } from "@/hooks/use-api-session";
import {
  endInterview,
  getInterviewDetail,
  getInterviewHistory,
  refreshRealtimeToken,
  startInterview,
  submitInterviewTurn,
  type InterviewHistoryQuery,
} from "@/api/interview-api";

export function useInterviewHistory(enabled = true, query: InterviewHistoryQuery = {}) {
  const hasApiSession = useHasApiSession();

  const historyQueryKey =
    query.page != null || query.limit != null
      ? ([...QUERY_KEYS.INTERVIEW_HISTORY, query] as const)
      : QUERY_KEYS.INTERVIEW_HISTORY;

  return useQuery({
    queryKey: historyQueryKey,
    queryFn: () => getInterviewHistory(query),
    enabled: enabled && hasApiSession,
    staleTime: 60_000,
  });
}

export function useInterviewDetail(id: string | null, enabled: boolean) {
  const hasApiSession = useHasApiSession();

  return useQuery({
    queryKey: id ? QUERY_KEYS.INTERVIEW_DETAIL(id) : QUERY_KEYS.INTERVIEW_DETAIL("none"),
    queryFn: () => getInterviewDetail(id!),
    enabled: Boolean(id) && enabled && hasApiSession,
    staleTime: 60_000,
  });
}

export function useCvListForInterview(enabled: boolean) {
  const hasApiSession = useHasApiSession();

  return useQuery({
    queryKey: QUERY_KEYS.INTERVIEW_CVS,
    queryFn: () => getCvListApi({ page: 1, limit: 20 }),
    enabled: enabled && hasApiSession,
    staleTime: 5 * 60_000,
  });
}

export function useCvMatchesForInterview(cvId: string | null, enabled: boolean) {
  const hasApiSession = useHasApiSession();

  return useQuery({
    queryKey: QUERY_KEYS.INTERVIEW_CV_MATCHES(cvId ?? "none"),
    queryFn: () => getCvMatchesApi(cvId!, { page: 1, limit: 20 }),
    enabled: Boolean(cvId) && enabled && hasApiSession,
    staleTime: 5 * 60_000,
  });
}

export function useStartInterview() {
  return useMutation({
    mutationFn: startInterview,
  });
}

export function useSubmitInterviewTurn() {
  return useMutation({
    mutationFn: submitInterviewTurn,
  });
}

export function useEndInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: endInterview,
    onSuccess: (session) => {
      queryClient.setQueryData(QUERY_KEYS.INTERVIEW_DETAIL(session.id), session);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTERVIEW_HISTORY });
    },
  });
}

export function useRefreshRealtimeToken() {
  return useMutation({
    mutationFn: refreshRealtimeToken,
  });
}