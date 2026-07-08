import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { listResumesApi } from "./resume-library";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

describe("resume library API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes the BUILT cvKind filter through to the CV list endpoint", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(
      ok({
        items: [
          {
            id: "draft-1",
            title: "Frontend Resume",
            originalFileName: null,
            fileType: null,
            fileSize: null,
            cvKind: "BUILT",
            language: "en",
            targetRole: "frontend_developer",
            isOcrOnly: false,
            atsReadabilityScore: null,
            createdAt: "2026-07-08T00:00:00.000Z",
            updatedAt: "2026-07-08T00:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      }) as never,
    );

    const result = await listResumesApi({ cvKind: "BUILT", limit: 50 });

    expect(httpClient.get).toHaveBeenCalledWith(API_ROUTES.CV.LIST, {
      params: { cvKind: "BUILT", limit: 50 },
    });
    expect(result.items[0]).toMatchObject({ id: "draft-1", cvKind: "BUILT" });
  });
});
