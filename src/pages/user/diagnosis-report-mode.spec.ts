import { describe, expect, it } from "vitest";
import {
  getDiagnosisReportMode,
  normalizeDiagnosisReportTab,
} from "./diagnosis-report-mode";

describe("diagnosis report mode", () => {
  it("keeps CV-only results in review mode", () => {
    expect(getDiagnosisReportMode("results", false)).toBe("review");
  });

  it("uses match mode only when a JD match exists", () => {
    expect(getDiagnosisReportMode("results", true)).toBe("match");
  });

  it("normalizes a stale match tab back to CV audit for CV-only results", () => {
    expect(normalizeDiagnosisReportTab("review", "fit")).toBe("audit");
  });

  it("normalizes a stale review tab to match fit for CV-JD results", () => {
    expect(normalizeDiagnosisReportTab("match", "audit")).toBe("fit");
  });

  it("preserves a tab that belongs to the current report mode", () => {
    expect(normalizeDiagnosisReportTab("review", "market")).toBe("market");
    expect(normalizeDiagnosisReportTab("match", "jobs")).toBe("jobs");
  });
});
