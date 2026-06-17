import { describe, expect, it, vi } from "vitest";

vi.mock("@/api/core/http-client", () => ({ httpClient: { post: vi.fn() } }));

describe("renderBuilderPdfApi", () => {
  it("POSTs without a JSON body and returns the PDF blob", async () => {
    const { httpClient } = await import("@/api/core/http-client");
    const { renderBuilderPdfApi } = await import("./builder");
    const blob = new Blob(["pdf-bytes"], { type: "application/pdf" });
    (httpClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: blob });

    const result = await renderBuilderPdfApi("draft-1");

    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/cvs/draft-1/render-pdf",
      undefined,
      expect.objectContaining({ responseType: "blob" }),
    );
    expect(result).toBe(blob);
  });
});
