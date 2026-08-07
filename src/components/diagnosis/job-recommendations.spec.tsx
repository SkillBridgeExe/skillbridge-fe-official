// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { JobRecommendations, sortRecommendedJobsForDisplay } from "./JobRecommendations";
import { useJobRecommendationsQuery } from "@/hooks/use-diagnosis";
import { AxiosError } from "axios";
import type { JobRecommendationDto } from "@shared/api";

afterEach(() => {
  cleanup();
});

// ── Mocks ──
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "vi" },
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
      if (key === "jobs.rankLabel") return "Xếp hạng tổng thể";
      if (key === "jobs.top1Label") return "Phù hợp tổng thể nhất";
      if (key === "jobs.top1ScoreLabel") return "Điểm đề xuất cao nhất trong danh sách";
      if (key === "jobs.rankDescription") return "Thứ hạng kết hợp kỹ năng, độ phù hợp vai trò và cấp độ kinh nghiệm.";
      if (key === "jobs.loadMoreError") return "Không tải được trang tiếp theo. Các việc làm đã tải vẫn được giữ lại.";
      if (key === "jobs.apply") return "Ứng tuyển";
      if (key === "jobs.recommendationScore") return "Điểm đề xuất";
      if (key === "jobs.skillMatchLabel") return "Khớp kỹ năng";
      if (key === "jobs.actionableGaps") return "Cần bổ sung";
      if (key === "jobs.moreGaps") return `+${opts?.count ?? 0} kỹ năng`;
      if (key === "jobs.headingSafe") return "Việc làm phù hợp để ứng tuyển";
      if (key === "jobs.headingStretch") return "Cơ hội đáng thử sức";
      if (key === "jobs.headingClosest") return "Vai trò gần nhất hiện có";
      if (key === "jobs.advancedFilters") return "Bộ lọc khác";
      if (key === "jobs.workModes.REMOTE") return "Remote";
      if (key === "jobs.workModes.ONSITE") return "Onsite";
      if (key === "jobs.workModes.HYBRID") return "Hybrid";
      if (key === "jobs.employmentTypes.FULL_TIME") return "Toàn thời gian";
      if (key === "jobs.employmentTypes.PART_TIME") return "Bán thời gian";
      if (key === "jobs.experienceLevels.SENIOR") return "Senior";
      if (key === "jobs.experienceLevels.MIDDLE") return "Middle";
      if (key === "jobs.fitFilter.safe_apply") return "Vừa sức";
      if (key === "jobs.fitFilter.stretch") return "Thử thách";
      if (key === "jobs.unknownLocation") return "Địa điểm chưa xác định";
      if (key === "jobs.cities.HCM") return "Hồ Chí Minh";
      if (key === "jobs.cities.HAN") return "Hà Nội";
      if (key === "jobs.cities.DAD") return "Đà Nẵng";
      if (key === "jobs.cities.SGN") return "Hồ Chí Minh";
      return (opts?.defaultValue as string) ?? key;
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
      rank: 1,
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
      rank: 2,
      salary_min: 20000000,
      salary_max: 35000000,
      currency: "VND",
      source_url: "https://example.com/job/2",
    },
  ],
  facets: {
    city_codes: [{ value: "HCM", count: 8 }, { value: "HAN", count: 7 }],
    city_names: [{ value: "Hồ Chí Minh", count: 8 }, { value: "Hà Nội", count: 7 }],
    district_codes: [{ value: "Q1", count: 4 }],
    source_names: [{ value: "itviec", count: 12 }],
    work_modes: [{ value: "REMOTE", count: 5 }, { value: "HYBRID", count: 10 }],
    employment_types: [{ value: "FULL_TIME", count: 12 }, { value: "PART_TIME", count: 3 }],
    experience_levels: [{ value: "SENIOR", count: 6 }, { value: "MIDDLE", count: 9 }],
    fit: [{ value: "safe_apply", count: 10 }, { value: "stretch", count: 5 }],
  },
  generation: {
    snapshot_token: "mock-token-xyz"
  }
};

describe("JobRecommendations — Comprehensive Feature Suite", () => {
  it("sorts the recommended display list by visible score, not backend rank", () => {
    const rows = [
      { ...mockJobsData.recommendations[0], job_id: "job-36", recommendation_score: 36, match_score: 36, rank: 1 },
      { ...mockJobsData.recommendations[1], job_id: "job-25", recommendation_score: 25, match_score: 25, rank: 2 },
      { ...mockJobsData.recommendations[0], job_id: "job-13", recommendation_score: 13, match_score: 13, rank: 3 },
      { ...mockJobsData.recommendations[1], job_id: "job-22", recommendation_score: 22, match_score: 22, rank: 4 },
    ] as JobRecommendationDto[];

    expect(sortRecommendedJobsForDisplay(rows).map((row) => row.job_id)).toEqual([
      "job-36",
      "job-25",
      "job-22",
      "job-13",
    ]);
  });

  it("renders Top 5 view initially", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" targetRole="frontend_developer" />);

    expect(screen.getByText("Việc làm phù hợp để ứng tuyển")).toBeInTheDocument();
    expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Fullstack React Developer")).toBeInTheDocument();
    expect(screen.getByText("Xem tất cả 15 việc làm")).toBeInTheDocument();
    expect(screen.getByText("Top 1 - Điểm đề xuất cao nhất trong danh sách")).toBeInTheDocument();
    expect(screen.getByText("Top 2")).toBeInTheDocument();
  });

  it("hides overall rank badges when the user selects another sort", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));
    fireEvent.change(screen.getAllByLabelText("Sắp xếp")[0], {
      target: { value: "SKILL_MATCH" },
    });

    expect(screen.queryByText("Top 1 - Phù hợp tổng thể nhất")).not.toBeInTheDocument();
    expect(screen.queryByText("Top 2")).not.toBeInTheDocument();
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

    expect(screen.getByText("Việc làm phù hợp để ứng tuyển")).toBeInTheDocument();
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
    expect(screen.getByText("Hồ Chí Minh (8)")).toBeInTheDocument();
    // Check Work mode facet button
    expect(screen.getByText("Remote (5)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Bộ lọc khác/i }));
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

  it("uses the CV target role on the first request and keeps it visible when the API fails", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" targetRole="frontend_developer" />);

    expect(useJobRecommendationsQuery).toHaveBeenLastCalledWith(
      "cv-123",
      expect.objectContaining({ role: "frontend_developer" }),
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
    fireEvent.click(screen.getByRole("button", { name: /Bộ lọc khác/i }));

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

  it("initial network error with no token calls refetch exactly once", () => {
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

    // Since there is no token to clear, refetch should be called directly
    expect(refetchMock).toHaveBeenCalledTimes(1);
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

  it("renders quota blocked state after the API envelope preserves status 402", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: Object.assign(new Error("Quota blocked"), { status: 402 }),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText("Hết lượt đề xuất")).toBeInTheDocument();
    expect(screen.queryByText("Lỗi tải đề xuất")).not.toBeInTheDocument();
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

  it("keeps loaded cards visible while the next page is loading", () => {
    vi.mocked(useJobRecommendationsQuery).mockImplementation((_cvId, query) => ({
      data: query?.offset === 10 ? undefined : mockJobsData,
      isLoading: query?.offset === 10,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    }) as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));
    fireEvent.click(screen.getByText("Tải thêm việc làm"));

    expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByTestId("jobs-load-more-loading")).toBeInTheDocument();
  });

  it("keeps loaded cards visible and retries in place when the next page fails", () => {
    const refetch = vi.fn();
    vi.mocked(useJobRecommendationsQuery).mockImplementation((_cvId, query) => ({
      data: query?.offset === 10 ? undefined : mockJobsData,
      isLoading: false,
      isError: query?.offset === 10,
      error: query?.offset === 10 ? Object.assign(new Error("Server error"), { status: 500 }) : null,
      isRefetching: false,
      refetch,
    }) as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));
    fireEvent.click(screen.getByText("Tải thêm việc làm"));

    expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Không tải được trang tiếp theo. Các việc làm đã tải vẫn được giữ lại.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Thử lại"));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("does not replace loaded cards with the full quota state when a later page returns 402", () => {
    vi.mocked(useJobRecommendationsQuery).mockImplementation((_cvId, query) => ({
      data: query?.offset === 10 ? undefined : mockJobsData,
      isLoading: false,
      isError: query?.offset === 10,
      error: query?.offset === 10
        ? Object.assign(new Error("Quota blocked"), { status: 402 })
        : null,
      isRefetching: false,
      refetch: vi.fn(),
    }) as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));
    fireEvent.click(screen.getByText("Tải thêm việc làm"));

    expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Hết lượt đề xuất")).not.toBeInTheDocument();
    expect(screen.getByText("Không tải được trang tiếp theo. Các việc làm đã tải vẫn được giữ lại.")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /^Bộ lọc$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Hồ Chí Minh (8)" }));

    expect(
      vi.mocked(useJobRecommendationsQuery).mock.calls.at(-1)?.[1]?.cityNames,
    ).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Áp dụng bộ lọc" }));

    expect(vi.mocked(useJobRecommendationsQuery).mock.calls.at(-1)?.[1]?.cityNames).toEqual([
      "Hồ Chí Minh",
    ]);
  });

  it("counts city-name filters in the mobile draft and exposes clear filters", () => {
    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));
    fireEvent.click(screen.getByRole("button", { name: /^Bộ lọc$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Hồ Chí Minh (8)" }));

    expect(screen.getByRole("button", { name: "Xóa bộ lọc" })).toBeInTheDocument();
  });

  it("renders every production explorer filter in the mobile drawer", () => {
    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));
    fireEvent.click(screen.getByRole("button", { name: /^Bộ lọc$/i }));

    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByLabelText("Tìm kiếm việc làm")).toBeInTheDocument();
    expect(within(drawer).getByText("Q1 (4)")).toBeInTheDocument();
    expect(within(drawer).getByText("itviec (12)")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Đăng từ ngày")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Đăng đến ngày")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Lương tối thiểu")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Lương tối đa")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Đơn vị tiền tệ")).toBeInTheDocument();
  });

  describe("Pagination & Snapshot Token Stability", () => {
    it("successful response captures token, explorer toggle preserves it", () => {
      const mockQuery = vi.mocked(useJobRecommendationsQuery);

      mockQuery.mockReturnValue({
        data: {
          ...mockJobsData,
          total: 15,
          generation: { snapshot_token: "mock-token-xyz" }
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

      const { rerender } = render(<JobRecommendations cvId="cv-123" />);

      // Initially, it gets data and sets snapshotToken. Component needs a rerender cycle
      // for the effect to apply queryState changes and re-invoke the hook.
      rerender(<JobRecommendations cvId="cv-123" />);

      // Click to open explorer
      fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));

      // Token should be preserved
      expect(mockQuery).toHaveBeenLastCalledWith(
        "cv-123",
        expect.objectContaining({ limit: 10, offset: 0, sort: "RECOMMENDED", snapshotToken: "mock-token-xyz" })
      );
    });

    it("expired-token retry clears the old snapshot and restarts from the first page", () => {
      const mockQuery = vi.mocked(useJobRecommendationsQuery);

      // Step 1: succeed and get a token
      mockQuery.mockReturnValue({
        data: { ...mockJobsData, generation: { snapshot_token: "valid-token-abc" } },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

      const { rerender } = render(<JobRecommendations cvId="cv-123" />);
      fireEvent.click(screen.getByText(/Xem tất cả/));
      rerender(<JobRecommendations cvId="cv-123" />);

      fireEvent.click(screen.getByText("Tải thêm việc làm"));
      expect(mockQuery).toHaveBeenLastCalledWith(
        "cv-123",
        expect.objectContaining({ offset: 10, snapshotToken: "valid-token-abc" }),
      );

      expect(mockQuery).toHaveBeenLastCalledWith(
        "cv-123",
        expect.objectContaining({ snapshotToken: "valid-token-abc" })
      );

      // Step 2: fail with 410
      mockQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: Object.assign(new Error("Token expired"), { status: 410 }),
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

      rerender(<JobRecommendations cvId="cv-123" />);

      // Click retry
      fireEvent.click(screen.getByText("Thử lại"));
      rerender(<JobRecommendations cvId="cv-123" />);

      // Step 3: verify the query was called without the token
      expect(mockQuery).toHaveBeenLastCalledWith(
        "cv-123",
        expect.objectContaining({ offset: 0 }),
      );
      expect(mockQuery.mock.calls.at(-1)?.[1]?.snapshotToken).toBeUndefined();
    });

    it("non-410 retry keeps the snapshot token and refetches the same query", () => {
      const mockQuery = vi.mocked(useJobRecommendationsQuery);
      const refetchMock = vi.fn();

      mockQuery.mockReturnValue({
        data: { ...mockJobsData, generation: { snapshot_token: "stable-token" } },
        isLoading: false,
        isError: false,
        refetch: refetchMock,
      } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

      const { rerender } = render(<JobRecommendations cvId="cv-123" />);
      fireEvent.click(screen.getByText(/Xem tất cả/));
      rerender(<JobRecommendations cvId="cv-123" />);

      mockQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: Object.assign(new Error("Server error"), { status: 500 }),
        refetch: refetchMock,
      } as unknown as ReturnType<typeof useJobRecommendationsQuery>);
      rerender(<JobRecommendations cvId="cv-123" />);

      fireEvent.click(screen.getByText("Thử lại"));

      expect(refetchMock).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenLastCalledWith(
        "cv-123",
        expect.objectContaining({ snapshotToken: "stable-token" })
      );
    });
  });

  it("labels recommendation and skill scores instead of showing anonymous percentages", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" targetRole="frontend_developer" />);

    expect(screen.getAllByText("Điểm đề xuất")).not.toHaveLength(0);
    expect(screen.getAllByText("Khớp kỹ năng")).not.toHaveLength(0);
    expect(screen.getAllByText("88/100")).toHaveLength(2);
  });

  it("shows at most three priority gaps and summarizes the remainder", () => {
    const gapHeavyJob = {
      ...mockJobsData.recommendations[0],
      partial_skills: [
        { display_name: "React", canonical_name: "react", gap_levels: 1 },
        { display_name: "TypeScript", canonical_name: "typescript", gap_levels: 1 },
        { display_name: "Testing", canonical_name: "testing", gap_levels: 1 },
      ],
      missing_skills: [
        { display_name: "Accessibility", importance: "REQUIRED" },
        { display_name: "System Design", importance: "REQUIRED" },
        { display_name: "Docker", importance: "PREFERRED" },
      ],
    };
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: { ...mockJobsData, total: 1, recommendations: [gapHeavyJob] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);

    expect(screen.getByText("Cần bổ sung")).toBeInTheDocument();
    expect(screen.getByText("Accessibility")).toBeInTheDocument();
    expect(screen.getByText("System Design")).toBeInTheDocument();
    expect(screen.getByText("Docker")).toBeInTheDocument();
    expect(screen.queryByText("React")).not.toBeInTheDocument();
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
    expect(screen.getByText("+3 kỹ năng")).toBeInTheDocument();
  });

  it("does not promise a strong match when the pool only contains not-recommended jobs", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        facets: {
          ...mockJobsData.facets,
          fit: [{ value: "not_recommended", count: 2 }],
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);

    expect(screen.getByText("Vai trò gần nhất hiện có")).toBeInTheDocument();
    expect(screen.queryByText("Việc làm phù hợp để ứng tuyển")).not.toBeInTheDocument();
  });

  it("does not expose salary when the source marks it hidden", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        total: 1,
        recommendations: [{ ...mockJobsData.recommendations[0], salary_visible: false }],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);

    expect(screen.queryByText(/30–50tr/)).not.toBeInTheDocument();
  });
});

describe("structured locations rendering", () => {
  it("renders exact address, district, and city combined, deduplicated", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        recommendations: [{
          ...mockJobsData.recommendations[0],
          location: "Legacy Fallback",
          locations: [{
            country_code: "VN",
            city_code: "SGN",
            district_code: "D1",
            district_name: "Quận 1",
            address_line: "123 Le Loi",
            is_primary: true,
            granularity: "exact"
          }]
        }]
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText(/123 Le Loi, Quận 1, Hồ Chí Minh/)).toBeInTheDocument();
  });

  it("falls back to district and city when address_line is null, ignoring nulls and blank strings", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        recommendations: [{
          ...mockJobsData.recommendations[0],
          locations: [{
            country_code: "VN",
            city_code: "HAN",
            district_code: "CG",
            district_name: "Cầu Giấy",
            address_line: "", // blank string
            is_primary: true,
            granularity: "district"
          }]
        }]
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText("Cầu Giấy, Hà Nội")).toBeInTheDocument();
  });

  it("does not render 'null' string when city_code is null", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        recommendations: [{
          ...mockJobsData.recommendations[0],
          locations: [{
            country_code: "VN",
            city_code: null,
            district_code: null,
            district_name: "Khu CN Cao",
            address_line: "", // blank string
            is_primary: true,
            granularity: "unknown"
          }]
        }]
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText("Khu CN Cao")).toBeInTheDocument();
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();
  });

  it("renders popover trigger when there are multiple locations", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        recommendations: [{
          ...mockJobsData.recommendations[0],
          locations: [
            { city_code: "SGN", is_primary: true, granularity: "city", country_code: "VN", district_code: null, district_name: null, address_line: null },
            { city_code: "HAN", is_primary: false, granularity: "city", country_code: "VN", district_code: null, district_name: null, address_line: null }
          ]
        }]
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText(/2 jobs.locationsCount/)).toBeInTheDocument();
  });

  it("falls back to legacy location when locations array is empty", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        recommendations: [{
          ...mockJobsData.recommendations[0],
          location: "Legacy Fallback Location",
          locations: []
        }]
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText("Legacy Fallback Location")).toBeInTheDocument();
  });

  it("renders localized city label (Hà Nội) instead of raw code HAN in structured locations", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        recommendations: [{
          ...mockJobsData.recommendations[0],
          locations: [{
            country_code: "VN",
            city_code: "HAN",
            district_code: null,
            district_name: null,
            address_line: "", // blank string
            is_primary: true,
            granularity: "city"
          }]
        }]
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText("Hà Nội")).toBeInTheDocument();
    expect(screen.queryByText("HAN")).not.toBeInTheDocument();
  });

  it("renders unknownLocation label for unrecognized city codes", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        recommendations: [{
          ...mockJobsData.recommendations[0],
          locations: [{
            country_code: "VN",
            city_code: "XYZ_UNKNOWN",
            district_code: null,
            district_name: null,
            address_line: "", // blank string
            is_primary: true,
            granularity: "city"
          }]
        }]
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    expect(screen.getByText("Địa điểm chưa xác định")).toBeInTheDocument();
    expect(screen.queryByText("XYZ_UNKNOWN")).not.toBeInTheDocument();
  });

  it("renders localized city name in filter facet buttons instead of raw codes", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));

    // Filter buttons should show localized names
    expect(screen.getByText("Hồ Chí Minh (8)")).toBeInTheDocument();
    expect(screen.getByText("Hà Nội (7)")).toBeInTheDocument();
    // Raw codes should not appear
    expect(screen.queryByText("HCM (8)")).not.toBeInTheDocument();
    expect(screen.queryByText("HAN (7)")).not.toBeInTheDocument();
  });

  it("renders city-name facets even when legacy city-code facets are empty", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        facets: { ...mockJobsData.facets, city_codes: [] },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));
    expect(screen.getByText("Hồ Chí Minh (8)")).toBeInTheDocument();
  });

  it("updates query when new PR #237 filters are used", async () => {
    vi.useFakeTimers();
    const mockQuery = vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    const { rerender } = render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));
    
    // Rerender so state is applied and input is shown
    rerender(<JobRecommendations cvId="cv-123" />);

    const searchInput = screen.getByPlaceholderText("Tìm kiếm...");
    fireEvent.change(searchInput, { target: { value: "developer" } });

    await vi.runAllTimersAsync();
    
    expect(mockQuery).toHaveBeenLastCalledWith(
      "cv-123",
      expect.objectContaining({ q: "developer", offset: 0 })
    );
    
    vi.useRealTimers();
  });

  it("renders all 9 IT_ROLES in the role filter dropdown", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));

    const roleSelect = screen.getAllByLabelText("Vai trò")[0];
    // Ensure the 9 roles are present + 1 "all" option (Tất cả vai trò)
    expect(roleSelect.querySelectorAll("option").length).toBe(10);
  });

  it("omits invalid role codes and sends role=all instead", () => {
    const mockQuery = vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" targetRole="some_invalid_role_code" />);
    fireEvent.click(screen.getByText(/Xem tất cả/));

    expect(mockQuery).toHaveBeenLastCalledWith(
      "cv-123",
      expect.objectContaining({ role: "all" })
    );
  });

  it("auto-selects VND when salary min or max is set and currency is empty", async () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    const { rerender } = render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText(/Xem tất cả/));
    fireEvent.click(screen.getByText("Bộ lọc khác"));

    const minInput = screen.getAllByLabelText("Lương tối thiểu")[0];
    fireEvent.change(minInput, { target: { value: "10000000" } });
    rerender(<JobRecommendations cvId="cv-123" />);

    const currencySelect = screen.getAllByLabelText("Đơn vị tiền tệ")[0];
    expect(currencySelect).toHaveValue("VND");
  });

  it("blocks fetching and shows error message when min salary > max salary", () => {
    const mockQuery = vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    const { rerender } = render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText(/Xem tất cả/));
    fireEvent.click(screen.getByText("Bộ lọc khác"));

    const minInput = screen.getAllByLabelText("Lương tối thiểu")[0];
    const maxInput = screen.getAllByLabelText("Lương tối đa")[0];

    fireEvent.change(minInput, { target: { value: "20000000" } });
    fireEvent.change(maxInput, { target: { value: "10000000" } });
    rerender(<JobRecommendations cvId="cv-123" />);

    expect(screen.getByText("Lương tối thiểu không được lớn hơn lương tối đa")).toBeInTheDocument();
    expect(mockQuery).toHaveBeenLastCalledWith(
      null, // cvId should be null when blocked
      expect.any(Object)
    );
  });

  it("renders rank badges for Top 3 jobs when sorted by RECOMMENDED", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />); // Default sort is RECOMMENDED

    // Top 1 label
    expect(screen.getByText("Top 1 - Điểm đề xuất cao nhất trong danh sách")).toBeInTheDocument();
    // Top 2 label
    expect(screen.getByText("Top 2")).toBeInTheDocument();
  });

  it("uses visible order for rank badges instead of the backend RRF rank", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        recommendations: [
          { ...mockJobsData.recommendations[0], rank: 3 },
          { ...mockJobsData.recommendations[1], rank: 1 },
          {
            ...mockJobsData.recommendations[1],
            job_id: "job-3",
            title: "Mobile Frontend Engineer",
            rank: 2,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);

    expect(screen.getByText("Senior Frontend Engineer").closest("article")).toHaveTextContent(
      "Top 1 - Điểm đề xuất cao nhất trong danh sách",
    );
    expect(screen.getByText("Fullstack React Developer").closest("article")).toHaveTextContent("Top 2");
    expect(screen.getByText("Mobile Frontend Engineer").closest("article")).toHaveTextContent("Top 3");
  });

  it("uses the fit label for Top 1 only when the job is safe to apply", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: {
        ...mockJobsData,
        recommendations: [
          { ...mockJobsData.recommendations[0], fit: { verdict: "safe_apply", reasons: [] } },
          mockJobsData.recommendations[1],
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    render(<JobRecommendations cvId="cv-123" />);

    expect(screen.getByText("Top 1 - Phù hợp tổng thể nhất")).toBeInTheDocument();
    expect(screen.queryByText("Top 1 - Điểm đề xuất cao nhất trong danh sách")).not.toBeInTheDocument();
  });

  it("hides rank badges when not sorted by RECOMMENDED", () => {
    vi.mocked(useJobRecommendationsQuery).mockReturnValue({
      data: mockJobsData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useJobRecommendationsQuery>);

    const { rerender } = render(<JobRecommendations cvId="cv-123" />);
    fireEvent.click(screen.getByText("Xem tất cả 15 việc làm"));

    const sortSelect = screen.getAllByLabelText("Sắp xếp")[0];
    fireEvent.change(sortSelect, { target: { value: "NEWEST" } });

    rerender(<JobRecommendations cvId="cv-123" />);

    expect(screen.queryByText(/Top 1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Top 2/)).not.toBeInTheDocument();
  });
});
