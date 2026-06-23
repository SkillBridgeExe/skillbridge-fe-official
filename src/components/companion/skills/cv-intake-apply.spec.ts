import { describe, expect, it } from "vitest";
import { computeIntakeFields, type CurrentEntry } from "./cv-intake-apply";
import type { ExtractResponse, ExtractedField } from "@/types/companion";

const mkField = <T>(value: T, found = true, confidence: "high" | "low" = "high"): ExtractedField<T> => ({
  value, found, confidence, source_span: "test span",
});

const emptyEntry: CurrentEntry = {
  company: "", position: "", startDate: "", endDate: "", description: "", achievements: "",
};

const filledEntry: CurrentEntry = {
  company: "FPT", position: "Dev", startDate: "01/2023", endDate: "12/2024",
  description: "Old desc", achievements: "Old ach",
};

const baseExtract: ExtractResponse = {
  fields: {
    company: mkField("Google"),
    position: mkField("SWE"),
    start: mkField("03/2024"),
    end: mkField("present"),
    description: mkField(["Built APIs", "Deployed infra"]),
    achievements: mkField(["Award"]),
  },
  missing: [],
};

describe("computeIntakeFields", () => {
  it("marks all fields as autoApply when entry is empty", () => {
    const diffs = computeIntakeFields(baseExtract, emptyEntry);
    expect(diffs.length).toBe(6);
    expect(diffs.every((d) => d.autoApply)).toBe(true);
    expect(diffs.find((d) => d.field === "company")?.after).toBe("Google");
    expect(diffs.find((d) => d.field === "description")?.after).toBe("Built APIs\nDeployed infra");
  });

  it("marks filled fields as opt-in (autoApply = false) when values differ", () => {
    const diffs = computeIntakeFields(baseExtract, filledEntry);
    const companyDiff = diffs.find((d) => d.field === "company")!;
    expect(companyDiff.autoApply).toBe(false);
    expect(companyDiff.before).toBe("FPT");
    expect(companyDiff.after).toBe("Google");
  });

  it("skips fields with empty extracted values", () => {
    const extract: ExtractResponse = {
      ...baseExtract,
      fields: {
        ...baseExtract.fields,
        company: mkField(""),
      },
    };
    const diffs = computeIntakeFields(extract, emptyEntry);
    expect(diffs.find((d) => d.field === "company")).toBeUndefined();
  });

  it("handles degraded response (caller should check degraded before calling)", () => {
    // computeIntakeFields is still callable but the caller gates on degraded=true
    const degradedExtract: ExtractResponse = { ...baseExtract, degraded: true };
    const diffs = computeIntakeFields(degradedExtract, emptyEntry);
    expect(diffs.length).toBeGreaterThan(0); // still returns diffs; caller decides
  });
});
