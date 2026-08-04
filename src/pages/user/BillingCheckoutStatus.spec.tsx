// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BillingCheckoutStatus from "./BillingCheckoutStatus";
import { getOrderStatus, reconcileOrder, type OrderStatusResponseDto } from "@/services/billing.service";
import { loadPayOSCheckoutScript, type PayOSConfig } from "@/lib/payos-checkout-script";

vi.mock("@/services/billing.service", () => ({
  getOrderStatus: vi.fn(),
  reconcileOrder: vi.fn(),
}));

vi.mock("@/lib/payos-checkout-script", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payos-checkout-script")>();
  return { ...actual, loadPayOSCheckoutScript: vi.fn().mockResolvedValue(undefined) };
});

vi.mock("@posthog/react", () => ({ usePostHog: () => null }));
vi.mock("@/components/layout/Layout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/hooks/use-api-session", () => ({ useHasApiSession: () => true }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      String(options?.defaultValue ?? key),
  }),
}));

const order: OrderStatusResponseDto = {
  orderId: "order-1",
  orderCode: 123,
  purpose: "SUBSCRIPTION",
  status: "PENDING",
  amountVnd: 199000,
  currency: "VND",
  checkoutUrl: "https://pay.payos.vn/web/payment-link-1",
  returnUrl: "http://localhost:3000/billing/checkout/123",
  paymentLinkId: "payment-link-1",
  expiresAt: "2026-08-01T14:00:00.000Z",
  targetType: "SUBSCRIPTION",
  targetId: null,
  paidAt: null,
  createdAt: "2026-08-01T13:00:00.000Z",
  pricing: {
    originalAmountVnd: 199000,
    discountPercent: 0,
    discountAmountVnd: 0,
    finalAmountVnd: 199000,
    voucherCode: null,
    currency: "VND",
  },
};

function renderPage(currentOrder: OrderStatusResponseDto) {
  vi.mocked(getOrderStatus).mockResolvedValue(currentOrder);
  vi.mocked(reconcileOrder).mockResolvedValue(currentOrder);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <MemoryRouter initialEntries={["/billing/checkout/123"]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/billing/checkout/:orderCode" element={<BillingCheckoutStatus />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("BillingCheckoutStatus", () => {
  const usePayOS = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    window.history.replaceState({}, "", "/billing/checkout/123");
    vi.mocked(loadPayOSCheckoutScript).mockResolvedValue(undefined);
    usePayOS.mockReturnValue({ open: vi.fn(), exit: vi.fn() });
    window.PayOSCheckout = { usePayOS };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    delete window.PayOSCheckout;
  });

  it("passes the backend-signed return URL to one embedded payOS controller", async () => {
    renderPage(order);

    await waitFor(() => expect(usePayOS).toHaveBeenCalledTimes(1));
    expect(loadPayOSCheckoutScript).toHaveBeenCalledTimes(1);
    expect(usePayOS).toHaveBeenCalledWith(
      expect.objectContaining({
        RETURN_URL: "http://localhost:3000/billing/checkout/123",
        CHECKOUT_URL: "https://pay.payos.vn/web/payment-link-1",
        embedded: true,
      }),
    );
    expect(screen.getByRole("link", { name: "billing.checkout.openFallback" })).toHaveAttribute(
      "href",
      "https://pay.payos.vn/web/payment-link-1",
    );
    expect(screen.getByRole("link", { name: "billing.checkout.openFallback" })).not.toHaveAttribute(
      "target",
    );
  });

  it("puts the order summary before the payment frame for narrow-screen reading order", async () => {
    renderPage(order);
    await waitFor(() => expect(usePayOS).toHaveBeenCalledTimes(1));

    const summary = screen.getByLabelText("billing.checkout.summaryTitle");
    const payment = screen.getByLabelText("billing.checkout.paymentRegion");

    expect(summary.compareDocumentPosition(payment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the enlarged checkout inside the compact payment viewport", async () => {
    renderPage(order);
    await waitFor(() => expect(usePayOS).toHaveBeenCalledTimes(1));

    const paymentFrame = screen.getByTestId("payment-frame");
    expect(paymentFrame).toHaveClass("h-[410px]", "overflow-hidden");
    expect(paymentFrame.className).toContain("[&_iframe]:scale-[1.24]");
    expect(paymentFrame.className).toContain("sm:[&_iframe]:scale-[1.38]");
    expect(document.getElementById("payos-checkout-123")).toHaveClass("h-[410px]");
  });

  it.each([
    ["PAID", "billing.checkout.viewMyPlan"],
    ["CANCELLED", "billing.checkout.backToPricing"],
    ["FAILED", "billing.checkout.backToPricing"],
  ] as const)("shows a clear action for the %s terminal state", async (status, actionLabel) => {
    renderPage({ ...order, status, checkoutUrl: null });

    expect(await screen.findByRole("button", { name: actionLabel })).toBeVisible();
  });

  it.each([
    ["CV_ANALYSIS", "billing.checkout.analyzeCv"],
    ["INTERVIEW_SESSION", "billing.checkout.startInterview"],
  ] as const)("shows the correct paid credit CTA for %s", async (creditType, actionLabel) => {
    renderPage({
      ...order,
      purpose: "CREDIT_PACKAGE",
      targetType: "CREDIT_PACKAGE",
      status: "PAID",
      checkoutUrl: null,
      creditPackage: { creditType, units: 2 },
    });

    expect(await screen.findByRole("button", { name: actionLabel })).toBeVisible();
  });

  it("does not initialize the iframe when the signed return URL targets a different page", async () => {
    renderPage({ ...order, returnUrl: "http://localhost:3000/billing/checkout" });

    expect(await screen.findByRole("link", { name: "billing.checkout.openFallback" })).toBeVisible();
    expect(usePayOS).not.toHaveBeenCalled();
    expect(loadPayOSCheckoutScript).not.toHaveBeenCalled();
  });

  it("falls back without initializing payOS when an old order has no return URL", async () => {
    renderPage({ ...order, returnUrl: undefined });

    expect(await screen.findByRole("link", { name: "billing.checkout.openFallback" })).toBeVisible();
    expect(usePayOS).not.toHaveBeenCalled();
    expect(loadPayOSCheckoutScript).not.toHaveBeenCalled();
  });

  it("shows hosted checkout fallback when the payOS script fails", async () => {
    vi.mocked(loadPayOSCheckoutScript).mockRejectedValueOnce(new Error("script failed"));
    renderPage(order);

    expect(await screen.findByText("billing.checkout.embedErrorTitle")).toBeVisible();
    expect(screen.getByRole("link", { name: "billing.checkout.openFallback" })).toBeVisible();
    expect(usePayOS).not.toHaveBeenCalled();
  });

  it("stops the invalid embedded flow when payOS emits code 02", async () => {
    let config: PayOSConfig | undefined;
    usePayOS.mockImplementation((nextConfig: PayOSConfig) => {
      config = nextConfig;
      return { open: vi.fn(), exit: vi.fn() };
    });
    renderPage(order);
    await waitFor(() => expect(config).toBeDefined());

    act(() => config?.onSuccess?.({ code: "02" }));

    expect(await screen.findByText("billing.checkout.embedInvalidParams")).toBeVisible();
    expect(reconcileOrder).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "billing.checkout.openFallback" })).toBeVisible();
  });

  it("does not close the provider a second time when success replaces the iframe with paid state", async () => {
    let config: PayOSConfig | undefined;
    const exit = vi.fn();
    usePayOS.mockImplementation((nextConfig: PayOSConfig) => {
      config = nextConfig;
      return { open: vi.fn(), exit };
    });
    renderPage(order);
    vi.mocked(reconcileOrder).mockResolvedValue({
      ...order,
      status: "PAID",
      paidAt: "2026-08-01T13:05:00.000Z",
    });
    await waitFor(() => expect(config).toBeDefined());

    act(() => config?.onSuccess?.({ code: "00" }));

    await waitFor(() => expect(reconcileOrder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getAllByText("Paid").length).toBeGreaterThan(0));
    expect(exit).not.toHaveBeenCalled();
  });

  it("single-flights provider callbacks and the check-again action without an extra status GET", async () => {
    let config: PayOSConfig | undefined;
    let resolveReconcile: ((value: OrderStatusResponseDto) => void) | undefined;
    vi.mocked(reconcileOrder).mockImplementation(
      () =>
        new Promise<OrderStatusResponseDto>((resolve) => {
          resolveReconcile = resolve;
        }),
    );
    usePayOS.mockImplementation((nextConfig: PayOSConfig) => {
      config = nextConfig;
      return { open: vi.fn(), exit: vi.fn() };
    });
    renderPage(order);
    await waitFor(() => expect(config).toBeDefined());

    act(() => config?.onSuccess?.({ code: "00" }));
    fireEvent.click(screen.getByRole("button", { name: "billing.checkout.checkAgain" }));

    expect(reconcileOrder).toHaveBeenCalledTimes(1);
    expect(getOrderStatus).toHaveBeenCalledTimes(1);
    resolveReconcile?.(order);
    await waitFor(() => expect(screen.getByRole("button", { name: "billing.checkout.checkAgain" })).toBeEnabled());
  });
});
