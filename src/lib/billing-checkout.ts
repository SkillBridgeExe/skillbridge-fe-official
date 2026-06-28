import type { BillingOrderStatus } from "@/api/billing";
import type { OrderStatusResponseDto } from "@/api/billing";

export type BillingOrderStatusTone = "success" | "warning" | "info" | "danger" | "muted";

export interface BillingOrderStatusMeta {
  label: string;
  tone: BillingOrderStatusTone;
  terminal: boolean;
}

export interface PayOSReturnParams {
  code: string | null;
  id: string | null;
  cancel: boolean;
  status: string | null;
  orderCode: string | null;
}

export type PublicCheckoutSummaryKey = "amount" | "purpose" | "status" | "orderCode";
export type BillingCheckoutSurfaceState = "checkout" | "processing" | "terminal" | "unavailable";

export interface PublicCheckoutSummaryItem {
  key: PublicCheckoutSummaryKey;
  value: string;
}

export interface BillingCheckoutNavigationTarget {
  orderCode?: string | number | null;
}

const BILLING_ORDER_STATUS_META: Record<BillingOrderStatus, BillingOrderStatusMeta> = {
  PENDING: {
    label: "Pending",
    tone: "warning",
    terminal: false,
  },
  PROCESSING: {
    label: "Processing",
    tone: "info",
    terminal: false,
  },
  PAID: {
    label: "Paid",
    tone: "success",
    terminal: true,
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "danger",
    terminal: true,
  },
  EXPIRED: {
    label: "Expired",
    tone: "danger",
    terminal: true,
  },
  FAILED: {
    label: "Failed",
    tone: "danger",
    terminal: true,
  },
};

export const BILLING_ORDER_STATUSES = Object.keys(BILLING_ORDER_STATUS_META) as BillingOrderStatus[];

export function getBillingOrderStatusMeta(status: BillingOrderStatus | string | null | undefined): BillingOrderStatusMeta {
  const normalized = String(status ?? "").toUpperCase() as BillingOrderStatus;
  return (
    BILLING_ORDER_STATUS_META[normalized] ?? {
      label: status ? String(status).replace(/_/g, " ") : "Unknown",
      tone: "muted",
      terminal: false,
    }
  );
}

export function isTerminalBillingOrderStatus(status: BillingOrderStatus | string | null | undefined) {
  return getBillingOrderStatusMeta(status).terminal;
}

export function shouldCaptureSubscriptionPaymentPaid(
  order: OrderStatusResponseDto | null | undefined,
): order is OrderStatusResponseDto & { status: "PAID"; purpose: "SUBSCRIPTION" } {
  return order?.status === "PAID" && order.purpose === "SUBSCRIPTION";
}

export function getBillingCheckoutSurfaceState(
  status: BillingOrderStatus | string | null | undefined,
  checkoutUrl: string | null | undefined,
): BillingCheckoutSurfaceState {
  const normalized = String(status ?? "").toUpperCase();

  if (isTerminalBillingOrderStatus(normalized)) return "terminal";
  if (normalized === "PENDING" && Boolean(checkoutUrl)) return "checkout";
  if (normalized === "PROCESSING") return "processing";

  return "unavailable";
}

export function parsePayOSReturnParams(params: URLSearchParams): PayOSReturnParams {
  return {
    code: params.get("code"),
    id: params.get("id"),
    cancel: params.get("cancel") === "true",
    status: params.get("status"),
    orderCode: params.get("orderCode"),
  };
}

export function buildBillingCheckoutReturnUrl(origin: string) {
  return `${origin.replace(/\/+$/, "")}/billing/checkout`;
}

export function getBillingCheckoutPath(checkout: BillingCheckoutNavigationTarget | null | undefined) {
  const orderCode = checkout?.orderCode;
  if (orderCode === null || orderCode === undefined) return null;

  const normalizedOrderCode = String(orderCode).trim();
  if (!normalizedOrderCode) return null;

  return `/billing/checkout/${encodeURIComponent(normalizedOrderCode)}`;
}

export function getPublicCheckoutSummaryItems(
  order: Pick<OrderStatusResponseDto, "amountVnd" | "orderCode" | "purpose" | "status">,
): PublicCheckoutSummaryItem[] {
  return [
    { key: "amount", value: String(order.amountVnd) },
    { key: "purpose", value: order.purpose },
    { key: "status", value: order.status },
    { key: "orderCode", value: String(order.orderCode) },
  ];
}
