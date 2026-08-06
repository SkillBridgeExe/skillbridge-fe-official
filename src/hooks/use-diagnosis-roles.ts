import { useQuery } from "@tanstack/react-query";
import { getDiagnosisRoles } from "@/api/cv/diagnosis-roles";

export function useDiagnosisRolesQuery() {
  return useQuery({
    queryKey: ["diagnosis-roles"],
    queryFn: () => getDiagnosisRoles(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
