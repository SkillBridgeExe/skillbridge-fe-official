import { useQuery } from "@tanstack/react-query";
import { getDiagnosisHistoryApi } from "@/api/cv/diagnosis-history";
import { getCvDetailApi } from "@/api/cv/list";
import { getCvMatchesApi } from "@/api/cv/match";
import { QUERY_KEYS } from "@/constants/app";
import { getMyProfile } from "@/services/user-profile.service";

export function useDashboardCoreData(enabled: boolean) {
  const profileQuery = useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE,
    queryFn: getMyProfile,
    enabled,
    staleTime: 5 * 60_000,
  });
  const latestCvListQuery = useQuery({
    queryKey: [...QUERY_KEYS.DIAGNOSIS_HISTORY, "dashboard-latest"],
    queryFn: () => getDiagnosisHistoryApi({ page: 1, limit: 1 }),
    enabled,
    staleTime: 60_000,
  });
  const latestCvId = latestCvListQuery.data?.items[0]?.id ?? null;
  const latestCvQuery = useQuery({
    queryKey: ["dashboard", "latest-cv", latestCvId],
    queryFn: () => getCvDetailApi(latestCvId!),
    enabled: enabled && Boolean(latestCvId),
    staleTime: 60_000,
  });
  const latestMatchQuery = useQuery({
    queryKey: ["dashboard", "latest-cv-match", latestCvId],
    queryFn: () => getCvMatchesApi(latestCvId!, { page: 1, limit: 1 }),
    enabled: enabled && Boolean(latestCvId),
    staleTime: 60_000,
  });

  return {
    profileQuery,
    latestCvListQuery,
    latestCvQuery,
    latestMatchQuery,
    latestCvId,
  };
}
