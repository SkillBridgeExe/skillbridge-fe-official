import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { matchCvWithJdFileApi } from "./match";
import { CV_AI_TIMEOUT_MS } from "./upload";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    post: vi.fn(),
  },
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

describe("cv match api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a JD file to the existing CV match file endpoint", async () => {
    const file = new File(["React developer JD"], "frontend-jd.txt", {
      type: "text/plain",
    });
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({ id: "match-1", overallScore: 86 }) as never,
    );

    const result = await matchCvWithJdFileApi("cv-1", {
      file,
      title: "Frontend JD",
      targetRole: "frontend_developer",
    });

    const [, body, config] = vi.mocked(httpClient.post).mock.calls[0] ?? [];
    expect(httpClient.post).toHaveBeenCalledWith(
      API_ROUTES.CV.MATCH_FILE("cv-1"),
      expect.any(FormData),
      {
        timeout: CV_AI_TIMEOUT_MS,
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBe(file);
    expect((body as FormData).get("title")).toBe("Frontend JD");
    expect((body as FormData).get("targetRole")).toBe("frontend_developer");
    expect(config).toMatchObject({ timeout: CV_AI_TIMEOUT_MS });
    expect(result.id).toBe("match-1");
  });
});
