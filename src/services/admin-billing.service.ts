import {
  createAdminBillingPlanApi,
  getAdminBillingPlansApi,
  getAdminPaymentOrdersApi,
  getAdminSubscriptionsApi,
  replaceAdminPlanFeaturesApi,
  updateAdminBillingPlanApi,
  type AdminOrdersQuery,
  type AdminSubscriptionsQuery,
  type CreateAdminBillingPlanDto,
  type ReplaceAdminPlanFeaturesDto,
  type UpdateAdminBillingPlanDto,
} from "@/api/admin-billing";

export type {
  AdminOrdersQuery,
  AdminPaymentOrderDto,
  AdminPlanFeatureInput,
  AdminSubscriptionDto,
  AdminSubscriptionsQuery,
  CreateAdminBillingPlanDto,
  ReplaceAdminPlanFeaturesDto,
  UpdateAdminBillingPlanDto,
} from "@/api/admin-billing";
export type { BillingPlanDto } from "@/api/billing";

export function getAdminBillingPlans(includeInactive: boolean) {
  return getAdminBillingPlansApi(includeInactive);
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

export function getAdminPaymentOrders(query: AdminOrdersQuery) {
  return getAdminPaymentOrdersApi(query);
}

export function getAdminSubscriptions(query: AdminSubscriptionsQuery) {
  return getAdminSubscriptionsApi(query);
}
