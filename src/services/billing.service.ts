import {
  createCheckoutApi,
  getBillingPlansApi,
  getMyEntitlementsApi,
  getMySubscriptionApi,
  getMyUsageApi,
  getOrderStatusApi,
  reconcileOrderApi,
  type CreateCheckoutDto,
} from "@/api/billing";
import { hasApiAuthSession } from "@/services/auth-session.service";

export type {
  BillingOrderStatus,
  BillingPlanDto,
  BillingPurpose,
  CheckoutResponseDto,
  CreateCheckoutDto,
  MeEntitlementDto,
  OrderStatusResponseDto,
  SubscriptionResponseDto,
} from "@/api/billing";

export function getBillingPlans() {
  return getBillingPlansApi();
}

export function createCheckout(payload: CreateCheckoutDto) {
  if (!hasApiAuthSession()) {
    throw new Error("Please sign in with a real account to continue checkout.");
  }
  return createCheckoutApi(payload);
}

export function getOrderStatus(orderCode: string | number) {
  if (!hasApiAuthSession()) return Promise.resolve(null);
  return getOrderStatusApi(orderCode);
}

export function reconcileOrder(orderCode: string | number) {
  if (!hasApiAuthSession()) return Promise.resolve(null);
  return reconcileOrderApi(orderCode);
}

export function getMySubscription() {
  if (!hasApiAuthSession()) return Promise.resolve(null);
  return getMySubscriptionApi();
}

export function getMyUsage() {
  if (!hasApiAuthSession()) return Promise.resolve(null);
  return getMyUsageApi();
}

/** Quota hợp nhất theo plan (BE #49) — nguồn cho "Còn x/y lượt" trên trang diagnosis. */
export function getMyEntitlements() {
  if (!hasApiAuthSession()) return Promise.resolve([]);
  return getMyEntitlementsApi();
}
