// ─── TanStack Query Hooks for Interview ─────────────────────────────
// Pattern: Page → useQuery hook → API function → httpClient
// Zustand chỉ dùng cho client state (UI toggles, auth).
// Server state (data từ API) dùng TanStack Query.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/app";
import { useHasApiSession } from "@/hooks/use-api-session";
import {
  endInterview,
  getInterviewHistory,
  saveInterviewHistory,
  startInterview,
  submitAnswer,
} from "@/api/interview-api";

/**
 * Hook lấy lịch sử phỏng vấn.
 * Tự động cache 5 phút, tự refetch khi data stale.
 *
 * Usage trong page:
 * ```tsx
 * const { data, isLoading, error } = useInterviewHistory();
 * ```
 */
export function useInterviewHistory(enabled = true) {
  const hasApiSession = useHasApiSession();
  return useQuery({
    queryKey: QUERY_KEYS.INTERVIEW_HISTORY,
    queryFn: async () => {
      const result = await getInterviewHistory();
      return result.history;
    },
    enabled: enabled && hasApiSession,
  });
}

export function useStartInterview() {
  return useMutation({
    mutationFn: ({ topic, language = "en" }: { topic: string; language?: string }) =>
      startInterview(topic, language),
  });
}

export function useSubmitInterviewAnswer() {
  return useMutation({
    mutationFn: ({ sessionId, userAnswer }: { sessionId: string; userAnswer: string }) =>
      submitAnswer(sessionId, userAnswer),
  });
}

export function useEndInterview() {
  return useMutation({
    mutationFn: endInterview,
  });
}

/**
 * Hook lưu kết quả phỏng vấn.
 * Sau khi lưu xong, tự động invalidate cache để refresh danh sách.
 *
 * Usage trong page:
 * ```tsx
 * const saveHistory = useSaveInterviewHistory();
 * saveHistory.mutate({ topic, score, duration, summary });
 * ```
 */
export function useSaveInterviewHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveInterviewHistory,
    onSuccess: () => {
      // Invalidate interview history cache → tự refetch danh sách mới
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTERVIEW_HISTORY });
    },
  });
}
