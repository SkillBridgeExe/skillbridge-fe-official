import { describe, expect, it } from "vitest";
import { buildVoucherPayload, isVoucherFormValid } from "./admin-voucher-form";

const validForm = {
  code: "SKILLBRIDGE10",
  benefitType: "PERCENT_DISCOUNT" as const,
  discountPercent: "10",
  creditType: "CV_ANALYSIS" as const,
  creditUnits: "",
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

  it("validates credit units instead of a discount for credit vouchers", () => {
    expect(
      isVoucherFormValid({
        ...validForm,
        benefitType: "CREDIT_GRANT",
        discountPercent: "",
        creditType: "INTERVIEW_SESSION",
        creditUnits: "2",
      }),
    ).toBe(true);
    expect(
      isVoucherFormValid({
        ...validForm,
        benefitType: "CREDIT_GRANT",
        discountPercent: "",
        creditUnits: "0",
      }),
    ).toBe(false);
  });

  it("builds a credit payload without stale Premium discount fields", () => {
    expect(
      buildVoucherPayload({
        ...validForm,
        benefitType: "CREDIT_GRANT",
        discountPercent: "25",
        creditType: "CV_ANALYSIS",
        creditUnits: "3",
      }),
    ).toEqual({
      code: "SKILLBRIDGE10",
      benefitType: "CREDIT_GRANT",
      creditType: "CV_ANALYSIS",
      creditUnits: 3,
      startsAt: new Date(validForm.startsAt).toISOString(),
      endsAt: new Date(validForm.endsAt).toISOString(),
      maxRedemptions: 100,
      perUserLimit: 1,
      internalNote: null,
      isActive: true,
    });
  });
});
