import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadCvApi, type UploadCvInput } from "@/api/cv/upload";
import { getCvListApi } from "@/api/cv/list";
import {
  getCvMatchesApi,
  matchCvWithJdApi,
  matchCvWithJdFileApi,
  type MatchCvWithJdFileInput,
  type MatchCvWithJdInput,
} from "@/api/cv/match";
import { QUERY_KEYS } from "@/constants/app";
import { useHasApiSession } from "@/hooks/use-api-session";
import {
  endInterview,
  getInterviewDetail,
  getInterviewHistory,
  refreshRealtimeToken,
  startInterview,
  submitRealtimeInterviewTurn,
  type InterviewHistoryQuery,
  type RealtimeInterviewTurnRequest,
} from "@/api/interview-api";

interface EndInterviewMutationInput {
  sessionId: string;
}

interface RealtimeTurnMutationInput {
  sessionId: string;
  payload: RealtimeInterviewTurnRequest;
}

export type CreateCvMatchForInterviewInput =
  | ({ kind: "paste"; cvId: string } & MatchCvWithJdInput)
  | ({ kind: "file"; cvId: string } & MatchCvWithJdFileInput);

function shouldRetryInterviewHistory(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (!error || typeof error !== "object") return true;

  const status = (error as { response?: { status?: unknown } }).response?.status;
  return typeof status !== "number" || status >= 500;
}

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
    retry: shouldRetryInterviewHistory,
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING_ENTITLEMENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING_CREDITS });
    },
  });
}

export function useUploadCvForInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadCvInput) => uploadCvApi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTERVIEW_CVS });
    },
  });
}

export function useCreateCvMatchForInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCvMatchForInterviewInput) => {
      if (input.kind === "file") {
        const { cvId, kind: _kind, ...payload } = input;
        return matchCvWithJdFileApi(cvId, payload);
      }

      const { cvId, kind: _kind, ...payload } = input;
      return matchCvWithJdApi(cvId, payload);
    },
    onSuccess: (_match, input) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTERVIEW_CV_MATCHES(input.cvId),
      });
    },
  });
}

export function useSubmitRealtimeInterviewTurn() {
  return useMutation({
    mutationFn: ({ sessionId, payload }: RealtimeTurnMutationInput) =>
      submitRealtimeInterviewTurn(sessionId, payload),
  });
}

export function useEndInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId }: EndInterviewMutationInput) => endInterview(sessionId),
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
