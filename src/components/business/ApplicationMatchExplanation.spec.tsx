// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ApplicationMatchExplanation from "./ApplicationMatchExplanation";

afterEach(cleanup);

describe("ApplicationMatchExplanation", () => {
  it("renders a normalized ready explanation without raw JSON", () => {
    render(
      <ApplicationMatchExplanation
        explanation={{
          status: "READY",
          score: 88,
          scoringVersion: "skill-diff-v2",
          scoreBasis: "skills_only",
          requirementsSource: "jd_extraction",
          requiredCoverage: 0.75,
          errorCode: null,
          matchedSkills: [
            { canonicalName: "react", displayName: "React", importance: "REQUIRED", cvLevel: 4, requiredLevel: 3 },
          ],
          partialSkills: [],
          missingSkills: [],
        }}
      />,
    );

    expect(screen.getByText("88% match")).toBeTruthy();
    expect(screen.getByText("React")).toBeTruthy();
    expect(screen.queryByText(/canonical_name/)).toBeNull();
  });

  it("does not invent a score while matching is pending", () => {
    render(
      <ApplicationMatchExplanation
        explanation={{
          status: "PENDING",
          score: null,
          scoringVersion: null,
          scoreBasis: null,
          requirementsSource: null,
          requiredCoverage: null,
          errorCode: null,
          matchedSkills: [],
          partialSkills: [],
          missingSkills: [],
        }}
      />,
    );
    expect(screen.getByText(/being calculated/i)).toBeTruthy();
    expect(screen.queryByText(/% match/)).toBeNull();
  });
});
