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
  return createCheckoutApi(payload);
}

export function getOrderStatus(orderCode: string | number) {
  return getOrderStatusApi(orderCode);
}

export function reconcileOrder(orderCode: string | number) {
  return reconcileOrderApi(orderCode);
}

export function getMySubscription() {
  return getMySubscriptionApi();
}

export function getMyUsage() {
  return getMyUsageApi();
}

/** Quota hợp nhất theo plan (BE #49) — nguồn cho "Còn x/y lượt" trên trang diagnosis. */
export function getMyEntitlements() {
  return getMyEntitlementsApi();
}
