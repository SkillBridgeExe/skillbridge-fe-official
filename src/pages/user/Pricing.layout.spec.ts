import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Pricing layout", () => {
  const source = readFileSync(resolve(__dirname, "Pricing.tsx"), "utf8");

  it("uses a three-card desktop layout for pricing plans and loading skeletons", () => {
    expect(source).toContain(
      'className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3"',
    );
    expect(source).toContain(
      'className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"',
    );
    expect(source).toContain("Array.from({ length: 3 })");
    expect(source).not.toContain("xl:grid-cols-4");
    expect(source).not.toContain("Array.from({ length: 4 })");
  });
});
