// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { CheckoutPriceSummary } from "./CheckoutPriceSummary";

describe("CheckoutPriceSummary", () => {
  it("renders the server-priced discount and final amount", () => {
    render(
      <CheckoutPriceSummary
        planName="Premium"
        originalAmountVnd={199000}
        discountAmountVnd={19900}
        finalAmountVnd={179100}
        labels={{
          plan: "Gói nâng cấp",
          originalPrice: "Giá gốc",
          discount: "Giảm 10%",
          total: "Tổng thanh toán",
        }}
      />,
    );

    expect(screen.getByText("199.000đ")).toBeInTheDocument();
    expect(screen.getByText("-19.900đ")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("179.100đ");
  });
});
