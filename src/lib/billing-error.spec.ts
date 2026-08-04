import { describe, expect, it } from "vitest";
import { ApiError } from "./api-error";
import { getVoucherErrorMessage } from "./billing-error";

const translate = (key: string) => key;

describe("getVoucherErrorMessage", () => {
  it("maps voucher business errors to localized copy keys", () => {
    expect(
      getVoucherErrorMessage(
        new ApiError("Voucher has expired", "VOUCHER_EXPIRED"),
        translate,
        "PREMIUM_CHECKOUT",
      ),
    ).toBe("billing.errors.voucher.expired");
  });

  it("explains where a voucher of the other type must be used", () => {
    const error = new ApiError("Wrong voucher type", "VOUCHER_TYPE_MISMATCH");

    expect(getVoucherErrorMessage(error, translate, "CREDIT_CLAIM")).toBe(
      "billing.errors.voucher.discountOnly",
    );
    expect(getVoucherErrorMessage(error, translate, "PREMIUM_CHECKOUT")).toBe(
      "billing.errors.voucher.creditOnly",
    );
  });

  it("hides technical route errors behind the localized fallback", () => {
    expect(
      getVoucherErrorMessage(
        new Error("Cannot POST /api/billing/vouchers/claim"),
        translate,
        "CREDIT_CLAIM",
      ),
    ).toBe("billing.errors.voucher.default");
  });
});