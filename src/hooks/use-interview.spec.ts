import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/app";
import { useHasApiSession } from "@/hooks/use-api-session";
import {
  useCvListForInterview,
  useCvMatchesForInterview,
  useCreateCvMatchForInterview,
  useEndInterview,
  useInterviewDetail,
  useInterviewHistory,
  useUploadCvForInterview,
} from "./use-interview";

const { mockInvalidateQueries, mockSetQueryData } = vi.hoisted(() => ({
  mockInvalidateQueries: vi.fn(),
  mockSetQueryData: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn((config) => config),
  useQuery: vi.fn((config) => config),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
    setQueryData: mockSetQueryData,
  })),
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
  matchCvWithJdApi: vi.fn(),
  matchCvWithJdFileApi: vi.fn(),
}));

vi.mock("@/api/cv/upload", () => ({
  uploadCvApi: vi.fn(),
}));

vi.mock("@/hooks/use-api-session", () => ({
  useHasApiSession: vi.fn(),
}));

const mockUseHasApiSession = vi.mocked(useHasApiSession);

describe("use-interview query gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHasApiSession.mockReturnValue(true);
  });

  it("keeps interview history disabled until the caller enables it", () => {
    useInterviewHistory(false);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.INTERVIEW_HISTORY,
        enabled: false,
      }),
    );
  });

  it("keeps interview history disabled until the API session is ready", () => {
    mockUseHasApiSession.mockReturnValue(false);

    useInterviewHistory(true);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.INTERVIEW_HISTORY,
        enabled: false,
      }),
    );
  });

  it("enables interview history only when requested by an API-authenticated screen", () => {
    useInterviewHistory(true);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.INTERVIEW_HISTORY,
        enabled: true,
      }),
    );
  });

  it("keeps interview detail disabled until a history session is selected", () => {
    useInterviewDetail(null, true);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.INTERVIEW_DETAIL("none"),
        enabled: false,
      }),
    );
  });

  it("enables interview detail only when the selected session and API session are available", () => {
    useInterviewDetail("session-1", true);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.INTERVIEW_DETAIL("session-1"),
        enabled: true,
      }),
    );
  });

  it("does not retry interview history validation failures", () => {
    useInterviewHistory(true);

    const queryCalls = vi.mocked(useQuery).mock.calls;
    const options = queryCalls[queryCalls.length - 1]?.[0] as {
      retry?: (failureCount: number, error: unknown) => boolean;
    };
    expect(options.retry).toEqual(expect.any(Function));
    expect(options.retry?.(0, { response: { status: 400 } })).toBe(false);
  });

  it("retries interview history network and server failures at most once", () => {
    useInterviewHistory(true);

    const queryCalls = vi.mocked(useQuery).mock.calls;
    const options = queryCalls[queryCalls.length - 1]?.[0] as {
      retry?: (failureCount: number, error: unknown) => boolean;
    };
    expect(options.retry).toEqual(expect.any(Function));
    expect(options.retry?.(0, new Error("Network Error"))).toBe(true);
    expect(options.retry?.(0, { response: { status: 503 } })).toBe(true);
    expect(options.retry?.(1, { response: { status: 503 } })).toBe(false);
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

  it("invalidates interview history once after ending a session", () => {
    useEndInterview();

    const mutationCalls = vi.mocked(useMutation).mock.calls;
    const options = mutationCalls[mutationCalls.length - 1]?.[0] as {
      onSuccess?: (session: { id: string }) => void;
    };
    options.onSuccess?.({ id: "session-1" });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.INTERVIEW_HISTORY,
    });
  });

  it("invalidates interview CV choices after uploading a CV in setup", () => {
    useUploadCvForInterview();

    const mutationCalls = vi.mocked(useMutation).mock.calls;
    const options = mutationCalls[mutationCalls.length - 1]?.[0] as {
      onSuccess?: (cv: { id: string }) => void;
    };
    options.onSuccess?.({ id: "cv-1" });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.INTERVIEW_CVS,
    });
  });

  it("routes pasted and uploaded JD match requests through the same interview mutation", async () => {
    const { matchCvWithJdApi, matchCvWithJdFileApi } = await import("@/api/cv/match");
    vi.mocked(matchCvWithJdApi).mockResolvedValueOnce({ id: "match-paste" } as never);
    vi.mocked(matchCvWithJdFileApi).mockResolvedValueOnce({ id: "match-file" } as never);

    useCreateCvMatchForInterview();

    const mutationCalls = vi.mocked(useMutation).mock.calls;
    const options = mutationCalls[mutationCalls.length - 1]?.[0] as {
      mutationFn: (input: unknown) => Promise<unknown>;
      onSuccess?: (match: { id: string }, input: { cvId: string }) => void;
    };
    const file = new File(["JD"], "jd.txt", { type: "text/plain" });

    await expect(
      options.mutationFn({
        kind: "paste",
        cvId: "cv-1",
        jdText: "Need React and TypeScript.",
        targetRole: "frontend_developer",
      }),
    ).resolves.toEqual({ id: "match-paste" });
    await expect(
      options.mutationFn({
        kind: "file",
        cvId: "cv-1",
        file,
        title: "JD",
        targetRole: "frontend_developer",
      }),
    ).resolves.toEqual({ id: "match-file" });
    options.onSuccess?.({ id: "match-file" }, { cvId: "cv-1" });

    expect(matchCvWithJdApi).toHaveBeenCalledWith("cv-1", {
      jdText: "Need React and TypeScript.",
      targetRole: "frontend_developer",
    });
    expect(matchCvWithJdFileApi).toHaveBeenCalledWith("cv-1", {
      file,
      title: "JD",
      targetRole: "frontend_developer",
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.INTERVIEW_CV_MATCHES("cv-1"),
    });
  });
});
