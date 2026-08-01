// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BillingCheckoutRouteError from "./BillingCheckoutRouteError";

const capture = vi.fn();

vi.mock("@posthog/react", () => ({ usePostHog: () => ({ capture }) }));
vi.mock("@/components/layout/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function BrokenRoute(): JSX.Element {
  throw new DOMException("insertBefore failed", "NotFoundError");
}

describe("BillingCheckoutRouteError", () => {
  beforeEach(() => {
    capture.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces the React Router default error screen with safe recovery actions", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/billing/checkout/:orderCode",
          element: <BrokenRoute />,
          errorElement: <BillingCheckoutRouteError />,
        },
      ],
      { initialEntries: ["/billing/checkout/123"] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByRole("alert")).toHaveTextContent("billing.checkout.renderErrorTitle");
    expect(screen.getByRole("link", { name: "billing.checkout.retryPage" })).toHaveAttribute(
      "href",
      "/billing/checkout/123",
    );
    expect(screen.getByRole("link", { name: "billing.checkout.backToPricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
    await waitFor(() =>
      expect(capture).toHaveBeenCalledWith(
        "checkout_render_failed",
        expect.objectContaining({ order_code: "123", error_name: "NotFoundError" }),
      ),
    );
  });
});
