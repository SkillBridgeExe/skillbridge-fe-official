import { describe, expect, it } from "vitest";
import { isVoucherFormValid } from "./admin-voucher-form";

const validForm = {
  code: "SKILLBRIDGE10",
  discountPercent: "10",
  startsAt: "2026-07-29T08:00",
  endsAt: "2026-08-29T08:00",
  maxRedemptions: "100",
  perUserLimit: "1",
  internalNote: "",
  isActive: true,
};

describe("isVoucherFormValid", () => {
  it("rejects an end time that is not after the start time", () => {
    expect(
      isVoucherFormValid({
        ...validForm,
        endsAt: validForm.startsAt,
      }),
    ).toBe(false);
    expect(
      isVoucherFormValid({
        ...validForm,
        endsAt: "2026-07-28T08:00",
      }),
    ).toBe(false);
  });

  it("accepts a complete voucher with a valid time window", () => {
    expect(isVoucherFormValid(validForm)).toBe(true);
  });
});
