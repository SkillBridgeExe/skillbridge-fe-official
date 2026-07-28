import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Pricing layout", () => {
  const source = readFileSync(resolve(__dirname, "Pricing.tsx"), "utf8");

  it("uses a two-card layout and does not summarize hidden benefits", () => {
    expect(source).toContain(
      'className="grid items-stretch gap-5 md:grid-cols-2"',
    );
    expect(source).toContain('className="grid gap-5 md:grid-cols-2"');
    expect(source).toContain("Array.from({ length: 2 })");
    expect(source).not.toContain("moreFeatures");
  });

  it("validates one voucher and shows the server-priced checkout breakdown", () => {
    expect(source).toContain("validateVoucher({ planCode, voucherCode: code })");
    expect(source).toContain("quote?.originalAmountVnd");
    expect(source).toContain("quote?.discountAmountVnd");
    expect(source).toContain("quote?.finalAmountVnd");
    expect(source).toContain("code: appliedVoucherCode ?? undefined");
  });
});
