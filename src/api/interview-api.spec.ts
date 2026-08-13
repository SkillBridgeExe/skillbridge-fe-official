import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { getAccessToken } from "@/services/auth-token.service";
import { endInterview, getInterviewDetail, getInterviewHistory, refreshRealtimeToken, sendBestEffortInterviewEnd, startInterview } from "./interview-api";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/services/auth-token.service", () => ({
  getAccessToken: vi.fn(),
}));

function ok<T>(data: T) {
  return Promise.resolve({
    data: {
      success: true,
      message: "OK",
      data,
      errors: null,
    },
  });
}

describe("interview-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts an interview using the platform contract and unwraps the envelope", async () => {
    const response = {
      id: "session-1",
      cvId: "cv-1",
      cvMatchId: "match-1",
      jobDescriptionId: "jd-1",
      targetRole: "frontend_developer",
      language: "vi",
      mode: "VOICE",
      interviewType: "TECHNICAL",
      status: "IN_PROGRESS",
      totalQuestionsPlanned: 7,
      maxDurationSeconds: 600,
      expiresAt: "2026-06-12T10:10:00.000Z",
      overallScore: null,
      semanticScore: null,
      llmScore: null,
      communicationScore: null,
      aiFeedback: null,
      durationSeconds: null,
      startedAt: "2026-06-12T10:00:00.000Z",
      endedAt: null,
      createdAt: "2026-06-12T10:00:00.000Z",
      updatedAt: null,
      firstMessage: "Xin chao",
      firstQuestion: "Ban hay gioi thieu ngan ve du an gan nhat.",
      phase: "INTRODUCTION",
      realtime: {
        enabled: true,
        provider: "openai",
        model: "gpt-realtime-2",
        clientSecret: "ephemeral-secret",
        expiresAt: "2026-06-12T10:05:00.000Z",
      },
    } as const;
    vi.mocked(httpClient.post).mockReturnValueOnce(ok(response) as never);

    const result = await startInterview({
      cvId: "cv-1",
      cvMatchId: "match-1",
      jobDescriptionId: "jd-1",
      targetRole: "frontend_developer",
      language: "vi",
      mode: "VOICE",
      interviewType: "TECHNICAL",
    });

    expect(httpClient.post).toHaveBeenCalledWith(API_ROUTES.INTERVIEW.START, {
      cvId: "cv-1",
      cvMatchId: "match-1",
      jobDescriptionId: "jd-1",
      targetRole: "frontend_developer",
      language: "vi",
      mode: "VOICE",
      interviewType: "TECHNICAL",
    });
    expect(result.id).toBe("session-1");
    expect(result.firstQuestion).toContain("gioi thieu");
  });

  it("ends and reads interviews through canonical platform endpoints", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(ok({ id: "session-1", turns: [] }) as never);
    vi.mocked(httpClient.get)
      .mockReturnValueOnce(ok({ items: [], total: 0, page: 1, limit: 10 }) as never)
      .mockReturnValueOnce(ok({ id: "session-1", turns: [] }) as never);

    await endInterview("session-1");
    await getInterviewHistory();
    await getInterviewDetail("session-1");

    expect(httpClient.post).toHaveBeenCalledWith(
      API_ROUTES.INTERVIEW.END,
      { sessionId: "session-1" },
      { timeout: 90_000 },
    );
    expect(httpClient.get).toHaveBeenNthCalledWith(1, API_ROUTES.INTERVIEW.HISTORY, {
      params: { page: 1, limit: 10 },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(2, API_ROUTES.INTERVIEW.DETAIL("session-1"));
  });

  it("requests scored interview history before backend pagination", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(
      ok({ items: [], total: 0, page: 1, limit: 10 }) as never,
    );

    await getInterviewHistory({ page: 1, limit: 10, scoredOnly: true });

    expect(httpClient.get).toHaveBeenCalledWith(API_ROUTES.INTERVIEW.HISTORY, {
      params: { page: 1, limit: 10, scoredOnly: true },
    });
  });

  it("refreshes realtime token only for a concrete session route", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({
        enabled: false,
        provider: "openai",
        model: "gpt-realtime-2",
        clientSecret: null,
        expiresAt: null,
        reason: "OPENAI_API_KEY is not set",
      }) as never,
    );

    const result = await refreshRealtimeToken("session-1");

    expect(httpClient.post).toHaveBeenCalledWith(
      API_ROUTES.INTERVIEW.REALTIME_TOKEN("session-1"),
    );
    expect(result.enabled).toBe(false);
  });

  it("fires a keepalive authorized request for exit-time best-effort ends", () => {
    vi.mocked(getAccessToken).mockReturnValue("token-1");
    const fetchMock = vi.fn(() => Promise.resolve());
    vi.stubGlobal("fetch", fetchMock);

    sendBestEffortInterviewEnd("session-9");

    expect(fetchMock).toHaveBeenCalledWith(
      API_ROUTES.INTERVIEW.END,
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        credentials: "include",
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
        body: JSON.stringify({ sessionId: "session-9" }),
      }),
    );
  });

  it("skips the exit-time best-effort end without an access token", () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    sendBestEffortInterviewEnd("session-9");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose legacy interview endpoints", () => {
    expect("ANSWER" in API_ROUTES.INTERVIEW).toBe(false);
    expect("SUBMIT" in API_ROUTES.INTERVIEW).toBe(false);
    expect("LIVE_TOKEN" in API_ROUTES.INTERVIEW).toBe(false);
    expect("SAVE_HISTORY" in API_ROUTES.INTERVIEW).toBe(false);
    expect("TTS" in API_ROUTES.INTERVIEW).toBe(false);
  });
});
