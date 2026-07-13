import { describe, expect, it } from "vitest";
import { describeBusinessProfileBlockers } from "./business-profile-blockers";

describe("describeBusinessProfileBlockers", () => {
  it("turns stable backend codes into actionable copy", () => {
    expect(describeBusinessProfileBlockers(["WORK_EMAIL_UNVERIFIED", "INDUSTRY_MISSING"])).toEqual([
      "Verify your work email",
      "Choose the company industry",
    ]);
  });
});
