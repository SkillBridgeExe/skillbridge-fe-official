import { httpClient } from "@/api/core/http-client";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { API_ROUTES } from "@/constants/api-routes";
import type {
  BillingOrderStatus,
  BillingPlanCategory,
  BillingPlanDto,
  BillingPlanInterval,
  BillingPurpose,
  SubscriptionStatus,
} from "@/api/billing";

export interface AdminPlanFeatureInput {
  featureKey: string;
  limitValue: number;
  period: string;
}

export interface CreateAdminBillingPlanDto {
  code: string;
  name: string;
  description?: string | null;
  category: BillingPlanCategory;
  interval: BillingPlanInterval;
  priceVnd: number;
  currency: string;
  isActive: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown> | null;
  features: AdminPlanFeatureInput[];
}

export type UpdateAdminBillingPlanDto = Partial<Omit<CreateAdminBillingPlanDto, "code" | "features">>;

export interface ReplaceAdminPlanFeaturesDto {
  features: AdminPlanFeatureInput[];
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<TItem> {
  page: number;
  limit: number;
  total: number;
  items: TItem[];
}

export interface AdminOrdersQuery extends PaginationQuery {
  status?: BillingOrderStatus;
  purpose?: BillingPurpose;
  userId?: string;
}

export interface AdminPaymentOrderDto {
  orderId: string;
  orderCode: number;
  userId?: string | null;
  userEmail?: string | null;
  purpose: BillingPurpose;
  status: BillingOrderStatus;
  amountVnd: number;
  currency: string;
  targetType?: string | null;
  targetId?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface AdminSubscriptionsQuery extends PaginationQuery {
  status?: SubscriptionStatus;
  planCode?: string;
  userId?: string;
}

export interface AdminSubscriptionDto {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  planCode: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt?: string;
}

export async function getAdminBillingPlansApi(includeInactive: boolean): Promise<BillingPlanDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BillingPlanDto[]>>(
    httpClient.get(API_ROUTES.ADMIN_BILLING.PLANS, { params: { includeInactive } }),
    "Failed to load admin billing plans.",
  );
  return envelope.data ?? [];
}

export async function createAdminBillingPlanApi(payload: CreateAdminBillingPlanDto): Promise<BillingPlanDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BillingPlanDto>>(
    httpClient.post(API_ROUTES.ADMIN_BILLING.PLANS, payload),
    "Failed to create billing plan.",
  );
  return envelope.data;
}
export async function updateAdminBillingPlanApi(
  code: string,
  payload: UpdateAdminBillingPlanDto,
): Promise<BillingPlanDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BillingPlanDto>>(
    httpClient.patch(API_ROUTES.ADMIN_BILLING.PLAN(code), payload),
    "Failed to update billing plan.",
  );
  return envelope.data;
}

export async function replaceAdminPlanFeaturesApi(
  code: string,
  payload: ReplaceAdminPlanFeaturesDto,
): Promise<BillingPlanDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BillingPlanDto>>(
    httpClient.put(API_ROUTES.ADMIN_BILLING.PLAN_FEATURES(code), payload),
    "Failed to update plan features.",
  );
  return envelope.data;
}

export async function getAdminPaymentOrdersApi(
  query: AdminOrdersQuery,
): Promise<PaginatedResponse<AdminPaymentOrderDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<PaginatedResponse<AdminPaymentOrderDto>>>(
    httpClient.get(API_ROUTES.ADMIN_BILLING.ORDERS, { params: query }),
    "Failed to load payment orders.",
  );
  return envelope.data;
}

export async function getAdminSubscriptionsApi(
  query: AdminSubscriptionsQuery,
): Promise<PaginatedResponse<AdminSubscriptionDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<PaginatedResponse<AdminSubscriptionDto>>>(
    httpClient.get(API_ROUTES.ADMIN_BILLING.SUBSCRIPTIONS, { params: query }),
    "Failed to load subscriptions.",
  );
  return envelope.data;
}
