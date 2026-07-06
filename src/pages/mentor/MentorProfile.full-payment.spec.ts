import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MentorProfile full upfront payment copy", () => {
  const source = readFileSync(resolve(__dirname, "MentorProfile.tsx"), "utf8");

  it("does not present the removed 10/90 deposit split", () => {
    expect(source).toContain("payInFull");
    expect(source).not.toContain("depositDue");
    expect(source).not.toContain("remainingDue");
    expect(source).not.toContain("10%");
    expect(source).not.toContain("90%");
  });
});
