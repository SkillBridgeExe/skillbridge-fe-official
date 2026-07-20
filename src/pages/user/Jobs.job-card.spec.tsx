// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { JobCard } from "./Jobs";
import { getExternalJobApplyUrl } from "./job-access";
import type { PublicJobDto } from "@/types/jobs";

const externalJob: PublicJobDto = {
  id: "job-1", slug: "frontend-engineer", title: "Frontend Engineer",
  roleCode: null,
  company: { id: "company-1", slug: "acme", name: "Acme", logoUrl: null },
  location: "HCMC", cityCodes: [], workMode: "REMOTE", employmentType: "FULL_TIME", experienceLevel: "JUNIOR", openingsCount: 1,
  salary: { visible: false, min: null, max: null, currency: "VND", period: null, negotiable: false },
  applicationMode: "EXTERNAL", canApply: true, sourceUrl: "https://careers.example.com/job", currentVersionId: null,
  postedAt: null, expiresAt: null, content: null,
};

function renderCard(externalApplyUrl: string | null) {
  return render(
    <MemoryRouter>
      <JobCard job={externalJob} saved={false} showSave={false} externalApplyUrl={externalApplyUrl} onSave={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("JobCard external actions", () => {
  afterEach(cleanup);

  it("renders a safe external apply link only when the shared access layer supplies one", () => {
    renderCard("https://careers.example.com/job");
    expect(screen.getByRole("link", { name: /Apply on site/i }).getAttribute("href")).toBe("https://careers.example.com/job");
  });

  it("does not render an external apply CTA for unsafe URLs or non-candidate viewers", () => {
    renderCard(getExternalJobApplyUrl({ isAuthenticated: false, role: null }, "javascript:alert(1)"));
    expect(screen.queryByRole("link", { name: /Apply on site/i })).toBeNull();
  });
});
