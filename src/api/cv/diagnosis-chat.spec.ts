import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { CV_AI_TIMEOUT_MS } from "./upload";
import { askDiagnosisChatApi } from "./diagnosis-chat";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

describe("askDiagnosisChatApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POSTs to the match chat route with the CV_AI timeout and unwraps the answer", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({ answer: "Because skills coverage is low.", cited_dimension: "skills_relevance" }) as never,
    );

    const res = await askDiagnosisChatApi("match-1", {
      question: "why is my score this?",
      language: "vi",
    });

    expect(httpClient.post).toHaveBeenCalledWith(
      API_ROUTES.CV_MATCHES.CHAT("match-1"),
      { question: "why is my score this?", language: "vi" },
      { timeout: CV_AI_TIMEOUT_MS },
    );
    expect(res).toEqual({ answer: "Because skills coverage is low.", cited_dimension: "skills_relevance" });
  });

  it("rejects when the endpoint is not built yet (so the caller can show a graceful state)", async () => {
    vi.mocked(httpClient.post).mockRejectedValueOnce(new Error("Request failed with status code 404"));
    await expect(askDiagnosisChatApi("match-1", { question: "q" })).rejects.toThrow();
  });

  it("re-attaches the HTTP 429 status onto the thrown error (so the caller can show the daily-cap state)", async () => {
    // Shape of an axios error with response.status (isAxiosError checks `isAxiosError === true`).
    const axiosErr = Object.assign(new Error("Request failed with status code 429"), {
      isAxiosError: true,
      response: { status: 429, data: { errorCode: "FEATURE_USAGE_LIMIT_REACHED", message: "Daily limit reached" } },
    });
    vi.mocked(httpClient.post).mockRejectedValueOnce(axiosErr as never);

    await expect(askDiagnosisChatApi("match-1", { question: "q" })).rejects.toMatchObject({ status: 429 });
  });
});
