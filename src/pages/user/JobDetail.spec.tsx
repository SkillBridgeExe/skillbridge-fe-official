// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AuthSource, AuthUser } from "@/store/useAuthStore";
import JobDetail from "./JobDetail";

const state = vi.hoisted(() => ({
  auth: {
    authSource: "api" as AuthSource,
    isAuthenticated: true,
    currentUser: { id: "candidate-1", name: "Ada Lovelace", email: "ada@example.com", role: "user" } as AuthUser | null,
  } as { authSource: AuthSource; isAuthenticated: boolean; currentUser: AuthUser | null },
  detail: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
  cvs: { data: { items: [{ id: "cv-1", title: "Frontend CV", originalFileName: null }], total: 1 }, isLoading: false, isError: false, refetch: vi.fn() },
  mutateAsync: vi.fn(),
}));

vi.mock("@/components/layout/Layout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/auth/LoginDialog", () => ({
  LoginDialog: ({ open, redirectTo }: { open: boolean; redirectTo?: string }) => open ? <div data-testid="login-dialog">{redirectTo}</div> : null,
}));
vi.mock("@/hooks/use-jobs", () => ({
  useApplyToJobMutation: () => ({ mutateAsync: state.mutateAsync, isPending: false }),
  useJobDetailQuery: () => state.detail,
}));
vi.mock("@/hooks/use-job-application-cvs", () => ({ useJobApplicationCvs: () => state.cvs }));
vi.mock("@/store/useAuthStore", () => ({ useAuthStore: (selector: (input: typeof state.auth) => unknown) => selector(state.auth) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const nativeJob = {
  id: "job-1",
  slug: "frontend-engineer",
  title: "Frontend Engineer",
  company: { id: "company-1", slug: "acme", name: "Acme", logoUrl: null },
  location: "Ho Chi Minh City",
  cityCodes: [], workMode: "HYBRID", employmentType: "FULL_TIME", experienceLevel: "JUNIOR", openingsCount: 1,
  salary: { visible: true, min: 20000000, max: 30000000, currency: "VND", period: "MONTH", negotiable: false },
  applicationMode: "NATIVE", canApply: true, sourceUrl: null, currentVersionId: "version-1",
  postedAt: null, expiresAt: "2030-01-01T00:00:00.000Z",
  content: { summary: "Build accessible web products.", responsibilities: ["Build UI"], requirements: ["React"], niceToHave: [], benefits: ["Remote days"], interviewProcess: [], workingTime: null, locations: [], educationLevel: null, languageCode: null },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/jobs/frontend-engineer"]}>
      <Routes><Route path="/jobs/:slug" element={<JobDetail />} /></Routes>
    </MemoryRouter>,
  );
}

describe("JobDetail", () => {
  beforeEach(() => {
    state.auth = { authSource: "api", isAuthenticated: true, currentUser: { id: "candidate-1", name: "Ada Lovelace", email: "ada@example.com", role: "user" } };
    state.detail = { data: nativeJob, isLoading: false, isError: false, refetch: vi.fn() };
    state.cvs = { data: { items: [{ id: "cv-1", title: "Frontend CV", originalFileName: null }], total: 1 }, isLoading: false, isError: false, refetch: vi.fn() };
    state.mutateAsync.mockReset().mockResolvedValue({ id: "application-1" });
  });

  afterEach(cleanup);

  it("renders job content and lets an API candidate submit a consented native application", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Frontend Engineer" })).toBeTruthy();
    expect(screen.getByText("Build accessible web products.")).toBeTruthy();
    expect(screen.getByDisplayValue("Ada Lovelace")).toBeTruthy();
    expect(screen.getByDisplayValue("ada@example.com")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("CV"), { target: { value: "cv-1" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+84 123" } });
    fireEvent.click(screen.getByLabelText(/I agree to share/i));
    fireEvent.click(screen.getByRole("button", { name: "Submit application" }));

    await waitFor(() => expect(state.mutateAsync).toHaveBeenCalledWith({
      jobId: "job-1",
      body: {
        jobVersionId: "version-1", cvId: "cv-1", candidateName: "Ada Lovelace", candidateEmail: "ada@example.com",
        candidatePhone: "+84 123", consentAccepted: true, consentVersion: "job-apply-v1",
      },
    }));
    expect(await screen.findByRole("button", { name: "Application submitted" })).toBeTruthy();
  });

  it("opens the safe external application destination", () => {
    state.detail.data = { ...nativeJob, applicationMode: "EXTERNAL", sourceUrl: "https://careers.example.com/jobs/1" };
    renderPage();

    const link = screen.getByRole("link", { name: "Apply on company site" });
    expect(link.getAttribute("href")).toBe("https://careers.example.com/jobs/1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(screen.queryByLabelText("CV")).toBeNull();
  });

  it("does not render an external CTA for a dangerous source URL", () => {
    state.detail.data = { ...nativeJob, applicationMode: "EXTERNAL", sourceUrl: "javascript:alert(1)" };
    renderPage();

    expect(screen.queryByRole("link", { name: "Apply on company site" })).toBeNull();
  });

  it("keeps external application CTAs hidden from business viewers", () => {
    state.auth.currentUser = { id: "business-1", name: "Acme HR", email: "hr@acme.test", role: "business" };
    state.detail.data = { ...nativeJob, applicationMode: "EXTERNAL", sourceUrl: "https://careers.example.com/jobs/1" };
    renderPage();

    expect(screen.queryByRole("link", { name: "Apply on company site" })).toBeNull();
  });

  it("keeps business viewers read-only and does not show application controls", () => {
    state.auth.currentUser = { id: "business-1", name: "Acme HR", email: "hr@acme.test", role: "business" };
    renderPage();

    expect(screen.getByText(/Only candidate accounts can apply/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Submit application" })).toBeNull();
    expect(screen.queryByLabelText("CV")).toBeNull();
  });

  it("prompts anonymous visitors to log in and preserves the detail URL", () => {
    state.auth = { authSource: null, isAuthenticated: false, currentUser: null };
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Log in to apply" }));
    expect(screen.getByTestId("login-dialog").textContent).toBe("/jobs/frontend-engineer");
  });

  it("shows a useful duplicate-application result and prevents another submission", async () => {
    state.mutateAsync.mockRejectedValueOnce({ errorCode: "DUPLICATE_APPLICATION", message: "Already applied" });
    renderPage();
    fireEvent.change(screen.getByLabelText("CV"), { target: { value: "cv-1" } });
    fireEvent.click(screen.getByLabelText(/I agree to share/i));
    fireEvent.click(screen.getByRole("button", { name: "Submit application" }));

    expect(await screen.findByText("You have already applied to this job.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Application submitted" })).toBeTruthy();
  });

  it("shows retry and not-found states for unavailable detail data", () => {
    state.detail = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(state.detail.refetch).toHaveBeenCalledOnce();
  });
});
