import { useQuery } from "@tanstack/react-query";
import { getCvListApi } from "@/api/cv/list";

/** Personal CV data is fetched only while an API-authenticated candidate can apply. */
export function useJobApplicationCvs(userId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["jobApplicationCvs", userId ?? "anonymous"],
    queryFn: () => getCvListApi({ page: 1, limit: 50 }),
    enabled: enabled && Boolean(userId),
    staleTime: 5 * 60_000,
  });
}
