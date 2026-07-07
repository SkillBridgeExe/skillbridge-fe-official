import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listResumesApi,
  deleteResumeApi,
  duplicateResumeApi,
} from "@/api/cv/resume-library";

const RESUME_LIST_KEY = ["resume-library", "list"] as const;

/** Fetch all BUILT CVs for the library page. */
export function useResumeListQuery() {
  return useQuery({
    queryKey: RESUME_LIST_KEY,
    queryFn: () => listResumesApi({ cvKind: "BUILT", limit: 50 }),
    staleTime: 30_000,
  });
}

/** Delete a CV and invalidate the list cache. */
export function useDeleteResumeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteResumeApi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESUME_LIST_KEY }),
  });
}

/** Duplicate a CV and invalidate the list cache. */
export function useDuplicateResumeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceCvId, title }: { sourceCvId: string; title: string }) =>
      duplicateResumeApi(sourceCvId, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESUME_LIST_KEY }),
  });
}
