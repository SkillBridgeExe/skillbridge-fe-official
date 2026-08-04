// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Pricing from "./Pricing";
import {
  createCheckout,
  getCreditPackages,
  getBillingPlans,
  getMySubscription,
  validateVoucher,
  type BillingPlanDto,
  type CreditPackageDto,
} from "@/services/billing.service";

vi.mock("@/services/billing.service", () => ({
  createCheckout: vi.fn(),
  getBillingPlans: vi.fn(),
  getCreditPackages: vi.fn(),
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
        "billing.pricing.voucher.cancel": "Cancel",
        "billing.pricing.credit.confirmTitle": "Buy credits",
        "billing.pricing.credit.pay": "Pay for credits",
        "billing.pricing.credit.buy": "Buy",
        "billing.pricing.credit.noDiscount": "No discount",
        "billing.pricing.credit.loadFailedTitle": "Could not load credit packages",
        "billing.pricing.credit.loadFailedDesc": "Credit packages are temporarily unavailable.",
      };
      if (key === "billing.pricing.uses") return `${String(options?.count)} uses`;
      if (key === "billing.pricing.credit.units") return `${String(options?.count)} uses`;
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

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location-search">{location.search}</span>;
}

function renderPage(initialEntry = "/pricing") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <Pricing />
        <LocationProbe />
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
    vi.mocked(getCreditPackages).mockResolvedValue([]);
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

  it("hides technical API route errors behind friendly credit-package copy", async () => {
    vi.mocked(getCreditPackages).mockRejectedValue(
      new Error("Cannot GET /api/billing/credit-packages"),
    );

    renderPage();

    expect(await screen.findByText("Credit packages are temporarily unavailable.")).toBeVisible();
    expect(screen.queryByText(/Cannot GET/)).not.toBeInTheDocument();
  });
  it("uses the server package units and price and clears only the credit query when cancelled", async () => {
    const packages: CreditPackageDto[] = [
      {
        code: "CV_ANALYSIS_PACK",
        name: "CV analysis credits",
        description: "Analyze CVs",
        priceVnd: 20000,
        currency: "VND",
        creditType: "CV_ANALYSIS",
        units: 2,
      },
    ];
    vi.mocked(getCreditPackages).mockResolvedValue(packages);

    renderPage("/pricing?credit=CV_ANALYSIS&source=quota");

    await screen.findByRole("dialog", { name: "Buy credits" });
    expect(screen.getAllByText("2 uses").length).toBeGreaterThan(0);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("20.000đ");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Buy credits" })).not.toBeInTheDocument());
    expect(screen.getByTestId("location-search")).toHaveTextContent("?source=quota");
  });
});
