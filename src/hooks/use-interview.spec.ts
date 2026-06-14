import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/app";
import {
  useCvListForInterview,
  useCvMatchesForInterview,
  useInterviewHistory,
} from "./use-interview";

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn((config) => config),
  useQuery: vi.fn((config) => config),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@/api/interview-api", () => ({
  endInterview: vi.fn(),
  getInterviewDetail: vi.fn(),
  getInterviewHistory: vi.fn(),
  refreshRealtimeToken: vi.fn(),
  startInterview: vi.fn(),
  submitInterviewTurn: vi.fn(),
}));

vi.mock("@/api/cv/list", () => ({
  getCvListApi: vi.fn(),
}));

vi.mock("@/api/cv/match", () => ({
  getCvMatchesApi: vi.fn(),
}));

describe("use-interview query gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps interview history disabled until the caller confirms API auth", () => {
    useInterviewHistory(false);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.INTERVIEW_HISTORY,
        enabled: false,
      }),
    );
  });

  it("enables interview history only when requested by an authenticated screen", () => {
    useInterviewHistory(true);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.INTERVIEW_HISTORY,
        enabled: true,
      }),
    );
  });

  it("loads CV choices only when the interview setup is allowed to call the API", () => {
    useCvListForInterview(false);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.INTERVIEW_CVS,
        enabled: false,
      }),
    );
  });

  it("does not load CV match history until a CV is selected", () => {
    useCvMatchesForInterview(null, true);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.INTERVIEW_CV_MATCHES("none"),
        enabled: false,
      }),
    );
  });

  it("loads CV match history only after auth and CV selection are both true", () => {
    useCvMatchesForInterview("cv-1", true);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.INTERVIEW_CV_MATCHES("cv-1"),
        enabled: true,
      }),
    );
  });
});
