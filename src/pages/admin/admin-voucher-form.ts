export type VoucherFormValues = {
  code: string;
  discountPercent: string;
  startsAt: string;
  endsAt: string;
  maxRedemptions: string;
  perUserLimit: string;
  internalNote: string;
  isActive: boolean;
};

export function isVoucherFormValid(form: VoucherFormValues): boolean {
  const discountPercent = Number(form.discountPercent);
  const maxRedemptions = Number(form.maxRedemptions);
  const perUserLimit = Number(form.perUserLimit);
  const startsAt = Date.parse(form.startsAt);
  const endsAt = Date.parse(form.endsAt);

  return Boolean(
    form.code.trim() &&
    Number.isInteger(discountPercent) &&
    discountPercent >= 1 &&
    discountPercent <= 99 &&
    Number.isInteger(maxRedemptions) &&
    maxRedemptions >= 1 &&
    Number.isInteger(perUserLimit) &&
    perUserLimit >= 1 &&
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    startsAt < endsAt,
  );
}
