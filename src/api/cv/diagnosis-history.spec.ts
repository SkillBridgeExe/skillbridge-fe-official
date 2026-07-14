import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { getDiagnosisHistoryApi } from "./diagnosis-history";

vi.mock("@/api/core/http-client", () => ({
  httpClient: { get: vi.fn() },
}));

describe("diagnosis history API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the dedicated diagnosis endpoint and never requests builder CVs", async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        message: "OK",
        data: { items: [], total: 0, page: 2, limit: 10 },
        errors: null,
      },
    } as never);

    await getDiagnosisHistoryApi({ page: 2, limit: 10 });

    expect(httpClient.get).toHaveBeenCalledWith(API_ROUTES.DIAGNOSIS.HISTORY, {
      params: { page: 2, limit: 10 },
    });
  });
});
