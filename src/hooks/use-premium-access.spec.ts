import { describe, expect, it } from "vitest";
import { hasPremiumDiagnosisAccess } from "./use-premium-access";
import type { SubscriptionResponseDto } from "@/api/billing";

function subscription(
  planCode: string,
  status: SubscriptionResponseDto["status"] = "ACTIVE",
): SubscriptionResponseDto {
  return {
    planCode,
    status,
    currentPeriodStart: "2026-07-01T00:00:00.000Z",
    currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    features: [],
  };
}

describe("hasPremiumDiagnosisAccess", () => {
  it("unlocks only an active PREMIUM subscription", () => {
    expect(hasPremiumDiagnosisAccess(subscription("PREMIUM"))).toBe(true);
    expect(hasPremiumDiagnosisAccess(subscription(" premium "))).toBe(true);
    expect(hasPremiumDiagnosisAccess(subscription("PRO"))).toBe(false);
    expect(hasPremiumDiagnosisAccess(subscription("FREE"))).toBe(false);
  });

  it("fails closed for inactive or unavailable subscriptions", () => {
    expect(hasPremiumDiagnosisAccess(subscription("PREMIUM", "PAST_DUE"))).toBe(false);
    expect(hasPremiumDiagnosisAccess(subscription("PREMIUM", "CANCELLED"))).toBe(false);
    expect(hasPremiumDiagnosisAccess(null)).toBe(false);
    expect(hasPremiumDiagnosisAccess(undefined)).toBe(false);
  });
});
