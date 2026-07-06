import { httpClient } from "@/api/core/http-client";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { API_ROUTES } from "@/constants/api-routes";
import type { MeEntitlementDto } from "@shared/api";

export type { MeEntitlementDto } from "@shared/api";

export type BillingPurpose =
  | "SUBSCRIPTION"
  | "MENTOR_BOOKING"
  | "MENTOR_DEPOSIT"
  | "MENTOR_REMAINING";
export type BillingOrderStatus = "PENDING" | "PROCESSING" | "PAID" | "CANCELLED" | "EXPIRED" | "FAILED";
export type BillingPlanCategory = "SUBSCRIPTION" | "MENTOR_PACKAGE";
export type BillingPlanInterval = "MONTHLY" | "ONE_TIME";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export interface BillingPlanFeatureDto {
  featureKey: string;
  limit: number;
  limitValue?: number;
  period?: string;
}

export interface BillingPlanDto {
  code: string;
  name: string;
  description?: string | null;
  category: BillingPlanCategory;
  interval: BillingPlanInterval;
  priceVnd: number;
  currency: string;
  isActive?: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown> | null;
  features: BillingPlanFeatureDto[];
}

/**
 * POST /api/billing/checkout — subscription-only.
 * Mentor booking payments MUST go through the mentor booking API
 * (POST /api/mentor-bookings, POST /api/mentor-bookings/:id/pay).
 */
export interface CreateCheckoutDto {
  purpose: "SUBSCRIPTION";
  planCode?: string;
}

export interface CheckoutResponseDto {
  orderId: string;
  orderCode: number;
  status: BillingOrderStatus;
  checkoutUrl: string | null;
  qrCode: string | null;
  paymentLinkId: string | null;
  expiresAt: string | null;
}

export interface OrderStatusResponseDto {
  orderId: string;
  orderCode: number;
  purpose: BillingPurpose;
  status: BillingOrderStatus;
  amountVnd: number;
  currency: string;
  checkoutUrl: string | null;
  paymentLinkId: string | null;
  expiresAt?: string | null;
  targetType: "SUBSCRIPTION" | "MENTOR_BOOKING";
  targetId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface EntitlementFeatureDto {
  featureKey: string;
  limit: number;
  used: number;
  remaining: number | null;
  unlimited: boolean;
  allowed: boolean;
}

export interface SubscriptionResponseDto {
  planCode: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  features: EntitlementFeatureDto[];
}

export async function getBillingPlansApi(): Promise<BillingPlanDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BillingPlanDto[]>>(
    httpClient.get(API_ROUTES.BILLING.PLANS),
    "Failed to load billing plans.",
  );
  return envelope.data ?? [];
}

export async function createCheckoutApi(payload: CreateCheckoutDto): Promise<CheckoutResponseDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CheckoutResponseDto>>(
    httpClient.post(API_ROUTES.BILLING.CHECKOUT, payload),
    "Failed to create checkout.",
  );
  return envelope.data;
}

export async function getOrderStatusApi(orderCode: string | number): Promise<OrderStatusResponseDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<OrderStatusResponseDto>>(
    httpClient.get(API_ROUTES.BILLING.ORDER(orderCode)),
    "Failed to load order status.",
  );
  return envelope.data;
}

export async function reconcileOrderApi(orderCode: string | number): Promise<OrderStatusResponseDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<OrderStatusResponseDto>>(
    httpClient.post(API_ROUTES.BILLING.RECONCILE_ORDER(orderCode)),
    "Failed to reconcile order status.",
  );
  return envelope.data;
}

export async function getMySubscriptionApi(): Promise<SubscriptionResponseDto | null> {
  const envelope = await unwrapEnvelope<ApiEnvelope<SubscriptionResponseDto | null>>(
    httpClient.get(API_ROUTES.BILLING.MY_SUBSCRIPTION),
    "Failed to load subscription.",
  );
  return envelope.data;
}

export async function getMyUsageApi(): Promise<SubscriptionResponseDto | null> {
  const envelope = await unwrapEnvelope<ApiEnvelope<SubscriptionResponseDto | null>>(
    httpClient.get(API_ROUTES.BILLING.MY_USAGE),
    "Failed to load usage.",
  );
  return envelope.data;
}

/**
 * GET /api/me/entitlements (BE #49) — quota hợp nhất theo plan: mỗi feature
 * {used, limit, period DAILY|MONTHLY, remaining, allowed, resets_at}. FE dùng
 * cho "Còn x/y lượt" + disable nút khi allowed=false.
 */
export async function getMyEntitlementsApi(): Promise<MeEntitlementDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MeEntitlementDto[]>>(
    httpClient.get(API_ROUTES.ME.ENTITLEMENTS),
    "Failed to load entitlements.",
  );
  return envelope.data;
}
