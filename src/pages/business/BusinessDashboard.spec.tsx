// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BusinessDashboard from "./BusinessDashboard";
import { MemoryRouter } from "react-router-dom";

vi.mock("./BusinessLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/hooks/use-business-jobs", () => ({
  useBusinessDashboardQuery: () => ({
    isLoading: false,
    isError: false,
    data: {
      company: {
        name: "Acme Vietnam",
        status: "VERIFIED",
        blockers: [],
        publishAllowed: true,
      },
      metrics: {
        activeJobs: 2,
        totalApplications: 7,
        submitted: 3,
        inReview: 2,
        shortlisted: 1,
      },
      recentApplications: [
        {
          id: "app-1",
          candidateName: "An Nguyen",
          status: "IN_REVIEW",
          submittedAt: "2026-07-01T00:00:00.000Z",
          job: { id: "job-1", title: "Frontend Engineer", slug: "frontend", status: "active" },
          matchExplanation: { status: "READY", score: 88 },
        },
      ],
    },
  }),
}));

afterEach(cleanup);

describe("BusinessDashboard", () => {
  it("renders only API-backed metrics and recent applicants", () => {
    render(<MemoryRouter><BusinessDashboard /></MemoryRouter>);

    expect(screen.getByText("An Nguyen")).toBeTruthy();
    expect(screen.getByText(/Frontend Engineer/)).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.queryByText("142")).toBeNull();
  });
});
