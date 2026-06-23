import { describe, expect, it } from "vitest";
import { pickTopNextStep, ctaForStep } from "./diagnosis-results";
import type { NextStepItem } from "@/types/companion";

const step = (p: Partial<NextStepItem>): NextStepItem => ({
  rank: 1, skill: "React", canonical: "react", status: "missing", severity: 50, action: "Learn React.", ...p,
});

describe("pickTopNextStep", () => {
  it("returns null for no steps", () => {
    expect(pickTopNextStep([])).toBeNull();
  });
  it("picks the highest severity", () => {
    const top = pickTopNextStep([step({ skill: "A", severity: 30 }), step({ skill: "B", severity: 80 })]);
    expect(top?.skill).toBe("B");
  });
  it("breaks a severity tie by lowest rank", () => {
    const top = pickTopNextStep([step({ skill: "A", severity: 50, rank: 3 }), step({ skill: "B", severity: 50, rank: 1 })]);
    expect(top?.skill).toBe("B");
  });
});

describe("ctaForStep", () => {
  it("routes an unproven/overclaimed evidence gap to the builder", () => {
    expect(ctaForStep(step({ status: "unproven" }))).toBe("builder");
    expect(ctaForStep(step({ status: "overclaimed" }))).toBe("builder");
  });
  it("routes a missing/weak skill gap to the roadmap", () => {
    expect(ctaForStep(step({ status: "missing" }))).toBe("roadmap");
    expect(ctaForStep(step({ status: "partial" }))).toBe("roadmap");
  });
});
