// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutErrorBoundary } from "./CheckoutErrorBoundary";

function BrokenCheckout(): JSX.Element {
  throw new DOMException(
    "The node before which the new node is to be inserted is not a child of this node.",
    "NotFoundError",
  );
}

describe("CheckoutErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces a checkout render crash with a hosted payment escape route", () => {
    const onError = vi.fn();
    render(
      <CheckoutErrorBoundary
        checkoutUrl="https://pay.payos.vn/web/payment-link-1"
        title="Payment view needs to be reopened"
        description="Your order is safe. Continue on the payment page."
        openPaymentLabel="Open payment page"
        onError={onError}
      >
        <BrokenCheckout />
      </CheckoutErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Payment view needs to be reopened");
    expect(screen.getByRole("link", { name: "Open payment page" })).toHaveAttribute(
      "href",
      "https://pay.payos.vn/web/payment-link-1",
    );
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: "NotFoundError" }));
  });
});
