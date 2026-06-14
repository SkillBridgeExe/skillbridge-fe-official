import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCvListApi } from "@/api/cv/list";
import { getCvMatchesApi } from "@/api/cv/match";
import { QUERY_KEYS } from "@/constants/app";
import {
  endInterview,
  getInterviewDetail,
  getInterviewHistory,
  refreshRealtimeToken,
  startInterview,
  submitInterviewTurn,
  type InterviewHistoryQuery,
} from "@/api/interview-api";

export function useInterviewHistory(enabled: boolean, query: InterviewHistoryQuery = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.INTERVIEW_HISTORY,
    queryFn: () => getInterviewHistory(query),
    enabled,
    staleTime: 60_000,
  });
}

export function useInterviewDetail(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.INTERVIEW_DETAIL(id) : QUERY_KEYS.INTERVIEW_DETAIL("none"),
    queryFn: () => getInterviewDetail(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 60_000,
  });
}

export function useCvListForInterview(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.INTERVIEW_CVS,
    queryFn: () => getCvListApi({ page: 1, limit: 20 }),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCvMatchesForInterview(cvId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.INTERVIEW_CV_MATCHES(cvId ?? "none"),
    queryFn: () => getCvMatchesApi(cvId!, { page: 1, limit: 20 }),
    enabled: Boolean(cvId) && enabled,
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
