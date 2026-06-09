import { describe, expect, it, vi } from "vitest";
import enLocale from "@/i18n/locales/en";
import viLocale from "@/i18n/locales/vi";
import { persistDiagnosisState } from "@/store/useDiagnosisStore";

// ── Item 4: results.collapse/expand keys must exist in BOTH locales ──
// (the JD-highlight toggle used a t("common.collapse") hack → EN users saw VN)
describe("diagnosis results i18n keys", () => {
  it("en defines results.collapse and results.expand", () => {
    expect((enLocale.diagnosis.results as Record<string, string>).collapse).toBeTruthy();
    expect((enLocale.diagnosis.results as Record<string, string>).expand).toBeTruthy();
  });
  it("vi defines results.collapse and results.expand", () => {
    expect((viLocale.diagnosis.results as Record<string, string>).collapse).toBeTruthy();
    expect((viLocale.diagnosis.results as Record<string, string>).expand).toBeTruthy();
  });
});

// ── Item 3: persist only durable result state; never transient / File objects ──
describe("persistDiagnosisState (store partialize)", () => {
  it("keeps the analysis result so a reload does not wipe it", () => {
    const kept = persistDiagnosisState({
      step: "results",
      reviewData: { overallScore: 70 },
      lastCvId: "cv-1",
      targetRole: "frontend_developer",
      analysisMode: "cv-jd",
      hasActivatedJdMode: true,
    } as never);
    expect(kept.reviewData).toEqual({ overallScore: 70 });
    expect(kept.lastCvId).toBe("cv-1");
    expect(kept.step).toBe("results");
    expect(kept.targetRole).toBe("frontend_developer");
  });

  it("drops transient flags and non-serializable File objects", () => {
    const file = new File(["x"], "cv.pdf");
    const kept = persistDiagnosisState({
      step: "results",
      reviewData: { overallScore: 70 },
      isAnalyzing: true,
      apiError: "boom",
      highlightEvidence: "React",
      cvFile: file,
      jdFile: file,
    } as never) as Record<string, unknown>;
    expect("isAnalyzing" in kept).toBe(false);
    expect("apiError" in kept).toBe(false);
    expect("highlightEvidence" in kept).toBe(false);
    expect("cvFile" in kept).toBe(false);
    expect("jdFile" in kept).toBe(false);
  });
});

// ── Item 1 (Download button): fetch the original CV file as a blob ──
vi.mock("@/api/core/http-client", () => ({ httpClient: { get: vi.fn() } }));

describe("downloadCvFileApi", () => {
  it("GETs /api/cvs/:id/file as a blob and returns the blob", async () => {
    const { httpClient } = await import("@/api/core/http-client");
    const { downloadCvFileApi } = await import("@/api/cv/file");
    const blob = new Blob(["pdf-bytes"], { type: "application/pdf" });
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: blob });

    const result = await downloadCvFileApi("cv-1");

    expect(httpClient.get).toHaveBeenCalledWith("/api/cvs/cv-1/file", { responseType: "blob" });
    expect(result).toBe(blob);
  });
});
