import { describe, expect, it, vi } from "vitest";
import { createStudioResumePdfBlob } from "./download-resume-pdf";
import type { CvBuilderState } from "@/store/useCvBuilderStore";

const createResumePdfBlobMock = vi.hoisted(() =>
  vi.fn(async () => new Blob(["pdf"], { type: "application/pdf" })),
);

vi.mock("@resume-engine/pdf/browser", () => ({
  createResumePdfBlob: createResumePdfBlobMock,
}));

describe("createStudioResumePdfBlob", () => {
  it("renders the downloadable PDF with the same resume data and template used by preview", async () => {
    const resumeData = { metadata: { template: "azurill" } };
    const state = {
      template: "bronzor",
      getResumeData: vi.fn(() => resumeData),
    } as unknown as CvBuilderState;

    const blob = await createStudioResumePdfBlob(state);

    expect(blob.type).toBe("application/pdf");
    expect(createResumePdfBlobMock).toHaveBeenCalledWith({
      data: resumeData,
      template: "bronzor",
    });
  });

  it("falls back legacy builder template ids before rendering", async () => {
    const resumeData = { metadata: { template: "ats-modern" } };
    const state = {
      template: "ats-modern",
      getResumeData: vi.fn(() => resumeData),
    } as unknown as CvBuilderState;

    await createStudioResumePdfBlob(state);

    expect(createResumePdfBlobMock).toHaveBeenLastCalledWith({
      data: resumeData,
      template: "azurill",
    });
  });
});
