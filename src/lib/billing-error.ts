import { getApiErrorCode, getApiErrorMessage } from "@/lib/api-error";

type Translate = (key: string) => string;
type VoucherSurface = "PREMIUM_CHECKOUT" | "CREDIT_CLAIM";

const VOUCHER_ERROR_KEYS: Record<string, string> = {
  VOUCHER_INVALID: "billing.errors.voucher.invalid",
  VOUCHER_NOT_STARTED: "billing.errors.voucher.notStarted",
  VOUCHER_EXPIRED: "billing.errors.voucher.expired",
  VOUCHER_EXHAUSTED: "billing.errors.voucher.exhausted",
  VOUCHER_USER_LIMIT_REACHED: "billing.errors.voucher.userLimit",
};

export function getVoucherErrorMessage(
  error: unknown,
  translate: Translate,
  surface: VoucherSurface,
): string {
  const code = getApiErrorCode(error);
  if (code === "VOUCHER_TYPE_MISMATCH") {
    return translate(
      surface === "CREDIT_CLAIM"
        ? "billing.errors.voucher.discountOnly"
        : "billing.errors.voucher.creditOnly",
    );
  }

  const translationKey = code ? VOUCHER_ERROR_KEYS[code] : undefined;
  if (translationKey) return translate(translationKey);

  return getApiErrorMessage(error, translate("billing.errors.voucher.default"));
}