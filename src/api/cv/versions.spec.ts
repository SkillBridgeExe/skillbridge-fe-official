import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { createVersionApi } from "./versions";

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

const summary = {
  id: "v1",
  label: null,
  origin: "MANUAL",
  title: "My CV",
  createdAt: "2026-07-10T00:00:00.000Z",
};

describe("cv versions API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends AUTO_PRE_IMPORT origin for the pre-import backup", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({ ...summary, origin: "AUTO_PRE_IMPORT" }) as never,
    );

    const result = await createVersionApi("cv-1", undefined, "AUTO_PRE_IMPORT");

    expect(httpClient.post).toHaveBeenCalledWith(API_ROUTES.CV.VERSIONS("cv-1"), {
      origin: "AUTO_PRE_IMPORT",
    });
    expect(result.origin).toBe("AUTO_PRE_IMPORT");
  });

  it("omits origin for a plain manual save (server defaults to MANUAL)", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(ok(summary) as never);

    await createVersionApi("cv-1", "Before tailoring");

    expect(httpClient.post).toHaveBeenCalledWith(API_ROUTES.CV.VERSIONS("cv-1"), {
      label: "Before tailoring",
    });
  });
});
