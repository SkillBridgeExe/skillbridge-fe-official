import {
  createAdminBillingPlanApi,
  getAdminBillingFeaturesApi,
  getAdminBillingPlansApi,
  getAdminPaymentOrdersApi,
  getAdminSubscriptionsApi,
  replaceAdminPlanFeaturesApi,
  updateAdminPlanFeatureApi,
  updateAdminBillingPlanApi,
  type AdminOrdersQuery,
  type AdminSubscriptionsQuery,
  type CreateAdminBillingPlanDto,
  type ReplaceAdminPlanFeaturesDto,
  type UpdateAdminPlanFeatureDto,
  type UpdateAdminBillingPlanDto,
} from "@/api/admin-billing";

export type {
  AdminBillingFeatureCatalogDto,
  AdminOrdersQuery,
  AdminPaymentOrderDto,
  AdminPlanFeatureInput,
  AdminSubscriptionDto,
  AdminSubscriptionsQuery,
  CreateAdminBillingPlanDto,
  ReplaceAdminPlanFeaturesDto,
  UpdateAdminPlanFeatureDto,
  UpdateAdminBillingPlanDto,
} from "@/api/admin-billing";
export type { BillingPlanDto } from "@/api/billing";

export function getAdminBillingPlans(includeInactive: boolean) {
  return getAdminBillingPlansApi(includeInactive);
}

export function getAdminBillingFeatures() {
  return getAdminBillingFeaturesApi();
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
