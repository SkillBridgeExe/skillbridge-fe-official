import type { CreditType } from "@/api/billing";
import type { CreateAdminVoucherDto, VoucherBenefitType } from "@/api/admin-billing";

export type VoucherFormValues = {
  code: string;
  benefitType: VoucherBenefitType;
  discountPercent: string;
  creditType: CreditType;
  creditUnits: string;
  startsAt: string;
  endsAt: string;
  maxRedemptions: string;
  perUserLimit: string;
  internalNote: string;
  isActive: boolean;
};

export function isVoucherFormValid(form: VoucherFormValues): boolean {
  const discountPercent = Number(form.discountPercent);
  const creditUnits = Number(form.creditUnits);
  const maxRedemptions = Number(form.maxRedemptions);
  const perUserLimit = Number(form.perUserLimit);
  const startsAt = Date.parse(form.startsAt);
  const endsAt = Date.parse(form.endsAt);
  const rewardValid =
    form.benefitType === "PERCENT_DISCOUNT"
      ? Number.isInteger(discountPercent) && discountPercent >= 1 && discountPercent <= 99
      : Number.isInteger(creditUnits) && creditUnits >= 1;

  return Boolean(
    form.code.trim() &&
    rewardValid &&
    Number.isInteger(maxRedemptions) &&
    maxRedemptions >= 1 &&
    Number.isInteger(perUserLimit) &&
    perUserLimit >= 1 &&
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    startsAt < endsAt,
  );
}

export function buildVoucherPayload(form: VoucherFormValues): CreateAdminVoucherDto {
  const common = {
    code: form.code.trim().toUpperCase(),
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    maxRedemptions: Number(form.maxRedemptions),
    perUserLimit: Number(form.perUserLimit),
    internalNote: form.internalNote.trim() || null,
    isActive: form.isActive,
  };
  return form.benefitType === "PERCENT_DISCOUNT"
    ? {
        ...common,
        benefitType: "PERCENT_DISCOUNT",
        discountPercent: Number(form.discountPercent),
      }
    : {
        ...common,
        benefitType: "CREDIT_GRANT",
        creditType: form.creditType,
        creditUnits: Number(form.creditUnits),
      };
}
