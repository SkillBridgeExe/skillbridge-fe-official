import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listVersionsApi, createVersionApi, restoreVersionApi } from "@/api/cv/versions";

const versionsKey = (cvId: string) => ["cv-versions", cvId] as const;

/** Version history for a CV — only fetches when a draft id exists and `enabled` (e.g. dialog open). */
export function useCvVersionsQuery(cvId: string | null, enabled = true) {
  return useQuery({
    queryKey: versionsKey(cvId ?? ""),
    // 100 covers the full retention cap (20 auto + 50 manual) in one page — no load-more UI.
    queryFn: () => listVersionsApi(cvId as string, { limit: 100 }),
    enabled: !!cvId && enabled,
    staleTime: 10_000,
  });
}

/** Snapshot the current document as a new version, then refresh the history. */
export function useCreateVersionMutation(cvId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label?: string) => createVersionApi(cvId as string, label),
    onSuccess: () => qc.invalidateQueries({ queryKey: versionsKey(cvId ?? "") }),
  });
}

/** Restore a version (BE auto-snapshots current first). Caller re-hydrates the builder from the result. */
export function useRestoreVersionMutation(cvId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => restoreVersionApi(cvId as string, versionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: versionsKey(cvId ?? "") }),
  });
}
