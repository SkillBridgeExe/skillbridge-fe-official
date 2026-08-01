import { describe, expect, it } from "vitest";
import * as billingCheckoutHelpers from "./billing-checkout";
import type { OrderStatusResponseDto } from "@/api/billing";
import {
  buildBillingCheckoutReturnUrl,
  getBillingCheckoutPath,
  getBillingCheckoutSurfaceState,
  getBillingOrderStatusMeta,
  getMentorCheckoutStage,
  getPublicCheckoutSummaryItems,
  parsePayOSReturnParams,
  shouldCaptureSubscriptionPaymentPaid,
} from "./billing-checkout";

describe("billing checkout helpers", () => {
  it("embeds payOS only when its signed return URL matches the current iframe page", () => {
    const matchesPage = requiredHelper<
      (returnUrl: string | null | undefined, currentHref: string) => boolean
    >("doesPayOSReturnUrlMatchPage");

    expect(
      matchesPage(
        "https://skillbridgebuilder.com/billing/checkout/1781624341196493",
        "https://skillbridgebuilder.com/billing/checkout/1781624341196493?status=PENDING",
      ),
    ).toBe(true);
    expect(
      matchesPage(
        "https://skillbridgebuilder.com/billing/checkout",
        "https://skillbridgebuilder.com/billing/checkout/1781624341196493",
      ),
    ).toBe(false);
    expect(
      matchesPage(
        "https://skillbridgebuilder.com/billing/checkout/1781624341196493",
        "https://skillbridge-fe-973344038436.asia-southeast1.run.app/billing/checkout/1781624341196493",
      ),
    ).toBe(false);
    expect(matchesPage(null, "https://skillbridgebuilder.com/billing/checkout/123")).toBe(false);
  });

  it("backs off local order polling and stops after two minutes", () => {
    const getInterval = requiredHelper<
      (status: string | null | undefined, elapsedMs: number, isVisible: boolean) => number | false
    >("getBillingOrderPollInterval");

    expect(getInterval("PENDING", 0, true)).toBe(5_000);
    expect(getInterval("PENDING", 29_999, true)).toBe(5_000);
    expect(getInterval("PENDING", 30_000, true)).toBe(15_000);
    expect(getInterval("PROCESSING", 119_999, true)).toBe(15_000);
    expect(getInterval("PENDING", 120_000, true)).toBe(false);
    expect(getInterval("PAID", 1_000, true)).toBe(false);
    expect(getInterval("PENDING", 1_000, false)).toBe(false);
  });

  it("coalesces simultaneous reconcile requests for the same order", async () => {
    const createSingleFlight = requiredHelper<
      <TKey, TResult>() => {
        run: (key: TKey, operation: () => Promise<TResult>) => Promise<TResult>;
      }
    >("createSingleFlight");
    const gate = createSingleFlight<string, string>();
    let resolveOperation: ((value: string) => void) | undefined;
    let calls = 0;
    const operation = () => {
      calls += 1;
      return new Promise<string>((resolve) => {
        resolveOperation = resolve;
      });
    };

    const first = gate.run("order-123", operation);
    const second = gate.run("order-123", operation);

    expect(calls).toBe(1);
    expect(second).toBe(first);
    resolveOperation?.("paid");
    await expect(Promise.all([first, second])).resolves.toEqual(["paid", "paid"]);
  });

  it("recognizes payOS invalid-parameter callback code", () => {
    const isInvalidEvent = requiredHelper<(event: { code?: string } | undefined) => boolean>(
      "isInvalidPayOSEvent",
    );

    expect(isInvalidEvent({ code: "02" })).toBe(true);
    expect(isInvalidEvent({ code: "00" })).toBe(false);
    expect(isInvalidEvent(undefined)).toBe(false);
  });

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
      pricing: {
        originalAmountVnd: 10000,
        discountPercent: 0,
        discountAmountVnd: 0,
        finalAmountVnd: 10000,
        voucherCode: null,
        currency: "VND",
      },
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
      pricing: {
        originalAmountVnd: 10000,
        discountPercent: 0,
        discountAmountVnd: 0,
        finalAmountVnd: 10000,
        voucherCode: null,
        currency: "VND",
      },
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

  it("detects paid full mentor booking checkout from order purpose and target id", () => {
    const baseOrder: OrderStatusResponseDto = {
      orderId: "ord_mentor",
      orderCode: 1781624341196493,
      purpose: "MENTOR_BOOKING",
      status: "PAID",
      amountVnd: 500000,
      currency: "VND",
      checkoutUrl: null,
      paymentLinkId: "6f4d2e78b2064883893c71441184035e",
      targetType: "MENTOR_BOOKING",
      targetId: "booking-1",
      paidAt: "2026-06-16T15:39:00.000Z",
      createdAt: "2026-06-16T15:39:00.000Z",
      expiresAt: null,
      pricing: {
        originalAmountVnd: 500000,
        discountPercent: 0,
        discountAmountVnd: 0,
        finalAmountVnd: 500000,
        voucherCode: null,
        currency: "VND",
      },
    };

    expect(getMentorCheckoutStage(baseOrder)).toEqual({
      stage: "booking_paid",
      bookingId: "booking-1",
    });
    expect(getMentorCheckoutStage({ ...baseOrder, status: "PENDING" })).toBeNull();
    expect(getMentorCheckoutStage({ ...baseOrder, targetId: null })).toBeNull();
  });
});

function requiredHelper<T>(name: string): T {
  const value = (billingCheckoutHelpers as unknown as Record<string, unknown>)[name];
  expect(value, `${name} must be exported`).toBeTypeOf("function");
  return value as T;
}
