// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Pricing from "./Pricing";
import {
  createCheckout,
  getBillingPlans,
  getMySubscription,
  validateVoucher,
  type BillingPlanDto,
} from "@/services/billing.service";

vi.mock("@/services/billing.service", () => ({
  createCheckout: vi.fn(),
  getBillingPlans: vi.fn(),
  getMySubscription: vi.fn(),
  validateVoucher: vi.fn(),
}));

vi.mock("@posthog/react", () => ({
  usePostHog: () => null,
}));

vi.mock("@/components/layout/Layout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/use-api-session", () => ({
  useHasApiSession: () => true,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: true }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "billing.pricing.planNames.free": "Free",
        "billing.pricing.planNames.premium": "Premium",
        "billing.pricing.useNow": "Use Free",
        "billing.pricing.buyPlan": "Upgrade",
        "billing.pricing.voucher.title": "Upgrade Premium",
        "billing.pricing.voucher.label": "Voucher code",
        "billing.pricing.voucher.apply": "Apply",
        "billing.pricing.voucher.plan": "Plan",
        "billing.pricing.voucher.originalPrice": "Original price",
        "billing.pricing.voucher.total": "Total",
        "billing.pricing.voucher.pay": "Pay",
      };
      if (key === "billing.pricing.uses") return `${String(options?.count)} uses`;
      if (key === "billing.pricing.voucher.discount") {
        return `${String(options?.percent)}% discount`;
      }
      if (key === "billing.pricing.voucher.applied") {
        return `Voucher ${String(options?.code)} applied`;
      }
      return translations[key] ?? String(options?.defaultValue ?? key);
    },
  }),
}));

const plans: BillingPlanDto[] = [
  {
    code: "FREE",
    name: "Free",
    description: "Free plan",
    category: "SUBSCRIPTION",
    interval: "MONTHLY",
    priceVnd: 0,
    currency: "VND",
    isActive: true,
    features: [
      { featureKey: "cv_upload", limit: 5 },
      { featureKey: "cv_review", limit: 1 },
      { featureKey: "interview_session", limit: 1 },
    ],
  },
  {
    code: "PREMIUM",
    name: "Premium",
    description: "Premium plan",
    category: "SUBSCRIPTION",
    interval: "MONTHLY",
    priceVnd: 199000,
    currency: "VND",
    isActive: true,
    features: [
      { featureKey: "cv_upload", limit: -1 },
      { featureKey: "cv_review", limit: 80 },
      { featureKey: "interview_session", limit: 20 },
    ],
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Pricing />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function openCheckout() {
  renderPage();
  await screen.findByText("Premium");
  fireEvent.click(screen.getByRole("button", { name: "Upgrade" }));
  await screen.findByRole("dialog", { name: "Upgrade Premium" });
}

describe("Pricing", () => {
  beforeEach(() => {
    vi.mocked(getBillingPlans).mockResolvedValue(plans);
    vi.mocked(getMySubscription).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders exactly the public Free and Premium cards", async () => {
    renderPage();

    const cards = await screen.findAllByTestId("pricing-plan-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("data-plan-code", "FREE");
    expect(cards[1]).toHaveAttribute("data-plan-code", "PREMIUM");
  });

  it("shows the validated server breakdown and voucher success state", async () => {
    vi.mocked(validateVoucher).mockResolvedValue({
      valid: true,
      voucherCode: "SKILLBRIDGE10",
      originalAmountVnd: 199000,
      discountPercent: 10,
      discountAmountVnd: 19900,
      finalAmountVnd: 179100,
      currency: "VND",
    });
    await openCheckout();

    fireEvent.change(screen.getByLabelText("Voucher code"), {
      target: { value: "skillbridge10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByText("Voucher SKILLBRIDGE10 applied")).toBeInTheDocument();
    expect(screen.getByText("-19.900đ")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("179.100đ");
    expect(validateVoucher).toHaveBeenCalledWith({
      planCode: "PREMIUM",
      voucherCode: "SKILLBRIDGE10",
    });
  });

  it("announces voucher validation errors without changing the server price", async () => {
    vi.mocked(validateVoucher).mockRejectedValue(new Error("Voucher expired"));
    await openCheckout();

    fireEvent.change(screen.getByLabelText("Voucher code"), {
      target: { value: "EXPIRED10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Voucher expired"));
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("199.000đ");
    expect(createCheckout).not.toHaveBeenCalled();
  });
});
