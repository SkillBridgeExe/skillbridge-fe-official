// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminOverview from "./AdminOverview";
import { getAdminUserSummary } from "@/services/admin-users.service";
import { reconcileAdminPaymentOrders } from "@/services/admin-billing.service";

vi.mock("@/services/admin-users.service", () => ({
  getAdminUserSummary: vi.fn(),
}));

vi.mock("@/services/admin-billing.service", () => ({
  reconcileAdminPaymentOrders: vi.fn(),
}));

const summary = {
  rangeDays: 30,
  totals: {
    totalUsers: 10,
    activeUsers: 8,
    unverifiedUsers: 1,
    suspendedUsers: 1,
    newUsers: 3,
    paidRevenueVnd: 4417800,
    paidOrderCount: 25,
    cvCount: 6,
    matchCount: 4,
    interviewCount: 3,
  },
  window: {
    period: "THIS_YEAR" as const,
    from: "2026-01-01",
    to: "2026-12-31",
    timezone: "Asia/Ho_Chi_Minh" as const,
  },
  roleDistribution: [],
  statusDistribution: [],
  registrationTrend: [],
  activityFunnel: [],
  revenueTrend: [],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminOverview />
    </QueryClientProvider>,
  );
}

describe("AdminOverview PayOS revenue controls", () => {
  beforeEach(() => {
    vi.mocked(getAdminUserSummary).mockResolvedValue(summary);
    vi.mocked(reconcileAdminPaymentOrders).mockResolvedValue({
      provider: "PAYOS",
      window: summary.window,
      attempted: 1,
      settled: 1,
      terminal: 0,
      pending: 0,
      failed: 0,
      paidChecked: 0,
      verifiedPaid: 0,
      unverifiedPaid: 0,
      verificationFailed: 0,
      results: [{ orderCode: 123, status: "PAID" }],
      paidVerificationResults: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("requests THIS_YEAR by default and renders the completed-order badge", async () => {
    renderPage();

    expect(await screen.findByText("Paid revenue")).toBeInTheDocument();
    expect(getAdminUserSummary).toHaveBeenCalledWith({ period: "THIS_YEAR" });
    expect(screen.getByText("25 completed orders")).toBeInTheDocument();
  });

  it("changes the summary request when the calendar period changes", async () => {
    renderPage();
    await screen.findByText("Paid revenue");

    fireEvent.click(screen.getByRole("combobox", { name: "Revenue period" }));
    fireEvent.click(screen.getByRole("option", { name: "This month" }));

    await waitFor(() =>
      expect(getAdminUserSummary).toHaveBeenCalledWith({ period: "THIS_MONTH" }),
    );
  });

  it("waits for both dates before loading a custom calendar window", async () => {
    renderPage();
    await screen.findByText("Paid revenue");

    fireEvent.click(screen.getByRole("combobox", { name: "Revenue period" }));
    fireEvent.click(screen.getByRole("option", { name: "Custom" }));
    vi.mocked(getAdminUserSummary).mockClear();

    fireEvent.change(screen.getByLabelText("Custom period start"), {
      target: { value: "2026-08-01" },
    });
    expect(getAdminUserSummary).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Custom period end"), {
      target: { value: "2026-08-11" },
    });

    await waitFor(() =>
      expect(getAdminUserSummary).toHaveBeenCalledWith({
        period: "CUSTOM",
        from: "2026-08-01",
        to: "2026-08-11",
      }),
    );
  });

  it("reconciles PayOS orders and refetches the selected summary", async () => {
    renderPage();
    await screen.findByText("Paid revenue");

    fireEvent.click(screen.getByRole("button", { name: "Sync PayOS" }));

    await waitFor(() =>
      expect(reconcileAdminPaymentOrders).toHaveBeenCalledWith({ period: "THIS_YEAR" }),
    );
    await waitFor(() => expect(getAdminUserSummary).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("PayOS sync complete: 1 paid order settled.")).toBeInTheDocument();
  });

  it("shows local paid orders that PayOS could not verify", async () => {
    vi.mocked(reconcileAdminPaymentOrders).mockResolvedValueOnce({
      provider: "PAYOS",
      window: summary.window,
      attempted: 0,
      settled: 0,
      terminal: 0,
      pending: 0,
      failed: 0,
      paidChecked: 29,
      verifiedPaid: 25,
      unverifiedPaid: 4,
      verificationFailed: 0,
      results: [],
      paidVerificationResults: [
        { orderCode: 1, status: "NOT_FOUND" },
        { orderCode: 2, status: "NOT_FOUND" },
        { orderCode: 3, status: "NOT_FOUND" },
        { orderCode: 4, status: "NOT_FOUND" },
      ],
    });
    renderPage();
    await screen.findByText("Paid revenue");

    fireEvent.click(screen.getByRole("button", { name: "Sync PayOS" }));

    expect(
      await screen.findByText(
        "PayOS sync completed: 25 paid orders verified. 4 local paid orders were not found in PayOS.",
      ),
    ).toBeInTheDocument();
  });
});
