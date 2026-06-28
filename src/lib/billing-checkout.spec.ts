import { describe, expect, it } from "vitest";
import type { OrderStatusResponseDto } from "@/api/billing";
import {
  buildBillingCheckoutReturnUrl,
  getBillingCheckoutPath,
  getBillingCheckoutSurfaceState,
  getBillingOrderStatusMeta,
  getPublicCheckoutSummaryItems,
  parsePayOSReturnParams,
  shouldCaptureSubscriptionPaymentPaid,
} from "./billing-checkout";

describe("billing checkout helpers", () => {
  it.each([
    ["PENDING", "warning", "Pending"],
    ["PROCESSING", "info", "Processing"],
    ["PAID", "success", "Paid"],
    ["CANCELLED", "danger", "Cancelled"],
    ["EXPIRED", "danger", "Expired"],
    ["FAILED", "danger", "Failed"],
  ] as const)("maps %s to %s tone and label", (status, tone, label) => {
    expect(getBillingOrderStatusMeta(status)).toMatchObject({ tone, label });
  });

  it("parses payOS return query params without trusting them as final status", () => {
    const params = new URLSearchParams(
      "code=00&id=2e4acf1083304877bf1a8c108b30cccd&cancel=true&status=CANCELLED&orderCode=803347",
    );

    expect(parsePayOSReturnParams(params)).toEqual({
      code: "00",
      id: "2e4acf1083304877bf1a8c108b30cccd",
      cancel: true,
      status: "CANCELLED",
      orderCode: "803347",
    });
  });

  it("normalizes missing and false cancel values", () => {
    const params = new URLSearchParams("cancel=false&orderCode=803347");

    expect(parsePayOSReturnParams(params)).toEqual({
      code: null,
      id: null,
      cancel: false,
      status: null,
      orderCode: "803347",
    });
  });

  it("builds the payOS return URL for the backend-configured checkout route", () => {
    expect(buildBillingCheckoutReturnUrl("https://app.skillbridge.vn")).toBe(
      "https://app.skillbridge.vn/billing/checkout",
    );
    expect(buildBillingCheckoutReturnUrl("https://app.skillbridge.vn/")).toBe(
      "https://app.skillbridge.vn/billing/checkout",
    );
  });

  it("builds the internal checkout path from a numeric order code", () => {
    expect(getBillingCheckoutPath({ orderCode: 1781624341196493 })).toBe(
      "/billing/checkout/1781624341196493",
    );
  });

  it("encodes string order codes for the internal checkout path", () => {
    expect(getBillingCheckoutPath({ orderCode: "mentor order/1" })).toBe(
      "/billing/checkout/mentor%20order%2F1",
    );
  });

  it("returns null when checkout has no order code", () => {
    expect(getBillingCheckoutPath(null)).toBeNull();
    expect(getBillingCheckoutPath({ orderCode: null })).toBeNull();
    expect(getBillingCheckoutPath({ orderCode: "" })).toBeNull();
  });

  it("does not prefer external checkout URLs when an order code exists", () => {
    const checkout = {
      orderCode: 803347,
      checkoutUrl: "https://pay.payos.vn/web/external",
    };

    expect(getBillingCheckoutPath(checkout)).toBe("/billing/checkout/803347");
  });

  it("renders the embedded payOS checkout only while the order is pending", () => {
    expect(getBillingCheckoutSurfaceState("PENDING", "https://pay.payos.vn/web/order")).toBe("checkout");
    expect(getBillingCheckoutSurfaceState("PROCESSING", "https://pay.payos.vn/web/order")).toBe("processing");
    expect(getBillingCheckoutSurfaceState("PENDING", null)).toBe("unavailable");
  });

  it("keeps the checkout summary focused on user-facing fields", () => {
    const order: OrderStatusResponseDto = {
      orderId: "ord_technical",
      orderCode: 1781624341196493,
      purpose: "SUBSCRIPTION",
      status: "PENDING",
      amountVnd: 10000,
      currency: "VND",
      checkoutUrl: "https://pay.payos.vn/web/technical",
      paymentLinkId: "6f4d2e78b2064883893c71441184035e",
      targetType: "SUBSCRIPTION",
      targetId: "target_technical",
      paidAt: null,
      createdAt: "2026-06-16T15:39:00.000Z",
      expiresAt: null,
    };
    const items = getPublicCheckoutSummaryItems(order);

    expect(items.map((item) => item.key)).toEqual([
      "amount",
      "purpose",
      "status",
      "orderCode",
    ]);
    expect(JSON.stringify(items)).not.toContain("paymentLinkId");
    expect(JSON.stringify(items)).not.toContain("targetId");
    expect(JSON.stringify(items)).not.toContain("createdAt");
    expect(JSON.stringify(items)).not.toContain("paidAt");
    expect(JSON.stringify(items)).not.toContain("expiresAt");
  });

  it("captures subscription paid analytics only for paid subscription orders", () => {
    const baseOrder: OrderStatusResponseDto = {
      orderId: "ord_paid",
      orderCode: 1781624341196493,
      purpose: "SUBSCRIPTION",
      status: "PAID",
      amountVnd: 10000,
      currency: "VND",
      checkoutUrl: null,
      paymentLinkId: "6f4d2e78b2064883893c71441184035e",
      targetType: "SUBSCRIPTION",
      targetId: "target_paid",
      paidAt: "2026-06-16T15:39:00.000Z",
      createdAt: "2026-06-16T15:39:00.000Z",
      expiresAt: null,
    };

    expect(shouldCaptureSubscriptionPaymentPaid(baseOrder)).toBe(true);
    expect(shouldCaptureSubscriptionPaymentPaid({ ...baseOrder, status: "PENDING" })).toBe(false);
    expect(
      shouldCaptureSubscriptionPaymentPaid({
        ...baseOrder,
        purpose: "MENTOR_DEPOSIT",
        targetType: "MENTOR_BOOKING",
      }),
    ).toBe(false);
    expect(shouldCaptureSubscriptionPaymentPaid(null)).toBe(false);
  });
});
