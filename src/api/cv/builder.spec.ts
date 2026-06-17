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

describe("createBuilderDraftApi", () => {
  it("forwards sourceCvId so the backend can clone the parsed CV", async () => {
    const { httpClient } = await import("@/api/core/http-client");
    const { createBuilderDraftApi } = await import("./builder");
    (httpClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        message: "created",
        data: { id: "draft-1" },
        errors: null,
      },
    });

    await createBuilderDraftApi({
      sourceCvId: "uploaded-cv-1",
      language: "en",
    });

    expect(httpClient.post).toHaveBeenCalledWith("/api/cvs/builder", {
      sourceCvId: "uploaded-cv-1",
      language: "en",
    });
  });
});
