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
  CreditType,
} from "@/api/billing";
import type {
  AdminRevenueWindow,
  AdminUserSummaryQuery,
} from "@/api/admin-users";

export interface AdminPlanFeatureInput {
  featureKey: string;
  limitValue: number;
  period: string;
}

export interface AdminBillingFeatureCatalogDto {
  featureKey: string;
  label: string;
  description?: string | null;
  allowedPeriods: string[];
  recommendedLimits?: Record<string, number> | null;
}

export interface AdminBillingFeatureUsageItem {
  featureKey: string;
  uniqueUserCount: number;
}

export interface AdminBillingFeatureUsageResponse {
  period: "THIS_MONTH" | "ALL_TIME";
  items: AdminBillingFeatureUsageItem[];
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

export type UpdateAdminBillingPlanDto = Partial<Omit<CreateAdminBillingPlanDto, "code" | "features">> & {
  creditUnits?: number;
};

export interface ReplaceAdminPlanFeaturesDto {
  features: AdminPlanFeatureInput[];
}

export type UpdateAdminPlanFeatureDto = Omit<AdminPlanFeatureInput, "featureKey">;

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

export interface AdminPaymentReconciliationResult {
  orderCode: number;
  status: BillingOrderStatus | "FAILED_RECONCILIATION";
  message?: string;
}

export interface AdminPaymentReconciliationResponse {
  provider: string;
  window: AdminRevenueWindow;
  attempted: number;
  settled: number;
  terminal: number;
  pending: number;
  failed: number;
  results: AdminPaymentReconciliationResult[];
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

export type AdminVoucherStatus = "ACTIVE" | "UPCOMING" | "EXPIRED" | "INACTIVE";
export type VoucherBenefitType = "PERCENT_DISCOUNT" | "CREDIT_GRANT";

export interface AdminVouchersQuery extends PaginationQuery {
  search?: string;
  status?: AdminVoucherStatus;
}

export interface AdminVoucherDto {
  id: string;
  code: string;
  benefitType: VoucherBenefitType;
  discountPercent: number | null;
  applicablePlanCode: "PREMIUM" | null;
  creditType: CreditType | null;
  creditUnits: number | null;
  startsAt: string;
  endsAt: string;
  maxRedemptions: number;
  perUserLimit: number;
  isActive: boolean;
  internalNote: string | null;
  status: AdminVoucherStatus;
  redeemedCount: number;
  reservedCount: number;
  remainingCount: number;
  immutable: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface AdminVoucherMutationBase {
  code: string;
  startsAt: string;
  endsAt: string;
  maxRedemptions: number;
  perUserLimit?: number;
  isActive?: boolean;
  internalNote?: string | null;
}

export type CreateAdminVoucherDto =
  | (AdminVoucherMutationBase & {
      benefitType: "PERCENT_DISCOUNT";
      discountPercent: number;
    })
  | (AdminVoucherMutationBase & {
      benefitType: "CREDIT_GRANT";
      creditType: CreditType;
      creditUnits: number;
    });

export interface UpdateAdminVoucherDto extends Partial<AdminVoucherMutationBase> {
  benefitType?: VoucherBenefitType;
  discountPercent?: number;
  creditType?: CreditType;
  creditUnits?: number;
}

export async function getAdminBillingPlansApi(includeInactive: boolean): Promise<BillingPlanDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BillingPlanDto[]>>(
    httpClient.get(API_ROUTES.ADMIN_BILLING.PLANS, { params: { includeInactive } }),
    "Failed to load admin billing plans.",
  );
  return envelope.data ?? [];
}

export async function getAdminBillingFeaturesApi(): Promise<AdminBillingFeatureCatalogDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminBillingFeatureCatalogDto[]>>(
    httpClient.get(API_ROUTES.ADMIN_BILLING.FEATURES),
    "Failed to load billing feature catalog.",
  );
  return envelope.data ?? [];
}

export async function getAdminBillingFeatureUsageApi(
  period: "THIS_MONTH" | "ALL_TIME",
): Promise<AdminBillingFeatureUsageResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminBillingFeatureUsageResponse>>(
    httpClient.get(API_ROUTES.ADMIN_BILLING.FEATURE_USAGE, { params: { period } }),
    "Failed to load feature usage.",
  );
  return envelope.data;
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

export async function updateAdminPlanFeatureApi(
  code: string,
  featureKey: string,
  payload: UpdateAdminPlanFeatureDto,
): Promise<BillingPlanDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BillingPlanDto>>(
    httpClient.patch(API_ROUTES.ADMIN_BILLING.PLAN_FEATURE(code, featureKey), payload),
    "Failed to update plan feature.",
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

export async function reconcileAdminPaymentOrdersApi(
  query: AdminUserSummaryQuery = {},
): Promise<AdminPaymentReconciliationResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminPaymentReconciliationResponse>>(
    httpClient.post(API_ROUTES.ADMIN_BILLING.RECONCILE_ORDERS, query),
    "Failed to sync PayOS payments.",
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

export async function getAdminVouchersApi(
  query: AdminVouchersQuery,
): Promise<PaginatedResponse<AdminVoucherDto>> {
  const envelope = await unwrapEnvelope<ApiEnvelope<PaginatedResponse<AdminVoucherDto>>>(
    httpClient.get(API_ROUTES.ADMIN_BILLING.VOUCHERS, { params: query }),
    "Failed to load vouchers.",
  );
  return envelope.data;
}

export async function createAdminVoucherApi(
  payload: CreateAdminVoucherDto,
): Promise<AdminVoucherDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminVoucherDto>>(
    httpClient.post(API_ROUTES.ADMIN_BILLING.VOUCHERS, payload),
    "Failed to create voucher.",
  );
  return envelope.data;
}

export async function updateAdminVoucherApi(
  id: string,
  payload: UpdateAdminVoucherDto,
): Promise<AdminVoucherDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminVoucherDto>>(
    httpClient.patch(API_ROUTES.ADMIN_BILLING.VOUCHER(id), payload),
    "Failed to update voucher.",
  );
  return envelope.data;
}
