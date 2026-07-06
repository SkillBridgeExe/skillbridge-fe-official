import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MentorBilling full upfront flow", () => {
  const source = readFileSync(resolve(__dirname, "MentorBilling.tsx"), "utf8");

  it("uses a single mentor booking payment action without remaining-payment state", () => {
    expect(source).toContain("usePayBooking");
    expect(source).not.toContain("usePayRemaining");
    expect(source).not.toContain("payRemaining");
    expect(source).not.toContain("AWAITING_REMAINING");
  });
});
