import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/app";
import { getMySubscription } from "@/services/billing.service";
import type { SubscriptionResponseDto } from "@/api/billing";

export function hasPremiumDiagnosisAccess(
  subscription: SubscriptionResponseDto | null | undefined,
): boolean {
  return (
    subscription?.status === "ACTIVE" &&
    subscription.planCode.trim().toUpperCase() === "PREMIUM"
  );
}

/**
 * Fail closed while the subscription is loading or unavailable so premium
 * diagnosis details never flash briefly on screen for a free account.
 */
export function usePremiumAccess() {
  const query = useQuery({
    queryKey: QUERY_KEYS.BILLING_SUBSCRIPTION,
    queryFn: getMySubscription,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return {
    isPremium: hasPremiumDiagnosisAccess(query.data),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
