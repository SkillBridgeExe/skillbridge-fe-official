import {
  createCheckoutApi,
  getBillingPlansApi,
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
