// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TopCandidates from "./TopCandidates";
import { MemoryRouter } from "react-router-dom";

vi.mock("./BusinessLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/hooks/use-business-jobs", () => ({
  useBusinessJobsQuery: () => ({
    isLoading: false,
    data: { items: [{ id: "job-1", title: "Frontend Engineer", status: "active" }], total: 1, page: 1, limit: 50 },
  }),
  useBusinessApplicationsQuery: () => ({
    isLoading: false,
    isError: false,
    data: {
      items: [{
        id: "app-1",
        candidateName: "An Nguyen",
        candidateEmail: "an@example.com",
        status: "IN_REVIEW",
        submittedAt: "2026-07-01T00:00:00.000Z",
        matchExplanation: {
          status: "READY",
          score: 91,
          scoringVersion: "skill-diff-v2",
          scoreBasis: "skills_only",
          requirementsSource: "jd_extraction",
          requiredCoverage: 0.8,
          errorCode: null,
          matchedSkills: [{ canonicalName: "react", displayName: "React", importance: "REQUIRED", cvLevel: 4, requiredLevel: 3 }],
          partialSkills: [],
          missingSkills: [],
        },
      }],
      total: 1,
      page: 1,
      limit: 20,
    },
  }),
}));

afterEach(cleanup);

describe("TopCandidates", () => {
  it("ranks real applicants for the selected job and contains no discovery mock", async () => {
    render(<MemoryRouter><TopCandidates /></MemoryRouter>);
    expect(await screen.findByText("An Nguyen")).toBeTruthy();
    expect(screen.getByText("91% match")).toBeTruthy();
    expect(screen.queryByText("Nguyen Minh Anh")).toBeNull();
    expect(screen.queryByText("Demo Preview")).toBeNull();
  });
});
