import { describe, expect, it } from "vitest";
import { pickTopCompletenessGap, completenessSummary } from "./diagnosis-review";
import type { CanonicalCvDocument } from "@shared/api";

const doc = (over: Partial<CanonicalCvDocument>): CanonicalCvDocument =>
  ({
    experience: [{ org: "X", role: "Dev", start: "2020", end: "2021" }],
    projects: [{ name: "P" }],
    skills: { technical: ["React"] },
    summary: "A solid summary",
    ...over,
  }) as unknown as CanonicalCvDocument;

describe("pickTopCompletenessGap", () => {
  it("is honest-empty for a complete doc (and a null doc)", () => {
    expect(pickTopCompletenessGap(doc({}))).toBeNull();
    expect(pickTopCompletenessGap(null)).toBeNull();
  });

  it("flags no_experience first (highest priority)", () => {
    expect(pickTopCompletenessGap(doc({ experience: [] }))).toBe("no_experience");
  });

  it("flags exp_no_dates when an experience entry lacks dates", () => {
    expect(
      pickTopCompletenessGap(doc({ experience: [{ org: "X", role: "Dev" }] as never })),
    ).toBe("exp_no_dates");
  });

  it("flags no_skills when there are no technical skills", () => {
    expect(pickTopCompletenessGap(doc({ skills: { technical: [] } as never }))).toBe("no_skills");
  });

  it("flags no_summary when the summary is blank", () => {
    expect(pickTopCompletenessGap(doc({ summary: "  " }))).toBe("no_summary");
  });
});

describe("completenessSummary", () => {
  it("counts experiences/projects/skills + hasSummary", () => {
    expect(completenessSummary(doc({}))).toEqual({
      experiences: 1,
      projects: 1,
      skills: 1,
      hasSummary: true,
    });
  });

  it("returns zeros for a null doc", () => {
    expect(completenessSummary(null)).toEqual({
      experiences: 0,
      projects: 0,
      skills: 0,
      hasSummary: false,
    });
  });
});
