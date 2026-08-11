import {
  createAdminBillingPlanApi,
  createAdminVoucherApi,
  getAdminBillingFeatureUsageApi,
  getAdminBillingFeaturesApi,
  getAdminBillingPlansApi,
  getAdminPaymentOrdersApi,
  getAdminSubscriptionsApi,
  getAdminVouchersApi,
  replaceAdminPlanFeaturesApi,
  updateAdminPlanFeatureApi,
  updateAdminBillingPlanApi,
  updateAdminVoucherApi,
  type AdminOrdersQuery,
  type AdminSubscriptionsQuery,
  type CreateAdminBillingPlanDto,
  type CreateAdminVoucherDto,
  type ReplaceAdminPlanFeaturesDto,
  type UpdateAdminPlanFeatureDto,
  type UpdateAdminBillingPlanDto,
  type UpdateAdminVoucherDto,
  type AdminVouchersQuery,
} from "@/api/admin-billing";

export type {
  AdminBillingFeatureCatalogDto,
  AdminBillingFeatureUsageResponse,
  AdminBillingFeatureUsageItem,
  AdminOrdersQuery,
  AdminPaymentOrderDto,
  AdminPlanFeatureInput,
  AdminSubscriptionDto,
  AdminSubscriptionsQuery,
  AdminVoucherDto,
  AdminVouchersQuery,
  AdminVoucherStatus,
  VoucherBenefitType,
  CreateAdminBillingPlanDto,
  CreateAdminVoucherDto,
  ReplaceAdminPlanFeaturesDto,
  UpdateAdminPlanFeatureDto,
  UpdateAdminBillingPlanDto,
  UpdateAdminVoucherDto,
} from "@/api/admin-billing";
export type { BillingPlanDto } from "@/api/billing";

export function getAdminBillingPlans(includeInactive: boolean) {
  return getAdminBillingPlansApi(includeInactive);
}

export function getAdminBillingFeatures() {
  return getAdminBillingFeaturesApi();
}

export function getAdminBillingFeatureUsage(period: "THIS_MONTH" | "ALL_TIME") {
  return getAdminBillingFeatureUsageApi(period);
}

export function createAdminBillingPlan(payload: CreateAdminBillingPlanDto) {
  return createAdminBillingPlanApi(payload);
}

export function updateAdminBillingPlan(code: string, payload: UpdateAdminBillingPlanDto) {
  return updateAdminBillingPlanApi(code, payload);
}

export function replaceAdminPlanFeatures(code: string, payload: ReplaceAdminPlanFeaturesDto) {
  return replaceAdminPlanFeaturesApi(code, payload);
}

export function updateAdminPlanFeature(
  code: string,
  featureKey: string,
  payload: UpdateAdminPlanFeatureDto,
) {
  return updateAdminPlanFeatureApi(code, featureKey, payload);
}

export function getAdminPaymentOrders(query: AdminOrdersQuery) {
  return getAdminPaymentOrdersApi(query);
}

export function getAdminSubscriptions(query: AdminSubscriptionsQuery) {
  return getAdminSubscriptionsApi(query);
}

export function getAdminVouchers(query: AdminVouchersQuery) {
  return getAdminVouchersApi(query);
}

export function createAdminVoucher(payload: CreateAdminVoucherDto) {
  return createAdminVoucherApi(payload);
}

export function updateAdminVoucher(id: string, payload: UpdateAdminVoucherDto) {
  return updateAdminVoucherApi(id, payload);
}
