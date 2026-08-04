// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BillingMe from "./BillingMe";
import {
  claimVoucher,
  getMyCredits,
  getMyEntitlements,
  getMySubscription,
} from "@/services/billing.service";

vi.mock("@/services/billing.service", () => ({
  claimVoucher: vi.fn(),
  getMyCredits: vi.fn(),
  getMyEntitlements: vi.fn(),
  getMySubscription: vi.fn(),
}));
vi.mock("@posthog/react", () => ({ usePostHog: () => null }));
vi.mock("@/components/layout/Layout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/hooks/use-api-session", () => ({ useHasApiSession: () => true }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      String(options?.defaultValue ?? key),
    i18n: { language: "vi" },
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <BillingMe />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("BillingMe credit voucher claim", () => {
  beforeEach(() => {
    vi.mocked(getMySubscription).mockResolvedValue(null);
    vi.mocked(getMyEntitlements).mockResolvedValue([]);
    vi.mocked(getMyCredits)
      .mockResolvedValueOnce([{ creditType: "CV_ANALYSIS", balance: 1 }])
      .mockResolvedValue([{ creditType: "CV_ANALYSIS", balance: 4 }]);
    vi.mocked(claimVoucher).mockResolvedValue({
      voucherCode: "FREECV3",
      creditType: "CV_ANALYSIS",
      creditUnits: 3,
      redeemedAt: "2026-08-04T00:00:00.000Z",
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("claims a code and refreshes the purchased credit balance", async () => {
    renderPage();
    expect(await screen.findByText("1")).toBeVisible();

    fireEvent.change(screen.getByLabelText("billing.me.voucherLabel"), {
      target: { value: " freecv3 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "billing.me.claimVoucher" }));

    await waitFor(() => expect(claimVoucher).toHaveBeenCalledWith("FREECV3"));
    expect(await screen.findByText("billing.me.voucherClaimed")).toBeVisible();
    await waitFor(() => expect(getMyCredits).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("4")).toBeVisible();
  });
});
