// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { JobRecommendations } from "./JobRecommendations";
import { useJobRecommendationsQuery } from "@/hooks/use-diagnosis";
import { AxiosError } from "axios";

afterEach(() => {
  cleanup();
});

// ── Mocks ──
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === "jobs.top5Title") return "Top 5 việc làm phù hợp nhất";
      if (key === "jobs.explorerTitle") return "Khám phá việc làm phù hợp";
      if (key === "jobs.viewAllJobs") return `Xem tất cả ${opts?.total ?? ""} việc làm`;
      if (key === "jobs.showTop5") return "Xem Top 5 gọn";
      if (key === "jobs.loadMore") return "Tải thêm việc làm";
      if (key === "jobs.emptyPool") return "Chưa có việc làm phù hợp";
      if (key === "jobs.emptyFilter") return "Không có kết quả với bộ lọc này.";
      if (key === "jobs.quotaBlocked") return "Hết lượt đề xuất";
      if (key === "jobs.error") return "Lỗi tải đề xuất";
      if (key === "jobs.retry") return "Thử lại";
      if (key === "jobs.apply") return "Ứng tuyển";
      if (key === "jobs.workModes.REMOTE") return "Remote";
      if (key === "jobs.workModes.ONSITE") return "Onsite";
      if (key === "jobs.workModes.HYBRID") return "Hybrid";
      if (key === "jobs.employmentTypes.FULL_TIME") return "Toàn thời gian";
      if (key === "jobs.employmentTypes.PART_TIME") return "Bán thời gian";
      if (key === "jobs.experienceLevels.SENIOR") return "Senior";
      if (key === "jobs.experienceLevels.MIDDLE") return "Middle";
      if (key === "jobs.fitFilter.safe_apply") return "Vừa sức";
      if (key === "jobs.fitFilter.stretch") return "Thử thách";
      return (opts?.defaultValue as string) || key;
    },
  }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("@/hooks/use-diagnosis", () => ({
  useJobRecommendationsQuery: vi.fn(),
}));

const mockJobsData = {
  total: 15,
  pool_size: 15,
  recommendations: [
    {
      job_id: "job-1",
      title: "Senior Frontend Engineer",
      company_name: "Tech Corp",
      location: "Hồ Chí Minh",
      work_mode: "REMOTE",
      employment_type: "FULL_TIME",
      experience_level: "SENIOR",
      role_code: "frontend_developer",
      match_score: 88,
      recommendation_score: 88,
      salary_min: 30000000,
      salary_max: 50000000,
      currency: "VND",
      source_url: "https://example.com/job/1",
    },
    {
      job_id: "job-2",
      title: "Fullstack React Developer",
      company_name: "Fintech Lab",
      location: "Hà Nội",
      work_mode: "HYBRID",
      employment_type: "FULL_TIME",
      experience_level: "MIDDLE",
      role_code: "fullstack_developer",
      match_score: 75,
      recommendation_score: 75,
      salary_min: 20000000,
      salary_max: 35000000,
      currency: "VND",
      source_url: "https://example.com/job/2",
    },
  ],
  facets: {
    city_codes: [{ value: "HCMC", count: 8 }, { value: "HANOI", count: 7 }],
    work_modes: [{ value: "REMOTE", count: 5 }, { value: "HYBRID", count: 10 }],
    employment_types: [{ value: "FULL_TIME", count: 12 }, { value: "PART_TIME", count: 3 }],
    experience_levels: [{ value: "SENIOR", count: 6 }, { value: "MIDDLE", count: 9 }],
    fit: [{ value: "safe_apply", count: 10 }, { value: "stretch", count: 5 }],
  },
};

describe("JobRecommendations — Comprehensive Feature Suite", () => {
  it("renders Top 5 view initially", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);

    expect(screen.getByText("Top 5 việc làm phù hợp nhất")).toBeInTheDocument();
    expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Fullstack React Developer")).toBeInTheDocument();
    expect(screen.getByText("Xem tất cả 15 việc làm")).toBeInTheDocument();
  });

  it("toggles to Explorer Mode when View All button is clicked", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);

    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));

    expect(screen.getByText("Khám phá việc làm phù hợp")).toBeInTheDocument();
    expect(screen.getByText("Xem Top 5 gọn")).toBeInTheDocument();
  });

  it("renders Role, Location, Work Mode, Employment Type, Seniority, Fit, and Sort controls in Explorer mode", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));

    // Check Role select
    expect(screen.getAllByRole("combobox")[0]).toBeInTheDocument();
    // Check City facet button
    expect(screen.getByText("HCMC (8)")).toBeInTheDocument();
    // Check Work mode facet button
    expect(screen.getByText("Remote (5)")).toBeInTheDocument();
    // Check Employment type facet button
    expect(screen.getByText("Toàn thời gian (12)")).toBeInTheDocument();
    // Check Seniority level facet button
    expect(screen.getByText("Senior (6)")).toBeInTheDocument();
    // Check Fit facet button
    expect(screen.getByText("Vừa sức (10)")).toBeInTheDocument();
  });

  it("updates query when target role filter is selected", () => {
    const mockQuery = vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));

    const roleSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(roleSelect, { target: { value: "frontend_developer" } });

    expect(mockQuery).toHaveBeenLastCalledWith(
      "cv-123",
      expect.objectContaining({ role: "frontend_developer", offset: 0 })
    );
  });

  it("sends role=all explicitly instead of falling back to the CV target role", () => {
    const mockQuery = vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        role_scope: { role_code: "frontend_developer", source: "cv_target" },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));

    const roleSelect = screen.getAllByRole("combobox")[0];
    expect(roleSelect).toHaveValue("frontend_developer");
    fireEvent.change(roleSelect, { target: { value: "all" } });

    expect(mockQuery).toHaveBeenLastCalledWith(
      "cv-123",
      expect.objectContaining({ role: "all", offset: 0 }),
    );
  });

  it("updates query when employment type facet is toggled", () => {
    const mockQuery = vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));

    const empButton = screen.getByText("Toàn thời gian (12)");
    fireEvent.click(empButton);

    expect(mockQuery).toHaveBeenLastCalledWith(
      "cv-123",
      expect.objectContaining({ employmentTypes: ["FULL_TIME"], offset: 0 })
    );
  });

  it("updates query when sort option is changed", () => {
    const mockQuery = vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));

    const sortSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(sortSelect, { target: { value: "SKILL_MATCH" } });

    expect(mockQuery).toHaveBeenLastCalledWith(
      "cv-123",
      expect.objectContaining({ sort: "SKILL_MATCH", offset: 0 })
    );
  });

  it("handles empty filter results gracefully", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: { ...mockJobsData, total: 0, recommendations: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText("Chưa có việc làm phù hợp")).toBeInTheDocument();
  });

  it("renders error state with retry action", () => {
    const refetchMock = vi.fn();
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText("Lỗi tải đề xuất")).toBeInTheDocument();

    const retryBtn = screen.getByText("Thử lại");
    fireEvent.click(retryBtn);
    expect(refetchMock).toHaveBeenCalled();
  });

  it("renders quota blocked state when API returns 402", () => {
    const error402 = new AxiosError("Quota blocked", "402", undefined, undefined, { status: 402 } as unknown as import("axios").AxiosResponse);
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: error402,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText("Hết lượt đề xuất")).toBeInTheDocument();
  });

  it("appends later pages and deduplicates jobs by job_id", () => {
    const firstPage = {
      ...mockJobsData,
      total: 12,
      recommendations: mockJobsData.recommendations,
    };
    const secondPage = {
      ...mockJobsData,
      total: 12,
      recommendations: [
        mockJobsData.recommendations[1],
        {
          ...mockJobsData.recommendations[0],
          job_id: "job-3",
          title: "Junior React Developer",
        },
      ],
    };

    vi.mocked(useJobRecommendationsQuery).mockImplementation((_cvId, query) => {
      const isSecondPage = query?.offset === 10;
      return {
        data: isSecondPage ? secondPage : firstPage,
        isLoading: false,
        isError: false,
        isRefetching: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useJobRecommendationsQuery>;
    });

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 12 việc làm"));
    fireEvent.click(screen.getByText("Tải thêm việc làm"));

    expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    expect(screen.getAllByText("Fullstack React Developer")).toHaveLength(1);
    expect(screen.getByText("Junior React Developer")).toBeInTheDocument();
    expect(screen.queryByText("Tải thêm việc làm")).not.toBeInTheDocument();
  });

  it("resets accumulated pagination when the CV changes", () => {
    const cvBData = {
      ...mockJobsData,
      total: 1,
      recommendations: [
        {
          ...mockJobsData.recommendations[0],
          job_id: "job-b",
          title: "Backend Fresher",
        },
      ],
    };
    vi.mocked(useJobRecommendationsQuery).mockImplementation((cvId, query) => {
      const base = cvId === "cv-b" ? cvBData : mockJobsData;
      return {
        data: base,
        isLoading: false,
        isError: false,
        isRefetching: false,
        refetch: vi.fn(),
        query,
      } as unknown as ReturnType<typeof useJobRecommendationsQuery>;
    });

    const { rerender } = render(<JobRecommendations cvId="cv-a" />);
    expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));
    fireEvent.click(screen.getByText("Tải thêm việc làm"));
    expect(vi.mocked(useJobRecommendationsQuery).mock.calls.at(-1)?.[1]?.offset).toBe(10);

    rerender(<JobRecommendations cvId="cv-b" />);

    expect(screen.getByText("Backend Fresher")).toBeInTheDocument();
    expect(screen.queryByText("Senior Frontend Engineer")).not.toBeInTheDocument();
    const cvBCalls = vi
      .mocked(useJobRecommendationsQuery)
      .mock.calls.filter(([requestedCvId]) => requestedCvId === "cv-b");
    expect(cvBCalls[0]?.[1]?.offset).toBe(0);
  });

  it("keeps mobile filter changes as a draft until Apply is pressed", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));
    fireEvent.click(screen.getByRole("button", { name: /Bộ lọc/i }));
    fireEvent.click(screen.getByRole("button", { name: "HCMC (8)" }));

    expect(
      vi.mocked(useJobRecommendationsQuery).mock.calls.at(-1)?.[1]?.cityCodes,
    ).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Áp dụng bộ lọc" }));

    expect(vi.mocked(useJobRecommendationsQuery).mock.calls.at(-1)?.[1]?.cityCodes).toEqual([
      "HCMC",
    ]);
  });
});
