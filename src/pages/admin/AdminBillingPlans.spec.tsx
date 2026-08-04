// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminBillingPlans from "./AdminBillingPlans";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  getAdminBillingFeatures,
  getAdminBillingPlans,
  replaceAdminPlanFeatures,
  updateAdminPlanFeature,
} from "@/services/admin-billing.service";

vi.mock("@/services/admin-billing.service", () => ({
  createAdminBillingPlan: vi.fn(),
  getAdminBillingFeatures: vi.fn(),
  getAdminBillingPlans: vi.fn(),
  replaceAdminPlanFeatures: vi.fn(),
  updateAdminBillingPlan: vi.fn(),
  updateAdminPlanFeature: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "billing.admin.common.edit": "Edit",
        "billing.admin.eyebrow": "Admin billing",
        "billing.admin.plans.title": "Billing Plans",
        "billing.admin.plans.subtitle": "Manage plans, prices, and feature limits.",
        "billing.admin.plans.hideInactive": "Hide inactive",
        "billing.admin.plans.showInactive": "Show inactive",
        "billing.admin.plans.createPlan": "Create plan",
        "billing.admin.plans.listTitle": "Plans",
        "billing.admin.plans.editTitle": `Edit ${String(options?.code ?? "")}`,
        "billing.admin.plans.quotaTitle": "Feature quotas",
        "billing.admin.plans.quotaDescription": "Edit one feature quota at a time.",
        "billing.admin.plans.limit": "Limit",
        "billing.admin.plans.unlimited": "Unlimited",
        "billing.admin.plans.period": "Period",
        "billing.admin.plans.saveQuota": "Save quota",
        "billing.admin.plans.priceVnd": "Price (VND)",
        "billing.admin.plans.sortOrder": "Sort order",
        "billing.admin.plans.creditUnits": "Credits",
        "billing.admin.plans.description": "Description",
        "billing.admin.table.code": "Code",
        "billing.admin.table.name": "Name",
        "billing.admin.table.category": "Category",
        "billing.admin.table.interval": "Interval",
        "billing.admin.table.price": "Price",
        "billing.admin.table.status": "Status",
        "billing.admin.status.active": "Active",
      };
      return translations[key] ?? String(options?.defaultValue ?? key);
    },
  }),
}));

const plans = [
  {
    code: "PRO",
    name: "Pro",
    description: "Pro plan",
    category: "SUBSCRIPTION" as const,
    interval: "MONTHLY" as const,
    priceVnd: 129000,
    currency: "VND",
    isActive: true,
    sortOrder: 10,
    features: [
      { featureKey: "cv_review", limit: 20, limitValue: 20, period: "MONTHLY" },
      { featureKey: "interview_session", limit: 3, limitValue: 3, period: "MONTHLY" },
    ],
  },
];

const features = [
  {
    featureKey: "cv_review",
    label: "CV diagnosis",
    description: "AI CV analysis, ATS checks, scoring and feedback.",
    allowedPeriods: ["MONTHLY"],
    recommendedLimits: { PRO: 30 },
  },
  {
    featureKey: "interview_session",
    label: "Interview sessions",
    description: "AI mock interview quota.",
    allowedPeriods: ["MONTHLY"],
    recommendedLimits: { PRO: 5 },
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminBillingPlans />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

async function openPlanEditor() {
  renderPage();
  await screen.findByText("PRO");
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  await screen.findByText("CV diagnosis");
}

describe("AdminBillingPlans quota editor", () => {
  beforeEach(() => {
    vi.mocked(getAdminBillingPlans).mockResolvedValue(plans);
    vi.mocked(getAdminBillingFeatures).mockResolvedValue(features);
    vi.mocked(updateAdminPlanFeature).mockResolvedValue(plans[0]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders catalog-backed quota rows instead of the legacy free-text format", async () => {
    await openPlanEditor();

    expect(screen.getByText("AI CV analysis, ATS checks, scoring and feedback.")).toBeInTheDocument();
    expect(screen.getByLabelText("Limit for CV diagnosis")).toHaveValue(20);
    expect(screen.queryByPlaceholderText("featureKey:limitValue:period")).not.toBeInTheDocument();
  });

  it("saves one edited feature quota with PATCH semantics and does not call bulk replace", async () => {
    await openPlanEditor();

    fireEvent.change(screen.getByLabelText("Limit for CV diagnosis"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save CV diagnosis quota" }));

    await waitFor(() =>
      expect(updateAdminPlanFeature).toHaveBeenCalledWith("PRO", "cv_review", {
        limitValue: 25,
        period: "MONTHLY",
      }),
    );
    expect(replaceAdminPlanFeatures).not.toHaveBeenCalled();
  });

  it("sends -1 when the unlimited toggle is enabled", async () => {
    await openPlanEditor();

    const interviewRow = screen.getByText("Interview sessions").closest("tr");
    expect(interviewRow).not.toBeNull();
    fireEvent.click(within(interviewRow as HTMLTableRowElement).getByLabelText("Unlimited for Interview sessions"));
    fireEvent.click(within(interviewRow as HTMLTableRowElement).getByRole("button", { name: "Save Interview sessions quota" }));

    await waitFor(() =>
      expect(updateAdminPlanFeature).toHaveBeenCalledWith("PRO", "interview_session", {
        limitValue: -1,
        period: "MONTHLY",
      }),
    );
  });

  it("keeps the row editable and shows the validation error when save fails", async () => {
    vi.mocked(updateAdminPlanFeature).mockRejectedValueOnce(new Error("Invalid period"));
    await openPlanEditor();

    fireEvent.click(screen.getByRole("button", { name: "Save CV diagnosis quota" }));

    expect(await screen.findByText("Invalid period")).toBeInTheDocument();
    expect(screen.getByLabelText("Limit for CV diagnosis")).toBeEnabled();
  });

  it("shows only editable commercial fields for a fixed credit package", async () => {
    vi.mocked(getAdminBillingPlans).mockResolvedValueOnce([
      {
        code: "CV_ANALYSIS_PACK",
        name: "CV credits",
        description: "Analyze CVs",
        category: "CREDIT_PACKAGE",
        interval: "ONE_TIME",
        priceVnd: 20000,
        currency: "VND",
        isActive: true,
        sortOrder: 100,
        creditPackage: { creditType: "CV_ANALYSIS", units: 2 },
        features: [],
      },
    ]);

    renderPage();
    await screen.findByText("CV_ANALYSIS_PACK");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(await screen.findByDisplayValue("CV credits")).toBeInTheDocument();
    expect(screen.getByLabelText("Price (VND)")).toHaveValue("20000");
    expect(screen.getByLabelText("Credits")).toHaveValue("2");
    expect(screen.getByLabelText("Sort order")).toHaveValue("100");
    expect(screen.queryByLabelText("Code")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Interval")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Currency")).not.toBeInTheDocument();
    expect(screen.queryByText("Feature quotas")).not.toBeInTheDocument();
  });
});
