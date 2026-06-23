import { describe, expect, it } from "vitest";
import { bucketCoverage } from "./score-breakdown";
import type { CvJdMatch, SkillMatchItem } from "@shared/api";

const skill = (name: string, status: SkillMatchItem["status"], cvScore = 50): SkillMatchItem =>
  ({ name, canonical_name: name.toLowerCase(), status, cvScore }) as SkillMatchItem;

const match = (hard: SkillMatchItem[], soft: SkillMatchItem[] = []): CvJdMatch =>
  ({ hardSkills: hard, softSkills: soft }) as CvJdMatch;

describe("bucketCoverage", () => {
  it("is honest-empty with no match", () => {
    expect(bucketCoverage(null)).toBeNull();
    expect(bucketCoverage(undefined)).toBeNull();
  });

  it("is honest-empty when there are no skills at all", () => {
    expect(bucketCoverage(match([], []))).toBeNull();
  });

  it("buckets present → covered, partial/missing → not-covered, across hard+soft", () => {
    const r = bucketCoverage(
      match([skill("React", "present"), skill("AWS", "missing")], [skill("Comm", "partial")]),
    );
    expect(r?.covered.map((c) => c.name)).toEqual(["React"]);
    expect(r?.notCovered).toEqual(
      expect.arrayContaining([
        { name: "AWS", status: "missing" },
        { name: "Comm", status: "partial" },
      ]),
    );
  });
});
